from typing import Optional
from uuid import UUID

from pydantic import BaseModel
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "Admin"
    EDITOR = "Editor"
    VIEWER = "Viewer"


class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole
    avatar: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    avatar: Optional[str] = None
    password: Optional[str] = None


class User(UserBase):
    id: UUID

    class Config:
        from_attributes = True
