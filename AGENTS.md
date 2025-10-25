# Repository Guidelines

## Project Structure & Module Organization
The Vite + React front end lives at the repo root, with `src/index.tsx` bootstrapping the UI and `src/App.tsx` plus `components/Sidebar.tsx` shaping the main layout. Feature views reside in `components/Dashboard.tsx`, `components/Income.tsx`, `components/Expenses.tsx`, `components/FixedCosts.tsx`, and `components/Settings.tsx`, while shared types, API helpers, and constants stay in `types.ts`, `lib/api.ts`, and `constants.ts`. The Supabase schema is versioned under `supabase/migrations/` (see `009_add_fixed_cost_amount_mode.sql` for the latest fixed-cost columns). Keep docs, UX notes, and specs inside `docs/`, and place frontend tests next to their components in `__tests__/`. FastAPI assets remain under `backend/app/` for contributors who run the API locally.

## Build, Test, and Development Commands
- `npm install` — install/update frontend dependencies whenever `package.json` or `package-lock.json` changes.
- `npm run dev` — run Vite on port 5173 using the proxy base URL from `.env`.
- `npm run build` — emit the production bundle into `dist/` for smoke testing or deploy previews.
- `npx supabase db push` — apply the latest Supabase migrations (required after changing `supabase/migrations/**` such as fixed-cost updates).
- `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` — start FastAPI with hot reload.
- `cd backend && alembic upgrade head` — apply the latest DB migrations before exercising API endpoints.
- `cd backend && pytest` — execute backend tests against the in-memory SQLite fixtures.

## Coding Style & Naming Conventions
Use 2-space indentation, single quotes, and PascalCase components in React. Hooks/utilities should use camelCase filenames and live near their consumers. When editing fixed-cost views, preserve the `isFixedAmount`/`scheduledAmount` contract: variable costs leave `scheduled_amount` nullable until the user inputs a value in the UI. Python modules follow 4-space indentation, snake_case functions, and should remain Black-compatible. Update `.env.example` whenever new config keys land; do not commit real secrets.

## Testing Guidelines
Frontend tests use Vitest + React Testing Library with `*.test.tsx` colocated under `__tests__/`. Backend tests sit in `backend/tests/` and run with `pytest`. Prioritize coverage for income/expense APIs, cross-budget validation, fixed-cost payment generation (including variable amount edits/revert flow), and investment/issue integrations; add fixtures when touching new models. Aim for deterministic tests that work with the provided SQLite setup.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat(frontend): sidebar tweaks`, `fix(backend): expenses schema`). Each PR should describe intent, list manual verification steps, link relevant issues, and attach UI screenshots when visuals change. Keep migrations, schema updates, and API docs synchronized within the same PR to avoid drift.

## Security & Configuration Tips
Configuration loads through `backend/app/core/config.py`, so ensure `.env` matches `.env.example`. Enforce HTTPS and restrict CORS to the front-end domain before shipping. Rotate or scrub any tokens or sample data used in docs, and never hardcode credentials in source files or tests.

## Fixed-Cost Workflow Notes
- “이번 달 항목 생성”은 자동이 아니므로 새 월을 열었을 때 반드시 버튼을 눌러 전월 데이터를 복제해야 합니다.
- 결제 모달은 지출 테이블을 건드리지 않으며 `fixed_cost_payments` 상태만 갱신합니다. 실수 시 “지불취소”로 초기화할 수 있습니다.
- 변동 금액 항목은 목록에서 예정 금액을 직접 입력 후 저장해야 하며, 저장 전까지 지불 완료 버튼이 비활성화되는 흐름을 유지하세요.
