from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.category import Category as CategoryModel
from app.models.expense import Expense as ExpenseModel
from app.models.user import User as UserModel
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate

router = APIRouter()

DEFAULT_USER_ID = 1


def _get_expense_or_404(db: Session, expense_id: int) -> ExpenseModel:
    expense = (
        db.query(ExpenseModel)
        .filter(ExpenseModel.id == expense_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


def _ensure_category_exists(db: Session, category_id: int) -> None:
    exists = (
        db.query(CategoryModel.id)
        .filter(CategoryModel.id == category_id)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


def _ensure_user_exists(db: Session, user_id: int) -> None:
    exists = (
        db.query(UserModel.id)
        .filter(UserModel.id == user_id)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid created_by user id")


@router.get("", response_model=List[Expense], summary="List all expenses")
def list_expenses(
    from_date: Optional[date] = Query(None, description="Filter expenses from this date"),
    to_date: Optional[date] = Query(None, description="Filter expenses to this date"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    db: Session = Depends(get_db),
):
    """
    Get a list of all expenses with optional filters.
    """
    query = db.query(ExpenseModel)

    if from_date:
        query = query.filter(ExpenseModel.date >= from_date)
    if to_date:
        query = query.filter(ExpenseModel.date <= to_date)
    if category_id:
        query = query.filter(ExpenseModel.category_id == category_id)

    return query.order_by(ExpenseModel.date.desc(), ExpenseModel.id.desc()).all()


@router.get("/{expense_id}", response_model=Expense, summary="Get expense by ID")
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Get a specific expense by its ID.
    """
    expense = _get_expense_or_404(db, expense_id)
    return expense


@router.post("", response_model=Expense, status_code=status.HTTP_201_CREATED, summary="Create new expense")
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    """
    Create a new expense.
    """
    _ensure_category_exists(db, expense.category_id)

    created_by = expense.created_by or DEFAULT_USER_ID
    _ensure_user_exists(db, created_by)

    db_expense = ExpenseModel(
        category_id=expense.category_id,
        date=expense.date,
        amount=expense.amount,
        memo=expense.memo,
        created_by=created_by,
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.put("/{expense_id}", response_model=Expense, summary="Update expense")
def update_expense(expense_id: int, expense_update: ExpenseUpdate, db: Session = Depends(get_db)):
    """
    Update an existing expense.
    """
    db_expense = _get_expense_or_404(db, expense_id)

    update_data = expense_update.dict(exclude_unset=True)
    if "category_id" in update_data:
        _ensure_category_exists(db, update_data["category_id"])
        db_expense.category_id = update_data["category_id"]

    if "created_by" in update_data:
        if update_data["created_by"] is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="created_by cannot be null")
        _ensure_user_exists(db, update_data["created_by"])
        db_expense.created_by = update_data["created_by"]

    if "date" in update_data:
        db_expense.date = update_data["date"]
    if "amount" in update_data:
        db_expense.amount = update_data["amount"]
    if "memo" in update_data:
        db_expense.memo = update_data["memo"]

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete expense")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Delete an expense by ID.
    """
    db_expense = _get_expense_or_404(db, expense_id)
    db.delete(db_expense)
    db.commit()
