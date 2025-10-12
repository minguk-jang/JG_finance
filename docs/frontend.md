# Frontend (React + Vite)

## Purpose
Browser UI that calls the **FastAPI** backend.
- Sidebar nav: Dashboard / Expenses / Investments / Issues / Settings
- Currency toggle: KRW ↔ USD
- CRUD for expenses, budgets, investments, issues

## Structure
```
/frontend
├── src/
│   ├── components/      # UI atoms/molecules (Button, Modal, Table, ChartCard, ...)
│   ├── features/
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── invest/
│   │   ├── issues/
│   │   └── settings/
│   ├── hooks/           # useCurrency(), useApi(), useAuth(), ...
│   ├── lib/             # api client, formatters, constants
│   ├── styles/          # Tailwind/global styles
│   └── main.tsx         # App entry
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## API Calls
- Base URL (dev): `http://localhost:8000`
- Recommended: Prefix API routes with `/api` on FastAPI side and proxy in Vite.

### vite.config.ts (proxy example)
```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
```

### Minimal API client example
```ts
// src/lib/api.ts
export const API_BASE = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## Run (dev)
```bash
cd frontend
npm install
npm run dev
```

## Quick Add (Gemini) prerequisites
- Set `VITE_GEMINI_API_KEY` in the project root `.env` to enable Gemini requests.
- (Optional) Override the default model with `VITE_GEMINI_MODEL=gemini-2.5-flash` or another supported ID.
- 사용자는 지출 설명을 직접 입력한 뒤 Gemini 분석 버튼으로 세부 정보를 제안받을 수 있습니다.

## Exchange rate control
- Settings 화면의 “환율 설정” 카드에서 USD→KRW 환율을 입력하면 통화 토글과 금액 표시 전반에 즉시 반영됩니다.
- 값은 브라우저 `localStorage`에 저장되므로 새로고침 이후에도 지속됩니다.

## Investments view
- 투자 탭은 계좌/보유 종목 외에 매수·매도 거래 테이블을 제공하며, 날짜/계좌/유형 필터와 거래 추가·수정 모달을 지원합니다.
- 거래 데이터는 `/api/investments/transactions` 엔드포인트와 연동되며, 대시보드 투자 카드(누적/월간 순현금 흐름)도 동일 데이터를 사용해 월별 시점에 맞춰 갱신됩니다.
