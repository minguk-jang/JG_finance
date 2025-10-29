"""convert integer ids to uuid

Revision ID: c7f3b1ef4123
Revises: d1b9a01b924c
Create Date: 2025-10-20 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c7f3b1ef4123"
down_revision: Union[str, None] = "d1b9a01b924c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    # --- Categories and dependents ---
    op.add_column("categories", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.add_column("budgets", sa.Column("new_category_id", UUID, nullable=True))
    op.add_column("expenses", sa.Column("new_category_id", UUID, nullable=True))

    op.execute("UPDATE categories SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.execute(
        """
        UPDATE budgets AS b
        SET new_category_id = c.new_id
        FROM categories AS c
        WHERE b.category_id = c.id
        """
    )
    op.execute(
        """
        UPDATE expenses AS e
        SET new_category_id = c.new_id
        FROM categories AS c
        WHERE e.category_id = c.id
        """
    )

    op.drop_constraint("budgets_category_id_fkey", "budgets", type_="foreignkey")
    op.drop_constraint("expenses_category_id_fkey", "expenses", type_="foreignkey")

    op.drop_constraint("categories_pkey", "categories", type_="primary")
    op.drop_index("ix_categories_id", table_name="categories")
    op.drop_column("categories", "id")

    op.alter_column("categories", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE categories ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("categories_pkey", "categories", ["id"])
    op.create_index("ix_categories_id", "categories", ["id"])

    op.drop_column("budgets", "category_id")
    op.alter_column("budgets", "new_category_id", new_column_name="category_id", existing_type=UUID, nullable=False)
    op.create_foreign_key("budgets_category_id_fkey", "budgets", "categories", ["category_id"], ["id"])

    op.drop_column("expenses", "category_id")
    op.alter_column("expenses", "new_category_id", new_column_name="category_id", existing_type=UUID, nullable=False)
    op.create_foreign_key("expenses_category_id_fkey", "expenses", "categories", ["category_id"], ["id"])

    # --- Users and dependents ---
    op.add_column("users", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.add_column("expenses", sa.Column("new_created_by", UUID, nullable=True))
    op.add_column("issues", sa.Column("new_assignee_id", UUID, nullable=True))

    op.execute("UPDATE users SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.execute(
        """
        UPDATE expenses AS e
        SET new_created_by = u.new_id
        FROM users AS u
        WHERE e.created_by = u.id
        """
    )
    op.execute(
        """
        UPDATE issues AS i
        SET new_assignee_id = u.new_id
        FROM users AS u
        WHERE i.assignee_id = u.id
        """
    )

    op.drop_constraint("expenses_created_by_fkey", "expenses", type_="foreignkey")
    op.drop_constraint("issues_assignee_id_fkey", "issues", type_="foreignkey")

    op.drop_constraint("users_pkey", "users", type_="primary")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_column("users", "id")

    op.alter_column("users", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("users_pkey", "users", ["id"])
    op.create_index("ix_users_id", "users", ["id"])

    op.drop_column("expenses", "created_by")
    op.alter_column("expenses", "new_created_by", new_column_name="created_by", existing_type=UUID, nullable=False)
    op.create_foreign_key("expenses_created_by_fkey", "expenses", "users", ["created_by"], ["id"])

    op.drop_column("issues", "assignee_id")
    op.alter_column("issues", "new_assignee_id", new_column_name="assignee_id", existing_type=UUID, nullable=False)
    op.create_foreign_key("issues_assignee_id_fkey", "issues", "users", ["assignee_id"], ["id"])

    # --- Budgets primary key ---
    op.add_column("budgets", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.execute("UPDATE budgets SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.drop_constraint("budgets_pkey", "budgets", type_="primary")
    op.drop_index("ix_budgets_id", table_name="budgets")
    op.drop_column("budgets", "id")

    op.alter_column("budgets", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE budgets ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("budgets_pkey", "budgets", ["id"])
    op.create_index("ix_budgets_id", "budgets", ["id"])

    # --- Expenses primary key ---
    op.add_column("expenses", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.execute("UPDATE expenses SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.drop_constraint("expenses_pkey", "expenses", type_="primary")
    op.drop_index("ix_expenses_id", table_name="expenses")
    op.drop_column("expenses", "id")

    op.alter_column("expenses", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE expenses ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("expenses_pkey", "expenses", ["id"])
    op.create_index("ix_expenses_id", "expenses", ["id"])

    # --- Investment accounts and dependents ---
    op.add_column(
        "investment_accounts",
        sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False),
    )
    op.add_column("holdings", sa.Column("new_account_id", UUID, nullable=True))
    op.add_column("investment_transactions", sa.Column("new_account_id", UUID, nullable=True))

    op.execute("UPDATE investment_accounts SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.execute(
        """
        UPDATE holdings AS h
        SET new_account_id = a.new_id
        FROM investment_accounts AS a
        WHERE h.account_id = a.id
        """
    )
    op.execute(
        """
        UPDATE investment_transactions AS t
        SET new_account_id = a.new_id
        FROM investment_accounts AS a
        WHERE t.account_id = a.id
        """
    )

    op.drop_constraint("holdings_account_id_fkey", "holdings", type_="foreignkey")
    op.drop_constraint("investment_transactions_account_id_fkey", "investment_transactions", type_="foreignkey")
    op.drop_index("ix_investment_transactions_account_id", table_name="investment_transactions")

    op.drop_constraint("investment_accounts_pkey", "investment_accounts", type_="primary")
    op.drop_index("ix_investment_accounts_id", table_name="investment_accounts")
    op.drop_column("investment_accounts", "id")

    op.alter_column("investment_accounts", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE investment_accounts ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("investment_accounts_pkey", "investment_accounts", ["id"])
    op.create_index("ix_investment_accounts_id", "investment_accounts", ["id"])

    op.drop_column("holdings", "account_id")
    op.alter_column("holdings", "new_account_id", new_column_name="account_id", existing_type=UUID, nullable=False)
    op.create_foreign_key("holdings_account_id_fkey", "holdings", "investment_accounts", ["account_id"], ["id"])

    op.drop_column("investment_transactions", "account_id")
    op.alter_column(
        "investment_transactions",
        "new_account_id",
        new_column_name="account_id",
        existing_type=UUID,
        nullable=False,
    )
    op.create_foreign_key(
        "investment_transactions_account_id_fkey",
        "investment_transactions",
        "investment_accounts",
        ["account_id"],
        ["id"],
    )
    op.create_index(
        "ix_investment_transactions_account_id",
        "investment_transactions",
        ["account_id"],
        unique=False,
    )

    # --- Holdings primary key ---
    op.add_column("holdings", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.execute("UPDATE holdings SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.drop_constraint("holdings_pkey", "holdings", type_="primary")
    op.drop_index("ix_holdings_id", table_name="holdings")
    op.drop_column("holdings", "id")

    op.alter_column("holdings", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE holdings ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("holdings_pkey", "holdings", ["id"])
    op.create_index("ix_holdings_id", "holdings", ["id"])

    # --- Investment transactions primary key ---
    op.add_column(
        "investment_transactions",
        sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False),
    )
    op.execute("UPDATE investment_transactions SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.drop_constraint("investment_transactions_pkey", "investment_transactions", type_="primary")
    op.drop_index("ix_investment_transactions_id", table_name="investment_transactions")
    op.drop_column("investment_transactions", "id")

    op.alter_column(
        "investment_transactions",
        "new_id",
        new_column_name="id",
        existing_type=UUID,
        nullable=False,
    )
    op.execute("ALTER TABLE investment_transactions ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("investment_transactions_pkey", "investment_transactions", ["id"])
    op.create_index("ix_investment_transactions_id", "investment_transactions", ["id"])

    # --- Labels, issues, and join table ---
    op.add_column("labels", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.add_column("issues", sa.Column("new_id", UUID, server_default=sa.text("uuid_generate_v4()"), nullable=False))
    op.add_column("issue_labels", sa.Column("new_issue_id", UUID, nullable=True))
    op.add_column("issue_labels", sa.Column("new_label_id", UUID, nullable=True))

    op.execute("UPDATE labels SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.execute("UPDATE issues SET new_id = uuid_generate_v4() WHERE new_id IS NULL")
    op.execute(
        """
        UPDATE issue_labels AS il
        SET new_issue_id = i.new_id
        FROM issues AS i
        WHERE il.issue_id = i.id
        """
    )
    op.execute(
        """
        UPDATE issue_labels AS il
        SET new_label_id = l.new_id
        FROM labels AS l
        WHERE il.label_id = l.id
        """
    )

    op.drop_constraint("issue_labels_issue_id_fkey", "issue_labels", type_="foreignkey")
    op.drop_constraint("issue_labels_label_id_fkey", "issue_labels", type_="foreignkey")
    op.drop_constraint("issue_labels_pkey", "issue_labels", type_="primary")

    op.drop_constraint("issues_pkey", "issues", type_="primary")
    op.drop_index("ix_issues_id", table_name="issues")
    op.drop_column("issues", "id")

    op.alter_column("issues", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE issues ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("issues_pkey", "issues", ["id"])
    op.create_index("ix_issues_id", "issues", ["id"])

    op.drop_constraint("labels_pkey", "labels", type_="primary")
    op.drop_index("ix_labels_id", table_name="labels")
    op.drop_column("labels", "id")

    op.alter_column("labels", "new_id", new_column_name="id", existing_type=UUID, nullable=False)
    op.execute("ALTER TABLE labels ALTER COLUMN id SET DEFAULT uuid_generate_v4()")
    op.create_primary_key("labels_pkey", "labels", ["id"])
    op.create_index("ix_labels_id", "labels", ["id"])

    op.drop_column("issue_labels", "issue_id")
    op.drop_column("issue_labels", "label_id")

    op.alter_column("issue_labels", "new_issue_id", new_column_name="issue_id", existing_type=UUID, nullable=False)
    op.alter_column("issue_labels", "new_label_id", new_column_name="label_id", existing_type=UUID, nullable=False)

    op.create_primary_key("issue_labels_pkey", "issue_labels", ["issue_id", "label_id"])
    op.create_foreign_key("issue_labels_issue_id_fkey", "issue_labels", "issues", ["issue_id"], ["id"])
    op.create_foreign_key("issue_labels_label_id_fkey", "issue_labels", "labels", ["label_id"], ["id"])


def downgrade() -> None:
    raise RuntimeError("Downgrade from UUID identifiers is not supported.")
