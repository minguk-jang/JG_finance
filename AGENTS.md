# Repository Guidelines

## Project Structure & Module Organization
- React frontend sits at repo root with Vite entry `src/index.tsx`, layout in `src/App.tsx`, and shared chrome under `components/Sidebar.tsx`.
- Feature views (Dashboard, Income, Expenses, FixedCosts, Settings) live in `components/`, while shared types/utilities stay in `types.ts`, `lib/api.ts`, and `constants.ts`.
- FastAPI backend code resides in `backend/app/` with pytest suites in `backend/tests/`.
- Supabase migrations belong to `supabase/migrations/`; docs stay in `docs/`.
- Frontend specs live alongside components inside `__tests__/` directories.

## Build, Test, and Development Commands
- `npm install` — sync frontend dependencies after touching `package*.json`.
- `npm run dev` — start the Vite dev server on port 5173 (requires `.env`).
- `npm run build` — emit production assets into `dist/` for smoke tests.
- `npm run test` — run Vitest + React Testing Library suites.
- `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` — launch the FastAPI server locally.
- `cd backend && pytest` — execute backend tests (SQLite fixtures).
- Schema parity: `npx supabase db push` and `cd backend && alembic upgrade head`.

## Coding Style & Naming Conventions
- React: 2-space indentation, single quotes, PascalCase components, camelCase hooks/utilities.
- Python: Black-compatible 4-space indentation, snake_case identifiers, keep config in `backend/app/core/config.py`.
- Preserve fixed-cost contract: keep `scheduled_amount = null` for variable entries until the UI persists a value.
- Update `.env.example` whenever adding configuration keys; never commit `.env`.

## Testing Guidelines
- Frontend: Vitest + React Testing Library; co-locate specs such as `components/FixedCosts/__tests__/FixedCosts.test.tsx`.
- Backend: pytest covering income/expense APIs, cross-budget validation, and fixed-cost flows.
- Run `npm run test` and `cd backend && pytest` before opening a PR; add targeted tests for regressions.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat(frontend): sidebar tweaks`, `fix(backend): expenses schema`) and keep scope narrow.
- PRs should describe intent, outline manual verification (commands run, screenshots for UI updates), reference related issues, and include schema/docs changes when relevant.
- Keep Supabase migrations, backend schemas, and `.env.example` updates in the same PR to avoid drift.

## Security & Configuration Tips
- Configuration loads via `backend/app/core/config.py`; keep `.env` synchronized with `.env.example`.
- Enforce HTTPS, restrict CORS to the frontend domain before release, rotate tokens mentioned in docs, and scrub sample data from shared logs.
