from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.category import Category as CategoryModel, CategoryType
from app.models.budget import Budget as BudgetModel
from app.models.expense import Expense as ExpenseModel
from app.schemas.category import Category, CategoryCreate, CategoryUpdate

router = APIRouter()


@router.get("", response_model=List[Category], summary="List all categories")
def list_categories(db: Session = Depends(get_db)):
    """
    Get a list of all income and expense categories.
    """
    return db.query(CategoryModel).order_by(CategoryModel.id).all()


@router.get("/{category_id}", response_model=Category, summary="Get category by ID")
def get_category(category_id: UUID, db: Session = Depends(get_db)):
    """
    Get a specific category by its ID.

    - **category_id**: The ID of the category to retrieve
    """
    category = (
        db.query(CategoryModel)
        .filter(CategoryModel.id == category_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=Category, status_code=status.HTTP_201_CREATED, summary="Create new category")
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """
    Create a new category.

    - **name**: Name of the category (e.g., "식비", "급여")
    - **type**: Either "income" or "expense"
    """
    existing = (
        db.query(CategoryModel)
        .filter(
            CategoryModel.name == category.name,
            CategoryModel.type == CategoryType(category.type),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with the same name and type already exists",
        )

    db_category = CategoryModel(
        name=category.name,
        type=CategoryType(category.type),
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/{category_id}", response_model=Category, summary="Update category")
def update_category(category_id: UUID, category: CategoryUpdate, db: Session = Depends(get_db)):
    """
    Update an existing category.

    - **category_id**: The ID of the category to update
    - **name**: New name for the category (optional)
    - **type**: New type for the category (optional)
    """
    db_category = (
        db.query(CategoryModel)
        .filter(CategoryModel.id == category_id)
        .first()
    )
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category.model_dump(exclude_unset=True)
    if not update_data:
        return db_category

    new_name = update_data.get("name", db_category.name)
    new_type = update_data.get("type", db_category.type.value)

    duplicate = (
        db.query(CategoryModel)
        .filter(
            CategoryModel.name == new_name,
            CategoryModel.type == CategoryType(new_type),
            CategoryModel.id != category_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another category with the same name and type already exists",
        )

    if "name" in update_data:
        db_category.name = update_data["name"]
    if "type" in update_data:
        db_category.type = CategoryType(update_data["type"])

    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/{category_id}", summary="Delete category")
def delete_category(category_id: UUID, db: Session = Depends(get_db)):
    """
    Delete a category.

    - **category_id**: The ID of the category to delete
    """
    db_category = (
        db.query(CategoryModel)
        .filter(CategoryModel.id == category_id)
        .first()
    )
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    linked_budget_count = (
        db.query(func.count(BudgetModel.id))
        .filter(BudgetModel.category_id == category_id)
        .scalar()
    )
    if linked_budget_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category because budgets depend on it",
        )

    linked_expense_count = (
        db.query(func.count(ExpenseModel.id))
        .filter(ExpenseModel.category_id == category_id)
        .scalar()
    )
    if linked_expense_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category because expenses depend on it",
        )

    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}
