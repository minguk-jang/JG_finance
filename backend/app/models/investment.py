from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class InvestmentAccount(Base):
    __tablename__ = "investment_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    broker = Column(String, nullable=False)


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("investment_accounts.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    qty = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)

    # Relationships
    account = relationship("InvestmentAccount", backref="holdings")
