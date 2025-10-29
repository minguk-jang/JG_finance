import { Currency } from '../types';

export interface FixedCostRecommendation {
  fixedCostId: string;
  fixedCostName: string;
  recommendedAmount: number;
  reason?: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

interface CategoryExpenseSummary {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  count: number;
  avgAmount: number;
}

interface VariableFixedCostInfo {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  paymentDay: number;
}

function buildGeminiEndpoint(modelId: string): string {
  const encodedModel = encodeURIComponent(modelId);
  return `https://generativelanguage.googleapis.com/v1/models/${encodedModel}:generateContent`;
}

const SYSTEM_PROMPT = `
You are a financial analysis AI assistant specializing in household budget management.
Your task is to recommend appropriate scheduled amounts for variable fixed costs based on the user's expense patterns.

Return ONLY strict JSON without explanation and without markdown code fences.
The JSON schema must be an array:
[
  {
    "fixedCostId": number,
    "recommendedAmount": number,
    "reason": string (brief explanation in Korean, 1-2 sentences)
  }
]

Rules:
- Analyze expense patterns by category to recommend reasonable amounts for each variable fixed cost.
- If a fixed cost's category matches expense categories, use the average or total from those expenses.
- If there's no matching category data, recommend 0 or a reasonable default based on typical Korean household expenses.
- Consider both the number of transactions and total amounts in each category.
- Provide a brief reason (1-2 sentences) in Korean for each recommendation.
- All amounts should be in KRW (원) and rounded to the nearest integer.
`;

function buildPrompt(
  yearMonth: string,
  variableFixedCosts: VariableFixedCostInfo[],
  categoryExpenses: CategoryExpenseSummary[],
  currency: Currency
): string {
  let prompt = SYSTEM_PROMPT.trim();

  const currentTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });

  prompt += `

현재 시간 (KST): ${currentTime}
대상 년월: ${yearMonth}
통화: ${currency}

변동 고정비 목록:
${variableFixedCosts.map(fc =>
  `- ID: ${fc.id}, 이름: "${fc.name}", 카테고리: "${fc.categoryName}" (ID: ${fc.categoryId}), 결제일: ${fc.paymentDay}일`
).join('\n')}

이번 달 ${yearMonth} 지출 내역 (카테고리별 요약):
${categoryExpenses.length > 0
  ? categoryExpenses.map(ce =>
      `- 카테고리 "${ce.categoryName}" (ID: ${ce.categoryId}): 총 ${ce.totalAmount.toLocaleString()}원, ${ce.count}건, 평균 ${ce.avgAmount.toLocaleString()}원/건`
    ).join('\n')
  : '(이번 달 지출 데이터 없음)'}

위 정보를 바탕으로 각 변동 고정비의 예정 금액을 JSON 배열로 추천해주세요.
각 고정비의 카테고리와 지출 데이터의 카테고리 ID를 매칭하여 합리적인 금액을 제안하세요.`;

  return prompt;
}

function extractJsonCandidate(rawText: string): string {
  if (!rawText) {
    throw new Error('Gemini 응답이 비어 있습니다.');
  }

  const trimmed = rawText.trim();

  // Remove markdown code fences
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) {
    return codeBlock[1].trim();
  }

  // Find JSON array
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim();
  }

  return trimmed;
}

function validateRecommendations(payload: any): FixedCostRecommendation[] {
  if (!Array.isArray(payload)) {
    throw new Error('추천 결과가 배열 형식이 아닙니다.');
  }

  const recommendations: FixedCostRecommendation[] = [];

  for (const item of payload) {
    const rawId = item?.fixedCostId ?? item?.fixed_cost_id;
    const fixedCostId =
      typeof rawId === 'string'
        ? rawId.trim()
        : rawId !== undefined && rawId !== null
          ? String(rawId)
          : '';

    const recommendedAmount = Number(item?.recommendedAmount);

    if (!fixedCostId) {
      console.warn('Invalid fixedCostId in recommendation:', item);
      continue;
    }

    if (!Number.isFinite(recommendedAmount) || recommendedAmount < 0) {
      console.warn('Invalid recommendedAmount in recommendation:', item);
      continue;
    }

    recommendations.push({
      fixedCostId,
      fixedCostName: '', // Will be filled by caller
      recommendedAmount: Math.round(recommendedAmount),
      reason: typeof item?.reason === 'string' ? item.reason : undefined,
    });
  }

  return recommendations;
}

/**
 * Gemini API를 사용하여 변동 고정비의 예정 금액을 추천합니다.
 * (QuickAddVoiceModal의 generateExpenseSuggestion과 동일한 패턴)
 *
 * @param yearMonth - 대상 월 (YYYY-MM 형식)
 * @param variableFixedCosts - 변동 고정비 정보 목록
 * @param categoryExpenses - 카테고리별 지출 요약
 * @param currency - 통화 (기본값: KRW)
 * @returns 각 고정비에 대한 추천 금액 목록
 */
export async function generateFixedCostRecommendations(
  yearMonth: string,
  variableFixedCosts: VariableFixedCostInfo[],
  categoryExpenses: CategoryExpenseSummary[],
  currency: Currency = 'KRW'
): Promise<FixedCostRecommendation[]> {
  if (variableFixedCosts.length === 0) {
    return [];
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일의 VITE_GEMINI_API_KEY 값을 확인하세요.');
  }

  const modelId = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = buildGeminiEndpoint(modelId);

  const prompt = buildPrompt(yearMonth, variableFixedCosts, categoryExpenses, currency);

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
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = errorText || response.statusText;
    if (response.status === 404) {
      throw new Error(
        `Gemini API 호출에 실패했습니다: ${message}\n요청한 모델(${modelId})이 존재하는지 확인하세요.`
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

  return validateRecommendations(parsed);
}
