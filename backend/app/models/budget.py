import uuid

from sqlalchemy import Column, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.types import GUID


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    category_id = Column(GUID(), ForeignKey("categories.id"), nullable=False)
    month = Column(String, nullable=False, index=True)  # Format: YYYY-MM
    limit_amount = Column(Float, nullable=False)

    # Relationships
    category = relationship("Category", backref="budgets")
