from fastapi import APIRouter, HTTPException
from app.schemas.category import Category, CategoryCreate

router = APIRouter()

# Mock data for demonstration
mock_categories = [
    {"id": 1, "name": "Salary", "type": "income"},
    {"id": 2, "name": "Groceries", "type": "expense"},
    {"id": 3, "name": "Housing", "type": "expense"},
    {"id": 4, "name": "Transportation", "type": "expense"},
    {"id": 5, "name": "Entertainment", "type": "expense"},
]


@router.get("", response_model=list[Category], summary="List all categories")
def list_categories():
    """
    Get a list of all income and expense categories.
    """
    return mock_categories


@router.get("/{category_id}", response_model=Category, summary="Get category by ID")
def get_category(category_id: int):
    """
    Get a specific category by its ID.

    - **category_id**: The ID of the category to retrieve
    """
    for category in mock_categories:
        if category["id"] == category_id:
            return category
    raise HTTPException(status_code=404, detail="Category not found")


@router.post("", response_model=Category, status_code=201, summary="Create new category")
def create_category(category: CategoryCreate):
    """
    Create a new category.

    - **name**: Name of the category (e.g., "Groceries", "Salary")
    - **type**: Either "income" or "expense"
    """
    new_category = {
        "id": len(mock_categories) + 1,
        **category.dict()
    }
    mock_categories.append(new_category)
    return new_category
