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
