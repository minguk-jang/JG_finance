# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jjoogguk Finance is a **full-stack personal finance management application** with a React frontend and FastAPI backend. It provides tools for tracking expenses, investments, budgets, and financial planning tasks for households/families, with multi-currency support (KRW/USD).

**Current Status**: ✅ Fully functional with expense CRUD, dashboard, and real-time API integration.

## Project Structure

```
/
├── backend/        # FastAPI (Python) — REST API, database, business logic
├── components/     # React UI components
├── lib/            # Frontend utilities (API client)
├── docs/           # Detailed documentation
└── (root files)    # Frontend app files (to be moved to /frontend)
```

**Note**: Frontend files are currently at the root level. Planned reorganization will move them to `/frontend` directory.

## Development Commands

### Frontend (Current: Root Level)

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend (/backend Directory)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Create new migration after model changes
alembic revision --autogenerate -m "description"

# Start FastAPI server (port 8000)
uvicorn app.main:app --reload

# Access API docs
# Swagger UI: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
# OpenAPI JSON: http://localhost:8000/openapi.json
```

### Database

```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@14

# Create database
createdb jjoogguk_finance

# Connect to database
psql -d jjoogguk_finance

# List tables
psql -d jjoogguk_finance -c "\dt"
```

## Architecture

### Overall Architecture

The application follows a **modern client-server architecture**:

```
React Frontend (Vite) → Vite Proxy → FastAPI Backend → PostgreSQL
     :3000              /api/*           :8000
```

- **Frontend**: React 19 + TypeScript SPA with Vite dev server
- **Backend**: FastAPI serves REST endpoints under `/api/*`
- **Database**: PostgreSQL 14 with SQLAlchemy ORM
- **API Communication**: Vite proxies `/api` requests to backend (configured in vite.config.ts:11-16)

### Frontend Architecture (React)

**Current State**: Fully connected to backend with working CRUD operations.

**Key Files**:
- **App.tsx**: Root component managing global state (page navigation, currency selection)
- **lib/api.ts**: API client with methods for all backend endpoints
- **types.ts**: TypeScript type definitions for all domain entities
- **constants.ts**: Fallback mock data for users/budgets (categories/expenses now from API)
- **vite.config.ts**: Vite configuration with API proxy setup

**Page Components** (`/components/`):
- **Dashboard.tsx**: ✅ Connected to API - Shows financial summaries, charts, budget progress
- **Expenses.tsx**: ✅ Connected to API - Full CRUD for expenses with modal form
- **Investments.tsx**: 🚧 Uses mock data - Investment portfolio and holdings
- **Issues.tsx**: 🚧 Uses mock data - Task/issue tracking for financial planning
- **Settings.tsx**: Application settings

**Navigation Pattern**:
- `currentPage` state in App.tsx controls which page is rendered
- Sidebar.tsx handles navigation via `setCurrentPage` callback
- Page type: `'Dashboard' | 'Expenses' | 'Investments' | 'Issues' | 'Settings'`

**Data Flow** (✅ Implemented):
- **API Client**: `lib/api.ts` provides typed methods for all endpoints
- **State Management**: React useState + useEffect hooks for data fetching
- **Proxy**: Vite forwards `/api` requests to `http://localhost:8000`
- **Loading States**: Components show "Loading..." while fetching
- **Error Handling**: User-friendly alerts on API failures

**Styling**:
- Tailwind CSS utility classes
- Dark theme by default (bg-gray-900, text-gray-200)
- Custom Card component (`/components/ui/Card.tsx`)

**Charts**:
- Recharts library (v3.2.1): LineChart (net worth), PieChart (expenses), BarChart (available)
- Custom SVG circles for budget progress indicators

### Backend Architecture (FastAPI)

**Implemented Structure**:
```
/backend
└── app/
    ├── main.py             # ✅ FastAPI app, CORS, router mounting
    ├── api/                # ✅ API routers by domain
    │   ├── categories.py   # ✅ Category CRUD
    │   └── expenses.py     # ✅ Expense CRUD with filters
    ├── models/             # ✅ SQLAlchemy models
    │   ├── user.py         # ✅ User model with roles
    │   ├── category.py     # ✅ Category model
    │   ├── expense.py      # ✅ Expense model
    │   ├── budget.py       # ✅ Budget model
    │   ├── investment.py   # ✅ Investment models
    │   └── issue.py        # ✅ Issue/Label models
    ├── schemas/            # ✅ Pydantic request/response models
    │   ├── category.py     # ✅ Category schemas
    │   └── expense.py      # ✅ Expense schemas
    ├── core/               # ✅ Configuration and dependencies
    │   ├── config.py       # ✅ Settings from .env
    │   ├── database.py     # ✅ SQLAlchemy engine, session
    │   ├── security.py     # ✅ JWT, password hashing (not yet used)
    │   └── deps.py         # ✅ FastAPI dependencies
    └── migrations/         # ✅ Alembic migrations
        └── versions/       # ✅ Migration files
```

**API Endpoints** (Implemented):

*Categories*:
- `GET /api/categories` - List all categories
- `GET /api/categories/{id}` - Get category by ID
- `POST /api/categories` - Create new category

*Expenses*:
- `GET /api/expenses` - List expenses (optional filters: from_date, to_date, category_id)
- `GET /api/expenses/{id}` - Get expense by ID
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

**Database Tables** (All Created):
- `users` - User accounts with roles (Admin/Editor/Viewer)
- `categories` - Income/expense categories
- `expenses` - Expense transactions with timestamps
- `budgets` - Budget limits per category/month
- `investment_accounts` - Investment account info
- `holdings` - Stock/asset holdings
- `issues` - Financial planning tasks
- `labels` - Tags for issues
- `issue_labels` - Many-to-many junction table

**Authentication** (Implemented but not yet wired):
- JWT utilities in `core/security.py`
- Password hashing with bcrypt
- Role-based access control models defined
- Protected routes pattern ready in `core/deps.py`

### Currency Handling

- All financial data stored in **KRW** (base currency)
- USD conversion uses fixed exchange rate: `USD_KRW_EXCHANGE_RATE = 1350` (constants.ts:4)
- Currency toggle in Header component switches display format
- `formatCurrency()` utility in components converts values before rendering

### Data Relationships

- Expenses → Categories (via `category_id` foreign key)
- Expenses → Users (via `created_by` foreign key)
- Budgets → Categories (via `categoryId`), month-specific (YYYY-MM)
- Holdings → InvestmentAccounts (via `account_id`)
- Issues → Users (via `assignee_id`)
- Issues ↔ Labels (many-to-many via `issue_labels`)

### Date Handling

- Dates stored as ISO strings (YYYY-MM-DD) in database
- Date columns indexed for performance
- Budget months use YYYY-MM format
- Dashboard currently filters by `'2024-07'` (hardcoded, should be dynamic)

## Development Workflow

### Starting the Application

1. **Start PostgreSQL**: `brew services start postgresql@14`
2. **Start Backend**: `cd backend && uvicorn app.main:app --reload` (port 8000)
3. **Start Frontend**: `npm run dev` (port 3000)
4. **Access**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/*
   - API Docs: http://localhost:8000/docs

### Adding New Features

**Backend (FastAPI)**:
1. Create SQLAlchemy model in `backend/app/models/`
2. Create Pydantic schemas in `backend/app/schemas/`
3. Create API router in `backend/app/api/`
4. Mount router in `backend/app/main.py`
5. Generate migration: `alembic revision --autogenerate -m "description"`
6. Apply migration: `alembic upgrade head`

**Frontend (React)**:
1. Add API methods to `lib/api.ts` (e.g., `api.getInvestments()`)
2. Update component to use API (useState + useEffect pattern)
3. Handle loading states and errors
4. Vite will hot-reload automatically

### Common Patterns

**API Client Usage**:
```typescript
// lib/api.ts
import { api } from '../lib/api';

// In component:
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const result = await api.getExpenses();
      setData(result);
    } catch (error) {
      console.error('Failed:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**Backend Router Pattern**:
```python
# app/api/resource.py
from fastapi import APIRouter
router = APIRouter()

@router.get("")
def list_items():
    return mock_data  # Replace with DB query

@router.post("")
def create_item(item: ItemCreate):
    # Save to database
    return new_item
```

## Key Implementation Details

### API Client (lib/api.ts:1-75)

Provides typed methods for all backend endpoints:
- Base URL: `/api` (proxied to backend)
- Error handling with `ApiError` class
- Methods: `apiGet`, `apiPost`, `apiPut`, `apiDelete`
- Structured API object with domain-specific methods

### Vite Proxy (vite.config.ts:11-16)

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

### Database Connection (backend/app/core/database.py:7-8)

```python
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### Current Limitations

1. **Mock Data**: Budgets, investments, issues still use constants.ts
2. **Authentication**: JWT setup exists but not enforced on routes
3. **User Management**: No UI for user CRUD operations
4. **Real-time Updates**: No WebSocket support for live data
5. **File Uploads**: No support for receipts/attachments

### Next Steps (Prioritized)

1. ✅ Expense CRUD - **DONE**
2. ✅ Dashboard API integration - **DONE**
3. 🔄 Add real categories to database (seed data)
4. 🔄 Connect Investments page to API
5. 🔄 Connect Issues page to API
6. 🔄 Implement user authentication
7. 🔄 Add budget management UI

## Troubleshooting

**Frontend can't connect to backend**:
- Ensure backend is running: `curl http://localhost:8000/api/health`
- Check Vite proxy in browser network tab
- Verify CORS settings in `backend/app/main.py:8-14`

**Database connection error**:
- Check PostgreSQL is running: `brew services list`
- Verify DATABASE_URL in `backend/.env`
- Test connection: `psql -d jjoogguk_finance`

**Migration issues**:
- Check all models imported in `backend/app/migrations/env.py:13-22`
- Delete bad migration and regenerate
- Manually edit migration file if needed

**Hot reload not working**:
- Frontend: Check Vite dev server is running
- Backend: Ensure `--reload` flag is passed to uvicorn

## Documentation

For detailed information, see:
- [`docs/README.md`](./docs/README.md) - Project overview
- [`docs/frontend.md`](./docs/frontend.md) - React app structure and API integration
- [`docs/backend.md`](./docs/backend.md) - FastAPI structure and endpoints
- [`docs/workflow.md`](./docs/workflow.md) - Development workflow and deployment
- [`README.md`](./README.md) - Quick start guide with all commands
