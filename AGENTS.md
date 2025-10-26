# Repository Guidelines

## Project Structure & Module Organization
The Vite + React frontend lives at the repo root, with `src/index.tsx` bootstrapping the app and `src/App.tsx` plus `components/Sidebar.tsx` shaping layout chrome. Feature views reside under `components/` (`Dashboard`, `Income`, `Expenses`, `FixedCosts`, `Settings`) while shared helpers live in `types.ts`, `lib/api.ts`, and `constants.ts`. Supabase SQL migrations are versioned in `supabase/migrations/` (e.g., `009_add_fixed_cost_amount_mode.sql`). FastAPI code sits in `backend/app/`, and test fixtures in `backend/tests/`. Co-locate frontend tests beside components in `__tests__/`, and keep docs/specs under `docs/`.

## Build, Test, and Development Commands
- `npm install` — sync frontend dependencies after editing `package*.json`.
- `npm run dev` — start Vite on port 5173 using `.env` for proxy config.
- `npm run build` — emit the production bundle to `dist/` for smoke tests.
- `npx supabase db push` — apply new Supabase migrations before API runs.
- `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` — launch FastAPI locally.
- `cd backend && pytest` — execute backend test suite (uses in-memory SQLite).
- `cd backend && alembic upgrade head` — bring the DB schema to the latest revision.

## Coding Style & Naming Conventions
Use 2-space indentation and single quotes in React files; keep components in PascalCase and hooks/utilities in camelCase. Python follows Black-compatible 4-space indentation and snake_case names. Preserve the fixed-cost contract: variable entries keep `scheduled_amount` null until the UI saves a typed value. Update `.env.example` whenever adding config keys.

## Testing Guidelines
Frontend tests rely on Vitest + React Testing Library; place files like `components/FixedCosts/__tests__/FixedCosts.test.tsx` alongside their subjects. Backend tests run with `pytest` and SQLite fixtures—add deterministic coverage for income/expense APIs, cross-budget validation, and fixed-cost payment flows. Run `npm run test` or `cd backend && pytest` before committing substantial work.

## Commit & Pull Request Guidelines
Use Conventional Commits (e.g., `feat(frontend): sidebar tweaks`, `fix(backend): expenses schema`). Each PR should describe intent, list manual verification steps, reference issues, and include screenshots when UI changes. Keep migrations, schema docs, and `.env.example` updates within the same PR to avoid drift.

## Security & Configuration Tips
Configuration loads through `backend/app/core/config.py`; ensure `.env` matches `.env.example` and never commit secrets. Enforce HTTPS and restrict CORS to the frontend domain before release. Rotate tokens used in docs and scrub sample data when sharing logs.
