from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(String, nullable=False, index=True)  # Format: YYYY-MM
    limit_amount = Column(Float, nullable=False)

    # Relationships
    category = relationship("Category", backref="budgets")
