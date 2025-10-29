from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models.budget import Budget
from app.models.category import Category, CategoryType
from app.models.expense import Expense
from app.models.investment import (
    Holding,
    InvestmentAccount,
    InvestmentTransaction,
    TransactionType,
)
from app.models.issue import Issue, IssuePriority, IssueStatus, Label
from app.models.user import User, UserRole


def upsert_user(session: Session, *, email: str, **kwargs) -> User:
    user = session.query(User).filter(User.email == email).first()
    if user:
        for field, value in kwargs.items():
            setattr(user, field, value)
        return user
    user = User(email=email, **kwargs)
    session.add(user)
    return user


def upsert_category(session: Session, *, name: str, type_: CategoryType) -> Category:
    category = (
        session.query(Category)
        .filter(Category.name == name, Category.type == type_)
        .first()
    )
    if category:
        return category
    category = Category(name=name, type=type_)
    session.add(category)
    return category


def upsert_budget(
    session: Session, *, category_id: UUID, month: str, limit_amount: float
) -> Budget:
    budget = (
        session.query(Budget)
        .filter(Budget.category_id == category_id, Budget.month == month)
        .first()
    )
    if budget:
        budget.limit_amount = limit_amount
        return budget
    budget = Budget(
        category_id=category_id,
        month=month,
        limit_amount=limit_amount,
    )
    session.add(budget)
    return budget


def upsert_account(session: Session, *, name: str, broker: str) -> InvestmentAccount:
    account = (
        session.query(InvestmentAccount)
        .filter(InvestmentAccount.name == name, InvestmentAccount.broker == broker)
        .first()
    )
    if account:
        return account
    account = InvestmentAccount(name=name, broker=broker)
    session.add(account)
    return account


def upsert_holding(
    session: Session,
    *,
    symbol: str,
    account_id: UUID,
    name: str,
    qty: float,
    avg_price: float,
    current_price: float,
) -> Holding:
    holding = (
        session.query(Holding)
        .filter(Holding.symbol == symbol, Holding.account_id == account_id)
        .first()
    )
    if holding:
        holding.name = name
        holding.qty = qty
        holding.avg_price = avg_price
        holding.current_price = current_price
        return holding
    holding = Holding(
        symbol=symbol,
        account_id=account_id,
        name=name,
        qty=qty,
        avg_price=avg_price,
        current_price=current_price,
    )
    session.add(holding)
    return holding


def create_transaction(
    session: Session,
    *,
    account_id: UUID,
    symbol: str,
    name: str,
    type_: TransactionType,
    trade_date: date,
    quantity: float,
    price: float,
    fees: float = 0.0,
    memo: str | None = None,
) -> InvestmentTransaction:
    transaction = InvestmentTransaction(
        account_id=account_id,
        symbol=symbol,
        name=name,
        type=type_,
        trade_date=trade_date,
        quantity=quantity,
        price=price,
        fees=fees,
        memo=memo,
    )
    session.add(transaction)
    return transaction


def upsert_label(session: Session, *, name: str, color: str) -> Label:
    label = session.query(Label).filter(Label.name == name).first()
    if label:
        label.color = color
        return label
    label = Label(name=name, color=color)
    session.add(label)
    return label


def create_issue(
    session: Session,
    *,
    title: str,
    status: IssueStatus,
    priority: IssuePriority,
    assignee_id: UUID,
    body: str,
    label_names: list[str],
):
    issue = session.query(Issue).filter(Issue.title == title).first()
    if issue:
        issue.status = status
        issue.priority = priority
        issue.assignee_id = assignee_id
        issue.body = body
    else:
        issue = Issue(
            title=title,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            body=body,
        )
        session.add(issue)
        session.flush()

    labels = (
        session.query(Label)
        .filter(Label.name.in_(label_names))
        .all()
    )
    issue.labels = labels
    return issue


def create_expense(
    session: Session,
    *,
    category_id: UUID,
    date_: date,
    amount: float,
    memo: str,
    created_by: UUID,
):
    exists = (
        session.query(Expense)
        .filter(
            Expense.category_id == category_id,
            Expense.date == date_,
            Expense.amount == amount,
            Expense.memo == memo,
        )
        .first()
    )
    if exists:
        exists.created_by = created_by
        return exists
    expense = Expense(
        category_id=category_id,
        date=date_,
        amount=amount,
        memo=memo,
        created_by=created_by,
    )
    session.add(expense)
    return expense


