import enum
import uuid

from sqlalchemy import Column, Enum, String

from app.core.database import Base
from app.models.types import GUID


class CategoryType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(Base):
    __tablename__ = "categories"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(Enum(CategoryType), nullable=False)
