<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jjoogguk Finance

A full-stack personal finance management application for tracking expenses, investments, budgets, and financial planning tasks for households and families.

## Project Structure

```
/
├── backend/        # FastAPI app (routers, models, schemas, services, db)
├── components/     # React UI components
├── lib/            # Frontend utilities (API client)
├── docs/           # Project documentation
└── (root files)    # Frontend app files (will be moved to /frontend)
```

**Note**: Frontend files are currently at the root level and will be organized into a `/frontend` directory in the future.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS, Recharts
- **Backend**: Python 3.9 + FastAPI, SQLAlchemy, Alembic
- **Database**: PostgreSQL 14
- **Auth**: JWT (access/refresh tokens), role-based access control (Admin/Editor/Viewer)

## Features

- ✅ **Expense Management**: Full CRUD operations for expenses with categories
- ✅ **Dashboard**: Real-time financial summaries with interactive charts
- ✅ **Multi-currency Support**: Toggle between KRW and USD
- ✅ **Budgeting**: Track spending against budget limits
- 🚧 **Investment Portfolio**: Track stocks and assets (planned)
- 🚧 **Issue Tracking**: Financial planning tasks (planned)
- 🚧 **User Authentication**: JWT-based auth (planned)

## Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.9+
- **PostgreSQL** 14+

## Quick Start

### 1. Database Setup

```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@14

# Create database
createdb jjoogguk_finance
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file with:
# DATABASE_URL=postgresql://localhost:5432/jjoogguk_finance
# JWT_SECRET=your-secret-key

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload
```

Backend runs on **http://localhost:8000**
- API endpoints: `http://localhost:8000/api/*`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Frontend Setup

```bash
# Install dependencies (from project root)
npm install

# Start Vite dev server
npm run dev
```

Frontend runs on **http://localhost:3000**

## Current API Endpoints

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/{id}` - Get category by ID
- `POST /api/categories` - Create new category

### Expenses
- `GET /api/expenses` - List expenses (with optional filters)
- `GET /api/expenses/{id}` - Get expense by ID
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

## Development

### Architecture

The application uses a modern client-server architecture:

```
React Frontend (Vite) → API Proxy → FastAPI Backend → PostgreSQL
     :3000                             :8000
```

- **Vite proxy** forwards `/api` requests from frontend to backend
- **FastAPI** serves REST endpoints with automatic OpenAPI documentation
- **SQLAlchemy ORM** with Alembic migrations for database schema management
- **Pydantic** for request/response validation

### Key Files

- `backend/app/main.py` - FastAPI app entry point
- `backend/app/api/` - API route handlers
- `backend/app/models/` - SQLAlchemy database models
- `backend/app/schemas/` - Pydantic request/response schemas
- `lib/api.ts` - Frontend API client
- `vite.config.ts` - Vite configuration with proxy setup

### Adding New Features

1. **Backend**: Create model → schema → router → mount in `main.py`
2. **Frontend**: Add API method to `lib/api.ts` → create/update component
3. **Database**: Generate migration with `alembic revision --autogenerate`

## Documentation

See the [`docs/`](./docs/) directory for detailed documentation:

- [**Project Overview**](./docs/README.md) - Architecture and tech stack
- [**Frontend Guide**](./docs/frontend.md) - React app structure and API integration
- [**Backend Guide**](./docs/backend.md) - FastAPI structure and endpoints
- [**Development Workflow**](./docs/workflow.md) - How to develop and deploy

## Database Schema

Current tables:
- `users` - User accounts with roles
- `categories` - Income/expense categories
- `expenses` - Expense transactions
- `budgets` - Budget limits per category/month
- `investment_accounts` - Investment account info
- `holdings` - Stock/asset holdings
- `issues` - Financial planning tasks
- `labels` - Tags for issues

## Common Commands

```bash
# Backend
cd backend
alembic revision --autogenerate -m "description"  # Create migration
alembic upgrade head                              # Apply migrations
uvicorn app.main:app --reload                     # Start dev server
python -m pytest                                   # Run tests

# Frontend
npm run dev                                        # Start dev server
npm run build                                      # Build for production
npm run preview                                    # Preview production build

# Database
psql -d jjoogguk_finance                          # Connect to database
psql -d jjoogguk_finance -c "\dt"                 # List tables
```

## Troubleshooting

**Frontend can't connect to backend:**
- Ensure backend is running on port 8000
- Check Vite proxy configuration in `vite.config.ts`

**Database connection error:**
- Verify PostgreSQL is running: `brew services list`
- Check DATABASE_URL in `backend/.env`

**Alembic migration issues:**
- Delete `backend/app/migrations/versions/*` and regenerate
- Or manually edit the migration file

## License

MIT
