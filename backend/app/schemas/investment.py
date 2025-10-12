from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.investment import TransactionType


# Holding Schemas
class HoldingBase(BaseModel):
    account_id: int
    symbol: str
    name: str
    qty: float
    avg_price: float
    current_price: float


class HoldingCreate(HoldingBase):
    pass


class HoldingUpdate(BaseModel):
    account_id: Optional[int] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    qty: Optional[float] = None
    avg_price: Optional[float] = None
    current_price: Optional[float] = None


class Holding(HoldingBase):
    id: int

    class Config:
        from_attributes = True


# Investment Account Schemas
class InvestmentAccountBase(BaseModel):
    name: str
    broker: str


class InvestmentAccountCreate(InvestmentAccountBase):
    pass


class InvestmentAccountUpdate(BaseModel):
    name: Optional[str] = None
    broker: Optional[str] = None


class InvestmentAccount(InvestmentAccountBase):
    id: int

    class Config:
        from_attributes = True


# Investment Transaction Schemas
class InvestmentTransactionBase(BaseModel):
    account_id: int
    symbol: str
    name: Optional[str] = None
    type: TransactionType
    trade_date: date
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    fees: float = Field(0, ge=0)
    memo: Optional[str] = None


class InvestmentTransactionCreate(InvestmentTransactionBase):
    pass


class InvestmentTransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    type: Optional[TransactionType] = None
    trade_date: Optional[date] = None
    quantity: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    fees: Optional[float] = Field(None, ge=0)
    memo: Optional[str] = None


class InvestmentTransaction(InvestmentTransactionBase):
    id: int
    created_at: datetime
    account: Optional[InvestmentAccount] = None

    class Config:
        from_attributes = True
