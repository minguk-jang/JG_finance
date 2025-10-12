from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User as UserModel
from app.models.expense import Expense as ExpenseModel
from app.models.issue import Issue as IssueModel
from app.schemas.user import User, UserCreate, UserUpdate

router = APIRouter()


@router.get("", response_model=List[User])
def get_users(db: Session = Depends(get_db)):
    """Get all users"""
    return db.query(UserModel).all()


@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if email already exists
    existing = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed_password = get_password_hash(user.password)

    # Create user
    db_user = UserModel(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        avatar=user.avatar,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """Update an existing user"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields if provided
    update_data = user.model_dump(exclude_unset=True)

    # Hash password if provided
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    fallback_user = (
        db.query(UserModel)
        .filter(UserModel.id != user_id)
        .order_by(UserModel.id.asc())
        .first()
    )

    reassignment_needed = False

    expenses_to_reassign = (
        db.query(ExpenseModel.id)
        .filter(ExpenseModel.created_by == user_id)
        .first()
    )
    if expenses_to_reassign:
        reassignment_needed = True

    issues_to_reassign = (
        db.query(IssueModel.id)
        .filter(IssueModel.assignee_id == user_id)
        .first()
    )
    if issues_to_reassign:
        reassignment_needed = True

    if reassignment_needed and not fallback_user:
        raise HTTPException(
            status_code=400,
            detail="해당 구성원은 다른 데이터에서 사용 중입니다. 다른 구성원을 만든 뒤 다시 삭제하거나 관련 기록을 삭제해주세요."
        )

    if fallback_user:
        fallback_id = fallback_user.id
        if expenses_to_reassign:
            db.query(ExpenseModel).filter(ExpenseModel.created_by == user_id).update(
                {ExpenseModel.created_by: fallback_id},
                synchronize_session=False
            )
        if issues_to_reassign:
            db.query(IssueModel).filter(IssueModel.assignee_id == user_id).update(
                {IssueModel.assignee_id: fallback_id},
                synchronize_session=False
            )

    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}
