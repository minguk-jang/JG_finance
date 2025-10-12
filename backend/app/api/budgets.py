from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_db
from app.models.budget import Budget as BudgetModel
from app.schemas.budget import Budget, BudgetCreate, BudgetUpdate

router = APIRouter()


@router.get("", response_model=List[Budget])
def get_budgets(
    month: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all budgets with optional filters"""
    query = db.query(BudgetModel)

    if month:
        query = query.filter(BudgetModel.month == month)
    if category_id:
        query = query.filter(BudgetModel.category_id == category_id)

    return query.all()


@router.get("/{budget_id}", response_model=Budget)
def get_budget(budget_id: int, db: Session = Depends(get_db)):
    """Get a specific budget by ID"""
    budget = db.query(BudgetModel).filter(BudgetModel.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.post("", response_model=Budget)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    """Create a new budget"""
    # Check if budget already exists for this category and month
    existing = db.query(BudgetModel).filter(
        BudgetModel.category_id == budget.category_id,
        BudgetModel.month == budget.month
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Budget already exists for this category and month"
        )

    db_budget = BudgetModel(**budget.dict())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.put("/{budget_id}", response_model=Budget)
def update_budget(budget_id: int, budget: BudgetUpdate, db: Session = Depends(get_db)):
    """Update an existing budget"""
    db_budget = db.query(BudgetModel).filter(BudgetModel.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = budget.dict(exclude_unset=True)

    # Check if updating would create a duplicate
    if "category_id" in update_data or "month" in update_data:
        new_category_id = update_data.get("category_id", db_budget.category_id)
        new_month = update_data.get("month", db_budget.month)

        existing = db.query(BudgetModel).filter(
            BudgetModel.category_id == new_category_id,
            BudgetModel.month == new_month,
            BudgetModel.id != budget_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Budget already exists for this category and month"
            )

    for field, value in update_data.items():
        setattr(db_budget, field, value)

    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    """Delete a budget"""
    db_budget = db.query(BudgetModel).filter(BudgetModel.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(db_budget)
    db.commit()
    return {"message": "Budget deleted successfully"}
