from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class IssueStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


class IssuePriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class IssueLabelBase(BaseModel):
    name: str
    color: str


class IssueLabel(IssueLabelBase):
    class Config:
        from_attributes = True


class IssueBase(BaseModel):
    title: str
    body: str
    status: IssueStatus
    priority: IssuePriority
    assignee_id: UUID


class IssueCreate(IssueBase):
    label_ids: Optional[List[UUID]] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    assignee_id: Optional[UUID] = None
    label_ids: Optional[List[UUID]] = None


class Issue(IssueBase):
    id: UUID
    labels: List[IssueLabel]

    class Config:
        from_attributes = True


class LabelCreate(BaseModel):
    name: str
    color: str


class Label(LabelCreate):
    id: UUID

    class Config:
        from_attributes = True
