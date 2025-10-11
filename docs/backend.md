# Backend (FastAPI + PostgreSQL)

## Purpose
Acts as the **API** for the frontend. No separate `/api` directory needed.

- Exposes REST endpoints under `/api/*`
- Persists to PostgreSQL via SQLAlchemy
- Alembic for migrations
- JWT auth, RBAC (Admin/Editor/Viewer)

## Structure
```
/backend
└── app/
    ├── main.py             # FastAPI app factory, router mounting, CORS
    ├── api/                # Routers grouped by domain
    │   ├── auth.py
    │   ├── users.py
    │   ├── categories.py
    │   ├── expenses.py
    │   ├── budgets.py
    │   ├── invest/
    │   │   ├── accounts.py
    │   │   └── transactions.py
    │   ├── issues.py
    │   └── comments.py
    ├── models/             # SQLAlchemy models
    ├── schemas/            # Pydantic models
    ├── services/           # Business logic
    ├── repositories/       # DB access (CRUD)
    ├── core/               # settings, security, deps (DB session), logging
    └── migrations/         # Alembic
```

## Example: main.py
```py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users, categories, expenses, budgets, issues, comments
from app.api.invest import accounts, transactions

app = FastAPI(title="Jjoogguk Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers under /api
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(accounts.router, prefix="/api/invest/accounts", tags=["invest"])
app.include_router(transactions.router, prefix="/api/invest/transactions", tags=["invest"])
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
```

## Example: expenses router
```py
# app/api/expenses.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db

router = APIRouter()

@router.get("")
def list_expenses(db: Session = Depends(get_db), from_: str | None = None, to: str | None = None):
    # TODO: query with filters
    return {"items": [], "count": 0}
```

## OpenAPI
- FastAPI serves OpenAPI at: `/openapi.json`
- Swagger UI: `/docs`
- Redoc: `/redoc`

## Run (dev)
```bash
cd backend
uvicorn app.main:app --reload
```

## Env (.env example)
```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/jjoogguk_finance
JWT_SECRET=change_me
```
