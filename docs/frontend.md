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
