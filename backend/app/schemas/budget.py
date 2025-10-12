from pydantic import BaseModel
from typing import Optional


class BudgetBase(BaseModel):
    category_id: int
    month: str  # Format: YYYY-MM
    limit_amount: float


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[int] = None
    month: Optional[str] = None
    limit_amount: Optional[float] = None


class Budget(BudgetBase):
    id: int

    class Config:
        from_attributes = True
