from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.investment import (
    Holding,
    InvestmentAccount,
    InvestmentTransaction,
    TransactionType,
)
from app.schemas.investment import (
    Holding as HoldingSchema,
    HoldingCreate,
    HoldingUpdate,
    InvestmentAccount as InvestmentAccountSchema,
    InvestmentAccountCreate,
    InvestmentAccountUpdate,
    InvestmentTransaction as InvestmentTransactionSchema,
    InvestmentTransactionCreate,
    InvestmentTransactionUpdate,
)

router = APIRouter()


# ========== Holdings Endpoints ==========

@router.get("/holdings", response_model=List[HoldingSchema])
def get_holdings(db: Session = Depends(get_db)):
    """Get all holdings"""
    return db.query(Holding).all()


@router.get("/holdings/{holding_id}", response_model=HoldingSchema)
def get_holding(holding_id: UUID, db: Session = Depends(get_db)):
    """Get a specific holding by ID"""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return holding


@router.post("/holdings", response_model=HoldingSchema)
def create_holding(holding: HoldingCreate, db: Session = Depends(get_db)):
    """Create a new holding"""
    account = db.query(InvestmentAccount).filter(InvestmentAccount.id == holding.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Investment account not found")

    db_holding = Holding(**holding.model_dump())
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    return db_holding


@router.put("/holdings/{holding_id}", response_model=HoldingSchema)
def update_holding(holding_id: UUID, holding: HoldingUpdate, db: Session = Depends(get_db)):
    """Update a holding"""
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    update_data = holding.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holding, key, value)

    db.commit()
    db.refresh(db_holding)
    return db_holding


@router.delete("/holdings/{holding_id}")
def delete_holding(holding_id: UUID, db: Session = Depends(get_db)):
    """Delete a holding"""
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    db.delete(db_holding)
    db.commit()
    return {"message": "Holding deleted successfully"}


# ========== Investment Accounts Endpoints ==========

@router.get("/accounts", response_model=List[InvestmentAccountSchema])
def get_accounts(db: Session = Depends(get_db)):
    """Get all investment accounts"""
    return db.query(InvestmentAccount).all()


@router.get("/accounts/{account_id}", response_model=InvestmentAccountSchema)
def get_account(account_id: UUID, db: Session = Depends(get_db)):
    """Get a specific investment account by ID"""
    account = db.query(InvestmentAccount).filter(InvestmentAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Investment account not found")
    return account


@router.post("/accounts", response_model=InvestmentAccountSchema)
def create_account(account: InvestmentAccountCreate, db: Session = Depends(get_db)):
    """Create a new investment account"""
    db_account = InvestmentAccount(**account.model_dump())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.put("/accounts/{account_id}", response_model=InvestmentAccountSchema)
def update_account(account_id: UUID, account: InvestmentAccountUpdate, db: Session = Depends(get_db)):
    """Update an investment account"""
    db_account = db.query(InvestmentAccount).filter(InvestmentAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Investment account not found")

    update_data = account.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_account, key, value)

    db.commit()
    db.refresh(db_account)
    return db_account


@router.delete("/accounts/{account_id}")
def delete_account(account_id: UUID, db: Session = Depends(get_db)):
    """Delete an investment account"""
    db_account = db.query(InvestmentAccount).filter(InvestmentAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Investment account not found")

    holdings_count = db.query(Holding).filter(Holding.account_id == account_id).count()
    if holdings_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete account with {holdings_count} holdings. Delete holdings first."
        )

    db.delete(db_account)
    db.commit()
    return {"message": "Investment account deleted successfully"}


# ========== Investment Transactions Endpoints ==========

@router.get("/transactions", response_model=List[InvestmentTransactionSchema])
def list_transactions(
    db: Session = Depends(get_db),
    account_id: Optional[UUID] = None,
    symbol: Optional[str] = None,
    type: Optional[TransactionType] = Query(None, alias="transaction_type"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """List investment transactions with optional filters"""
    query = db.query(InvestmentTransaction)

    if account_id is not None:
        query = query.filter(InvestmentTransaction.account_id == account_id)
    if symbol:
        query = query.filter(InvestmentTransaction.symbol == symbol)
    if type is not None:
        query = query.filter(InvestmentTransaction.type == type)
    if start_date is not None:
        query = query.filter(InvestmentTransaction.trade_date >= start_date)
    if end_date is not None:
        query = query.filter(InvestmentTransaction.trade_date <= end_date)

    return query.order_by(
        InvestmentTransaction.trade_date.desc(),
        InvestmentTransaction.id.desc(),
    ).all()


@router.get("/transactions/{transaction_id}", response_model=InvestmentTransactionSchema)
def get_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    """Get a specific investment transaction"""
    transaction = (
        db.query(InvestmentTransaction)
        .filter(InvestmentTransaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Investment transaction not found")
    return transaction


@router.post("/transactions", response_model=InvestmentTransactionSchema, status_code=201)
def create_transaction(payload: InvestmentTransactionCreate, db: Session = Depends(get_db)):
    """Create a new investment transaction"""
    account = db.query(InvestmentAccount).filter(InvestmentAccount.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Investment account not found")

    transaction = InvestmentTransaction(**payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/transactions/{transaction_id}", response_model=InvestmentTransactionSchema)
def update_transaction(
    transaction_id: UUID,
    payload: InvestmentTransactionUpdate,
    db: Session = Depends(get_db),
):
    """Update an investment transaction"""
    transaction = (
        db.query(InvestmentTransaction)
        .filter(InvestmentTransaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Investment transaction not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "account_id" in update_data:
        account = db.query(InvestmentAccount).filter(InvestmentAccount.id == update_data["account_id"]).first()
        if not account:
            raise HTTPException(status_code=404, detail="Investment account not found")

    for key, value in update_data.items():
        setattr(transaction, key, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    """Delete an investment transaction"""
    transaction = (
        db.query(InvestmentTransaction)
        .filter(InvestmentTransaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Investment transaction not found")

    db.delete(transaction)
    db.commit()
    return None
