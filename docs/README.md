# Jjoogguk Finance — Project Overview

## Folder Structure
```
/
├── frontend/   # React (TypeScript, Vite) app — calls FastAPI
├── backend/    # FastAPI app (routers, models, schemas, services, db)
└── docs/       # Project documentation
```

## What lives where
- **frontend/**: UI, routing, data fetching (to FastAPI), charts/tables/forms.
- **backend/**: FastAPI (REST), SQLAlchemy models, Alembic migrations, auth, services.
- **docs/**: These documents (structure, how-to-run, conventions).

## Tech Stack
- Frontend: React + TypeScript + Vite, Tailwind, React Query, TanStack Table, Recharts
- Backend: Python + FastAPI, SQLAlchemy, Alembic
- DB: PostgreSQL
- Auth: JWT (access/refresh), role-based (Admin/Editor/Viewer)
