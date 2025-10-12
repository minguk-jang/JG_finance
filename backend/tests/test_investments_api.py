import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.deps import get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
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


def test_create_list_update_delete_transaction(client):
    # Create investment account
    account_resp = client.post(
        "/api/investments/accounts",
        json={"name": "테스트 계좌", "broker": "가상증권"},
    )
    assert account_resp.status_code == 200
    account_id = account_resp.json()["id"]

    # Create transaction
    tx_payload = {
        "account_id": account_id,
        "symbol": "TEST",
        "name": "가상 기업",
        "type": "BUY",
        "trade_date": "2024-01-15",
        "quantity": 10,
        "price": 12345.67,
        "fees": 5.0,
        "memo": "첫 매수",
    }
    create_resp = client.post("/api/investments/transactions", json=tx_payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["symbol"] == "TEST"
    assert created["type"] == "BUY"
    assert created["quantity"] == 10

    tx_id = created["id"]

    # List transactions
    list_resp = client.get("/api/investments/transactions")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == tx_id

    # Update transaction
    update_resp = client.put(
        f"/api/investments/transactions/{tx_id}",
        json={
            "quantity": 12,
            "memo": "수량 조정",
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["quantity"] == 12
    assert updated["memo"] == "수량 조정"

    # Delete transaction
    delete_resp = client.delete(f"/api/investments/transactions/{tx_id}")
    assert delete_resp.status_code == 204

    final_list = client.get("/api/investments/transactions").json()
    assert final_list == []
