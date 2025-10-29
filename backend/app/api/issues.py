from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.issue import Issue as IssueModel, Label as LabelModel, IssueStatus
from app.schemas.issue import Issue, IssueCreate, IssueUpdate, Label, LabelCreate

router = APIRouter()


# Label endpoints
@router.get("/labels", response_model=List[Label])
def get_labels(db: Session = Depends(get_db)):
    """Get all labels"""
    return db.query(LabelModel).all()


@router.post("/labels", response_model=Label)
def create_label(label: LabelCreate, db: Session = Depends(get_db)):
    """Create a new label"""
    # Check if label already exists
    existing = db.query(LabelModel).filter(LabelModel.name == label.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Label already exists")

    db_label = LabelModel(**label.model_dump())
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


# Issue endpoints
@router.get("", response_model=List[Issue])
def get_issues(
    status: Optional[IssueStatus] = None,
    assignee_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Get all issues with optional filters"""
    query = db.query(IssueModel)

    if status:
        query = query.filter(IssueModel.status == status)
    if assignee_id:
        query = query.filter(IssueModel.assignee_id == assignee_id)

    return query.all()


@router.get("/{issue_id}", response_model=Issue)
def get_issue(issue_id: UUID, db: Session = Depends(get_db)):
    """Get a specific issue by ID"""
    issue = db.query(IssueModel).filter(IssueModel.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.post("", response_model=Issue)
def create_issue(issue: IssueCreate, db: Session = Depends(get_db)):
    """Create a new issue"""
    # Create issue without labels first
    issue_data = issue.model_dump(exclude={'label_ids'})
    db_issue = IssueModel(**issue_data)

    # Add labels if provided
    if issue.label_ids:
        labels = db.query(LabelModel).filter(LabelModel.id.in_(issue.label_ids)).all()
        db_issue.labels = labels

    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    return db_issue


@router.put("/{issue_id}", response_model=Issue)
def update_issue(issue_id: UUID, issue: IssueUpdate, db: Session = Depends(get_db)):
    """Update an existing issue"""
    db_issue = db.query(IssueModel).filter(IssueModel.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Update fields if provided
    update_data = issue.model_dump(exclude_unset=True, exclude={'label_ids'})
    for field, value in update_data.items():
        setattr(db_issue, field, value)

    # Update labels if provided
    if issue.label_ids is not None:
        labels = db.query(LabelModel).filter(LabelModel.id.in_(issue.label_ids)).all()
        db_issue.labels = labels

    db.commit()
    db.refresh(db_issue)
    return db_issue


@router.delete("/{issue_id}")
def delete_issue(issue_id: UUID, db: Session = Depends(get_db)):
    """Delete an issue"""
    db_issue = db.query(IssueModel).filter(IssueModel.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    db.delete(db_issue)
    db.commit()
    return {"message": "Issue deleted successfully"}
