import enum

from sqlalchemy import Column, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class TransactionType(enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class InvestmentAccount(Base):
    __tablename__ = "investment_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    broker = Column(String, nullable=False)

    holdings = relationship("Holding", back_populates="account", cascade="all, delete-orphan")
    transactions = relationship("InvestmentTransaction", back_populates="account", cascade="all, delete-orphan")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("investment_accounts.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    qty = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)

    account = relationship("InvestmentAccount", back_populates="holdings")


class InvestmentTransaction(Base):
    __tablename__ = "investment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("investment_accounts.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    type = Column(Enum(TransactionType, name="transactiontype"), nullable=False)
    trade_date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    fees = Column(Float, nullable=False, default=0.0)
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    account = relationship("InvestmentAccount", back_populates="transactions")
