from pydantic import BaseModel
from typing import Literal, Optional


class CategoryBase(BaseModel):
    name: str
    type: Literal["income", "expense"]


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None


class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True
