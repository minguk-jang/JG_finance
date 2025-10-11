from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Root endpoint"""
    return {"message": "Welcome to Jjoogguk Finance API", "status": "ok"}


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Import routers
from app.api import categories, expenses

# Mount routers
app.include_router(
    categories.router,
    prefix="/api/categories",
    tags=["categories"]
)
app.include_router(
    expenses.router,
    prefix="/api/expenses",
    tags=["expenses"]
)

# TODO: Add more routers
# from app.api import auth, users, budgets, issues
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(users.router, prefix="/api/users", tags=["users"])
# app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
# app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
