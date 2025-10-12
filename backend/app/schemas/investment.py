from pydantic import BaseModel
from typing import Optional


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
