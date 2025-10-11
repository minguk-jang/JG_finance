from pydantic import BaseModel
from datetime import date
from typing import Optional


class ExpenseBase(BaseModel):
    category_id: int
    date: date
    amount: float
    memo: str


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    date: Optional[date] = None
    amount: Optional[float] = None
    memo: Optional[str] = None


class Expense(ExpenseBase):
    id: int
    created_by: int

    class Config:
        from_attributes = True
