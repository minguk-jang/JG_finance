import uuid

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.types import GUID


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    category_id = Column(GUID(), ForeignKey("categories.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    memo = Column(String, nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", backref="expenses")
    creator = relationship("User", backref="expenses")
