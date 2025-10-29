import enum
import uuid

from sqlalchemy import Column, Enum, String

from app.core.database import Base
from app.models.types import GUID


class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    EDITOR = "Editor"
    VIEWER = "Viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.VIEWER)
    avatar = Column(String, nullable=True)
