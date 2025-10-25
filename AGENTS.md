# Repository Guidelines

## Project Structure & Module Organization
JG_finance pairs a Vite + React front end at the repo root with a FastAPI backend under `backend/`. `index.tsx` wires the app, `App.tsx` plus `components/Sidebar.tsx` own layout, and feature views live in `components/Income.tsx`, `components/Expenses.tsx`, `components/Dashboard.tsx`, and `components/Settings.tsx`. Shared contracts sit in `types.ts`, fetch helpers in `lib/api.ts`, and persistent constants inside `constants.ts`. Backend routers stay in `backend/app/api/`, models in `backend/app/models/`, schemas in `backend/app/schemas/`, and migrations under `backend/app/migrations/`. Documentation, UX notes, and specs belong in `docs/`.

## Build, Test, and Development Commands
- `npm install` — restore front-end dependencies any time `package-lock.json` changes.
- `npm run dev` — start Vite on port 5173 with the proxy base URL from `.env`.
- `npm run build` — emit a production bundle in `dist/` for smoke tests or deploy previews.
- `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` — run FastAPI locally with hot reload.
- `cd backend && alembic upgrade head` — apply DB migrations before exercising API endpoints.

## Coding Style & Naming Conventions
Use 2-space indentation, single quotes, PascalCase components, and colocate hooks/utilities via camelCase filenames. Normalize API response keys when entering Income/Expenses to keep UI props predictable. Python files use 4-space indentation, snake_case functions, and Black-compatible formatting. Keep secrets in `.env`; never hardcode credentials or URLs.

## Testing Guidelines
Front-end tests live alongside components in `__tests__/` as `*.test.tsx`, using Vitest + React Testing Library (run via `npm test`). Backend tests sit in `backend/tests/` and run with `cd backend && pytest`, relying on the in-memory SQLite fixtures provided in `tests/test_expenses_api.py`. Prioritize coverage for income/expense APIs, cross-budget validation, and investment/issue integrations before touching lower-priority flows.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) and add scopes like `feat(frontend): sidebar tweaks`. Each PR should summarize intent, list manual test steps, link tracking issues, and attach UI screenshots when visuals change. Keep migrations, schema dumps, and API docs aligned in the same PR.

## Security & Configuration Tips
`.env` is loaded through `backend/app/core/config.py`; update `.env.example` whenever new variables land. Rotate tokens prior to shared deployments, scrub sample data or screenshots that contain PII, and enforce HTTPS plus restrictive CORS (front-end domain only) before shipping externally.
