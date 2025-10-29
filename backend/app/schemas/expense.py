from __future__ import annotations

import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ExpenseBase(BaseModel):
    category_id: UUID
    date: datetime.date
    amount: float
    memo: str

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            return datetime.date.fromisoformat(value)
        return value


class ExpenseCreate(ExpenseBase):
    created_by: Optional[UUID] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[UUID] = None
    date: Optional[datetime.date] = Field(
        default=None,
        description="Expense date in ISO format (YYYY-MM-DD)",
        examples=["2024-07-15"],
    )
    amount: Optional[float] = None
    memo: Optional[str] = None
    created_by: Optional[UUID] = None

    @field_validator("date", mode="before")
    @classmethod
    def parse_optional_date(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            return datetime.date.fromisoformat(value)
        return value


class Expense(ExpenseBase):
    id: UUID
    created_by: UUID

    class Config:
        from_attributes = True
