from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class BudgetBase(BaseModel):
    category_id: UUID
    month: str  # Format: YYYY-MM
    limit_amount: float


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[UUID] = None
    month: Optional[str] = None
    limit_amount: Optional[float] = None


class Budget(BudgetBase):
    id: UUID

    class Config:
        from_attributes = True
