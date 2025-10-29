import enum
import uuid

from sqlalchemy import Column, Enum, ForeignKey, String, Table, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.types import GUID


class IssueStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


class IssuePriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


# Association table for many-to-many relationship between issues and labels
issue_labels = Table(
    'issue_labels',
    Base.metadata,
    Column('issue_id', GUID(), ForeignKey('issues.id'), primary_key=True),
    Column('label_id', GUID(), ForeignKey('labels.id'), primary_key=True)
)


class Label(Base):
    __tablename__ = "labels"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=False)


class Issue(Base):
    __tablename__ = "issues"

    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.OPEN)
    priority = Column(Enum(IssuePriority), nullable=False, default=IssuePriority.MEDIUM)
    assignee_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)

    # Relationships
    assignee = relationship("User", backref="assigned_issues")
    labels = relationship("Label", secondary=issue_labels, backref="issues")