def seed():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        # Users
        users = [
            upsert_user(
                session,
                email="hana@family.com",
                name="이하나",
                hashed_password="hashed-secret",
                role=UserRole.ADMIN,
                avatar="https://i.pravatar.cc/150?u=hana",
            ),
            upsert_user(
                session,
                email="minjun@family.com",
                name="박민준",
                hashed_password="hashed-secret",
                role=UserRole.EDITOR,
                avatar="https://i.pravatar.cc/150?u=minjun",
            ),
            upsert_user(
                session,
                email="soyeon@family.com",
                name="김소연",
                hashed_password="hashed-secret",
                role=UserRole.VIEWER,
                avatar="https://i.pravatar.cc/150?u=soyeon",
            ),
        ]
        session.flush()

        # Categories
        income_categories = [
            upsert_category(session, name="월급", type_=CategoryType.INCOME),
            upsert_category(session, name="프리랜서 수입", type_=CategoryType.INCOME),
            upsert_category(session, name="배당금", type_=CategoryType.INCOME),
        ]
        expense_categories = [
            upsert_category(session, name="식비", type_=CategoryType.EXPENSE),
            upsert_category(session, name="주거", type_=CategoryType.EXPENSE),
            upsert_category(session, name="교통", type_=CategoryType.EXPENSE),
        ]
        session.flush()

        # Budgets (2025-01 기준)
        upsert_budget(
            session,
            category_id=expense_categories[0].id,
            month="2025-01",
            limit_amount=600_000,
        )
        upsert_budget(
            session,
            category_id=expense_categories[1].id,
            month="2025-01",
            limit_amount=1_200_000,
        )
        upsert_budget(
            session,
            category_id=expense_categories[2].id,
            month="2025-01",
            limit_amount=250_000,
        )

        session.flush()

        # Expenses (지출)
        create_expense(
            session,
            category_id=expense_categories[0].id,
            date_=date(2025, 1, 5),
            amount=85_000,
            memo="주말 장보기 + 간식",
            created_by=users[0].id,
        )
        create_expense(
            session,
            category_id=expense_categories[1].id,
            date_=date(2025, 1, 2),
            amount=1_180_000,
            memo="1월 전세 대출 이자",
            created_by=users[1].id,
        )
        create_expense(
            session,
            category_id=expense_categories[2].id,
            date_=date(2025, 1, 3),
            amount=48_000,
            memo="지하철/버스 교통카드 충전",
            created_by=users[2].id,
        )

        # Incomes (수익)
        create_expense(
            session,
            category_id=income_categories[0].id,
            date_=date(2025, 1, 1),
            amount=4_200_000,
            memo="회사 월급",
            created_by=users[0].id,
        )
        create_expense(
            session,
            category_id=income_categories[1].id,
            date_=date(2025, 1, 12),
            amount=950_000,
            memo="앱 디자인 프리랜서 작업",
            created_by=users[1].id,
        )
        create_expense(
            session,
            category_id=income_categories[2].id,
            date_=date(2025, 1, 15),
            amount=180_000,
            memo="ETF 분기 배당",
            created_by=users[0].id,
        )

        session.flush()

        # Investment accounts & holdings
        accounts = [
            upsert_account(session, name="국내 주식", broker="키움증권"),
            upsert_account(session, name="미국 주식", broker="미래에셋"),
            upsert_account(session, name="연금저축", broker="삼성증권"),
        ]
        session.flush()

        upsert_holding(
            session,
            symbol="005930.KS",
            account_id=accounts[0].id,
            name="삼성전자",
            qty=25,
            avg_price=68_500,
            current_price=72_300,
        )
        upsert_holding(
            session,
            symbol="TSLA",
            account_id=accounts[1].id,
            name="Tesla Inc.",
            qty=8,
            avg_price=220 * 1_350,
            current_price=235 * 1_350,
        )
        upsert_holding(
            session,
            symbol="KOR_ETF",
            account_id=accounts[2].id,
            name="국내 배당 ETF",
            qty=120,
            avg_price=10_500,
            current_price=11_200,
        )

        # Investment transactions
        create_transaction(
            session,
            account_id=accounts[0].id,
            symbol="005930.KS",
            name="삼성전자",
            type_=TransactionType.BUY,
            trade_date=date(2024, 1, 5),
            quantity=10,
            price=70_000,
            memo="신년 매수",
        )
        create_transaction(
            session,
            account_id=accounts[0].id,
            symbol="005930.KS",
            name="삼성전자",
            type_=TransactionType.SELL,
            trade_date=date(2024, 3, 18),
            quantity=5,
            price=74_500,
            memo="일부 차익 실현",
        )
        create_transaction(
            session,
            account_id=accounts[1].id,
            symbol="TSLA",
            name="Tesla Inc.",
            type_=TransactionType.BUY,
            trade_date=date(2024, 2, 24),
            quantity=3,
            price=210 * 1_350,
        )
        create_transaction(
            session,
            account_id=accounts[1].id,
            symbol="AAPL",
            name="Apple Inc.",
            type_=TransactionType.BUY,
            trade_date=date(2024, 5, 11),
            quantity=4,
            price=190 * 1_350,
        )
        create_transaction(
            session,
            account_id=accounts[2].id,
            symbol="KOR_ETF",
            name="국내 배당 ETF",
            type_=TransactionType.BUY,
            trade_date=date(2024, 6, 3),
            quantity=60,
            price=10_700,
        )

        # Labels
        labels = [
            upsert_label(session, name="Budgeting", color="bg-blue-500"),
            upsert_label(session, name="Investing", color="bg-green-500"),
            upsert_label(session, name="Planning", color="bg-purple-500"),
        ]
        session.flush()

        # Issues
        create_issue(
            session,
            title="1월 가계부 정리",
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.HIGH,
            assignee_id=users[0].id,
            body="1월 수입/지출 검토 후 예산 대비 분석 보고서를 작성하세요.",
            label_names=[labels[0].name, labels[2].name],
        )
        create_issue(
            session,
            title="해외 주식 포트폴리오 리밸런싱",
            status=IssueStatus.OPEN,
            priority=IssuePriority.MEDIUM,
            assignee_id=users[1].id,
            body="미국 주식 비중이 45%를 넘어 조정이 필요합니다. 잉여 현금 계획을 포함해 주세요.",
            label_names=[labels[1].name],
        )
        create_issue(
            session,
            title="봄 여행 예산 수립",
            status=IssueStatus.OPEN,
            priority=IssuePriority.LOW,
            assignee_id=users[2].id,
            body="4월 가족 여행을 위한 교통/숙박/식비 예산안을 작성해 공유해주세요.",
            label_names=[labels[0].name, labels[2].name],
        )

        session.commit()
        print("✅ Sample data seeded successfully.")
    except Exception as exc:  # pragma: no cover - CLI feedback
        session.rollback()
        print(f"❌ Failed to seed sample data: {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
