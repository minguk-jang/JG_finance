# Repository Guidelines

## Project Structure & Module Organization
Front-end code lives at the repository root with `index.tsx` bootstrapping the Vite + React app, composable views under `components/`, shared types in `types.ts`, and remote helpers in `lib/api.ts`. 주요 페이지는 `components/Income.tsx`, `components/Expenses.tsx`, `components/Dashboard.tsx`, `components/Settings.tsx`로 나뉘어 있으며, 공통 레이아웃은 `App.tsx`와 `components/Sidebar.tsx`에서 관리합니다. FastAPI 서비스는 `backend/app/`에 있으며 라우터(`app/api/`), SQLAlchemy 모델(`app/models/`), Pydantic 스키마(`app/schemas/`), Alembic 마이그레이션(`app/migrations/`)이 모여 있습니다. 정적 문서와 디자인 노트는 `docs/`에 정리합니다.

## Build, Test, and Development Commands
- `npm install` — install front-end dependencies after cloning or when `package.json` changes.
- `npm run dev` — launch the Vite dev server on port 5173 and proxy API calls via the configured base URL.
- `npm run build` — produce an optimized bundle in `dist/` for staging or smoke tests.
- `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` — start the FastAPI server on port 8000; `.env` overrides connection details.
- `cd backend && alembic upgrade head` — apply database migrations before hitting API endpoints.

## Coding Style & Naming Conventions
TypeScript follows 2-space indentation, single quotes, and PascalCase component files (e.g., `components/Dashboard.tsx`). 수익/지출 화면은 동일한 API(`lib/api.ts`)를 사용하므로, API 응답 키(case 변환 등)를 컴포넌트 진입부에서 정규화하세요. Python 모듈은 4-space indentation, snake_case 함수명, Black 친화적 포맷을 유지합니다. 환경 변수는 `.env`로 관리하고 민감 정보는 코드에 하드코딩하지 않습니다.

## Testing Guidelines
Add front-end tests with Vitest + React Testing Library under `__tests__/` next to the code under test, naming files `*.test.tsx`. Backend tests reside in `backend/tests/` and use Pytest with in-memory SQLite fixtures (`tests/test_expenses_api.py` 참고); 실행은 `cd backend && pytest`입니다. 지출/수익 API, 예산 교차 검증, 투자/이슈 연동에 우선순위를 두고 커버리지를 확장하세요.

## Commit & Pull Request Guidelines
Commits follow a Conventional Commits style (`feat:`, `fix:`, `chore:`) as seen in `git log`; scope qualifiers help when touching both tiers (e.g., `feat(frontend):`). Keep commits focused and include migration context in the body. Pull requests should summarize intent, list manual test steps, attach UI screenshots, and link tracking issues. Ensure migrations, schema dumps, and API docs stay in sync before review.

## Security & Configuration Tips
Use `.env` (loaded via `backend/app/core/config.py`) for database URLs, JWT secrets, and CORS overrides; update `.env.example` when variables change. Rotate credentials before 공유 배포를 진행하고, 샘플 데이터·스크린샷 등 PII는 커밋 전에 제거합니다. 배포 시 HTTPS를 활성화하고 프론트엔드 도메인만 CORS에 허용하세요.
