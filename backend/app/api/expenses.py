from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate

router = APIRouter()

# Mock data for demonstration
mock_expenses = [
    {
        "id": 1,
        "category_id": 2,
        "date": "2024-07-03",
        "amount": 150000.0,
        "memo": "Weekly groceries",
        "created_by": 1
    },
    {
        "id": 2,
        "category_id": 3,
        "date": "2024-07-05",
        "amount": 1200000.0,
        "memo": "Monthly rent",
        "created_by": 1
    }
]


@router.get("", response_model=list[Expense], summary="List all expenses")
def list_expenses(
    from_date: Optional[date] = Query(None, description="Filter expenses from this date"),
    to_date: Optional[date] = Query(None, description="Filter expenses to this date"),
    category_id: Optional[int] = Query(None, description="Filter by category ID")
):
    """
    Get a list of all expenses with optional filters.

    - **from_date**: Filter expenses starting from this date
    - **to_date**: Filter expenses up to this date
    - **category_id**: Filter by specific category
    """
    # TODO: Implement actual database query with filters
    return mock_expenses


@router.get("/{expense_id}", response_model=Expense, summary="Get expense by ID")
def get_expense(expense_id: int):
    """
    Get a specific expense by its ID.

    - **expense_id**: The ID of the expense to retrieve
    """
    for expense in mock_expenses:
        if expense["id"] == expense_id:
            return expense
    raise HTTPException(status_code=404, detail="Expense not found")


@router.post("", response_model=Expense, status_code=201, summary="Create new expense")
def create_expense(expense: ExpenseCreate):
    """
    Create a new expense.

    - **category_id**: Category ID for this expense
    - **date**: Date of the expense
    - **amount**: Amount in KRW
    - **memo**: Description or note about the expense
    """
    new_expense = {
        "id": len(mock_expenses) + 1,
        **expense.dict(),
        "created_by": 1  # TODO: Get from current user
    }
    mock_expenses.append(new_expense)
    return new_expense


@router.put("/{expense_id}", response_model=Expense, summary="Update expense")
def update_expense(expense_id: int, expense_update: ExpenseUpdate):
    """
    Update an existing expense.

    - **expense_id**: The ID of the expense to update
    - **expense_update**: Fields to update (all optional)
    """
    for i, expense in enumerate(mock_expenses):
        if expense["id"] == expense_id:
            update_data = expense_update.dict(exclude_unset=True)
            mock_expenses[i] = {**expense, **update_data}
            return mock_expenses[i]
    raise HTTPException(status_code=404, detail="Expense not found")


@router.delete("/{expense_id}", status_code=204, summary="Delete expense")
def delete_expense(expense_id: int):
    """
    Delete an expense by ID.

    - **expense_id**: The ID of the expense to delete
    """
    for i, expense in enumerate(mock_expenses):
        if expense["id"] == expense_id:
            mock_expenses.pop(i)
            return
    raise HTTPException(status_code=404, detail="Expense not found")
