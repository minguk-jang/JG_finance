from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, Table
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class IssueStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


# Association table for many-to-many relationship between issues and labels
issue_labels = Table(
    'issue_labels',
    Base.metadata,
    Column('issue_id', Integer, ForeignKey('issues.id'), primary_key=True),
    Column('label_id', Integer, ForeignKey('labels.id'), primary_key=True)
)


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=False)


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.OPEN)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)

    # Relationships
    assignee = relationship("User", backref="assigned_issues")
    labels = relationship("Label", secondary=issue_labels, backref="issues")
