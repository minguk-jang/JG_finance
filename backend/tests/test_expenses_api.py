import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.deps import get_db
from app.main import app
from app.models.category import Category, CategoryType
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseUpdate

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_user_and_category(db_session):
    user = User(
        name="Tester",
        email="tester@example.com",
        hashed_password="hashed",
        role=UserRole.ADMIN,
        avatar=None,
    )
    category = Category(
        name="식비",
        type=CategoryType.EXPENSE,
    )
    db_session.add(user)
    db_session.add(category)
    db_session.commit()
    return user, category


def test_create_and_list_expense(client, db_session):
    user, category = seed_user_and_category(db_session)

    response = client.post(
        "/api/expenses",
        json={
            "category_id": str(category.id),
            "date": "2024-07-01",
            "amount": 12000,
            "memo": "점심 식사",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["category_id"] == str(category.id)
    assert created["created_by"] == str(user.id)
    assert created["amount"] == 12000

    list_response = client.get("/api/expenses")
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["memo"] == "점심 식사"


def test_update_expense(client, db_session):
    _, category = seed_user_and_category(db_session)

    create_resp = client.post(
        "/api/expenses",
        json={
            "category_id": str(category.id),
            "date": "2024-07-10",
            "amount": 5000,
            "memo": "지하철",
        },
    )
    expense_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/api/expenses/{expense_id}",
        json={
            "date": "2024-07-11",
            "amount": 6500,
            "memo": "지하철 (왕복)",
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["date"] == "2024-07-11"
    assert updated["amount"] == 6500
    assert updated["memo"] == "지하철 (왕복)"


def test_expense_update_schema_allows_date_string():
    schema = ExpenseUpdate.model_json_schema()
    date_schema = schema["properties"]["date"]
    assert any(
        option.get("type") == "string" and option.get("format") == "date"
        for option in date_schema.get("anyOf", [])
    ), "Expected date field to allow ISO date strings in schema"


def test_delete_expense(client, db_session):
    _, category = seed_user_and_category(db_session)

    create_resp = client.post(
        "/api/expenses",
        json={
            "category_id": str(category.id),
            "date": "2024-07-12",
            "amount": 30000,
            "memo": "장보기",
        },
    )
    expense_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/expenses/{expense_id}")
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/expenses/{expense_id}")
    assert get_resp.status_code == 404
