# Development Workflow

## 0) Prereqs
- PostgreSQL running locally
- .env configured in `backend/`

## 1) Start Backend (API)
```bash
cd backend
uvicorn app.main:app --reload
```

- API base: `http://localhost:8000/api`
- OpenAPI: `http://localhost:8000/openapi.json`
- CORS allows `http://localhost:5173` (Vite default)

## 2) Start Frontend
```bash
cd frontend
npm run dev
```

- Vite dev server: `http://localhost:5173`
- Proxy `/api` → `http://localhost:8000` (see `vite.config.ts`)

## 3) Typical Development Flow
- Create/modify FastAPI routers under `backend/app/api/*`
- Define SQLAlchemy models under `backend/app/models/*`
- Add Pydantic schemas under `backend/app/schemas/*`
- Write services/repositories and wire into routers
- From frontend, call endpoints like:
  - `GET /api/expenses`
  - `POST /api/expenses`
  - `GET /api/invest/transactions?from=...&to=...`

## 4) Migrations
```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## 5) Commit
```bash
git add docs/
git commit -m "docs: align structure (FastAPI is the API), add workflow"
git push
```
