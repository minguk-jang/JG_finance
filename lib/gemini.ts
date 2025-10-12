import { Currency } from '../types';

export interface GeminiExpenseSuggestion {
  amount: number;
  currency: Currency;
  categoryName: string;
  date: string;
  memo: string;
  confidence?: number;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

interface GeminiRequestOptions {
  fallbackCurrency?: Currency;
  categories?: string[];
}

function buildGeminiEndpoint(modelId: string): string {
  const encodedModel = encodeURIComponent(modelId);
  return `https://generativelanguage.googleapis.com/v1/models/${encodedModel}:generateContent`;
}

const SYSTEM_PROMPT = `
You are a financial assistant that extracts structured expense information from natural-language notes.
Return ONLY strict JSON without explanation and without markdown code fences.
The JSON schema must be:
{
  "amount": number (in the specified or inferred currency),
  "currency": "KRW" or "USD",
  "categoryName": string (human readable),
  "date": "YYYY-MM-DD",
  "memo": string (short description),
  "confidence": number between 0 and 1 (optional)
}

Rules:
- Assume Korean locale when ambiguous and prefer KRW unless USD is explicitly mentioned.
- Convert verbal dates ("어제", "지난주 화요일", "March 3rd") into a concrete YYYY-MM-DD string.
- If essential data is missing or cannot be inferred, output an error object: { "error": "<reason>" }.
`;

function buildPrompt(description: string, categories?: string[]): string {
  const cleaned = description.trim();
  const distinctCategories = Array.from(
    new Set((categories ?? []).map((name) => name.trim()).filter(Boolean))
  );

  let prompt = SYSTEM_PROMPT.trim();

  const now = new Date();
  const utcString = now.toISOString();
  const kstFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const kstString = kstFormatter.format(now);

  prompt += `

Current time (UTC): ${utcString}
Current time (KST, UTC+09:00): ${kstString}`;

  if (distinctCategories.length > 0) {
    const list = distinctCategories.map((name) => `- ${name}`).join('\n');
    prompt += `

Allowed categories:
${list}

Always choose one of the allowed categories for "categoryName". If none fits, return { "error": "카테고리를 결정할 수 없습니다." }`;
  }

  return `${prompt}

사용자 입력:
${cleaned}`;
}

function extractJsonCandidate(rawText: string): string {
  if (!rawText) {
    throw new Error('Gemini 응답이 비어 있습니다.');
  }

  const trimmed = rawText.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) {
    return codeBlock[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function normalizeSuggestion(payload: any, fallbackCurrency: Currency): GeminiExpenseSuggestion {
  if (payload?.error) {
    throw new Error(payload.error);
  }

  const amount = Number(payload?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('금액을 확인할 수 없습니다.');
  }

  let currency: Currency = fallbackCurrency;
  if (typeof payload?.currency === 'string') {
    const upper = payload.currency.toUpperCase();
    if (upper === 'KRW' || upper === 'USD') {
      currency = upper;
    }
  }

  const categoryName = typeof payload?.categoryName === 'string' ? payload.categoryName.trim() : '';
  if (!categoryName) {
    throw new Error('카테고리 정보를 확인할 수 없습니다.');
  }

  const date = typeof payload?.date === 'string' ? payload.date.trim() : '';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('날짜 형식이 올바르지 않습니다.');
  }

  const memo = typeof payload?.memo === 'string' ? payload.memo.trim() : '';

  const confidence = typeof payload?.confidence === 'number' ? Math.max(0, Math.min(1, payload.confidence)) : undefined;

  return { amount, currency, categoryName, date, memo, confidence };
}

export async function generateExpenseSuggestion(
  description: string,
  options?: GeminiRequestOptions
): Promise<GeminiExpenseSuggestion> {
  if (!description.trim()) {
    throw new Error('분석할 텍스트가 필요합니다.');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일의 VITE_GEMINI_API_KEY 값을 확인하세요.');
  }

  const fallbackCurrency: Currency = options?.fallbackCurrency ?? 'KRW';
  const modelId = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = buildGeminiEndpoint(modelId);

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: buildPrompt(description, options?.categories),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = errorText || response.statusText;
    if (response.status === 404) {
      throw new Error(
        `Gemini API 호출에 실패했습니다: ${message}\n요청한 모델(${modelId})이 존재하는지 또는 지원되는 엔드포인트(v1)인지 확인하세요.`
      );
    }
    throw new Error(`Gemini API 호출에 실패했습니다: ${message}`);
  }

  const payload = await response.json();
  const rawText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n') ?? '';

  const jsonText = extractJsonCandidate(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Gemini 응답을 JSON으로 파싱하지 못했습니다.');
  }

  return normalizeSuggestion(parsed, fallbackCurrency);
}
