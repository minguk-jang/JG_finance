"""add investment transactions table

Revision ID: d1b9a01b924c
Revises: 87801b5af600
Create Date: 2025-10-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1b9a01b924c'
down_revision: Union[str, None] = '87801b5af600'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'investment_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('type', sa.Enum('BUY', 'SELL', name='transactiontype'), nullable=False),
        sa.Column('trade_date', sa.Date(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('fees', sa.Float(), nullable=False, server_default='0'),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['investment_accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_investment_transactions_id'), 'investment_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_investment_transactions_account_id'), 'investment_transactions', ['account_id'], unique=False)
    op.create_index(op.f('ix_investment_transactions_symbol'), 'investment_transactions', ['symbol'], unique=False)
    op.create_index(op.f('ix_investment_transactions_trade_date'), 'investment_transactions', ['trade_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_investment_transactions_trade_date'), table_name='investment_transactions')
    op.drop_index(op.f('ix_investment_transactions_symbol'), table_name='investment_transactions')
    op.drop_index(op.f('ix_investment_transactions_account_id'), table_name='investment_transactions')
    op.drop_index(op.f('ix_investment_transactions_id'), table_name='investment_transactions')
    op.drop_table('investment_transactions')
    op.execute('DROP TYPE IF EXISTS transactiontype')
