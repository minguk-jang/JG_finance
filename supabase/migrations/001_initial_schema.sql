-- JG Finance Database Schema Migration for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('Admin', 'Editor', 'Viewer');
CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_type AS ENUM ('BUY', 'SELL');
CREATE TYPE issue_status AS ENUM ('Open', 'In Progress', 'Closed');
CREATE TYPE issue_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'Viewer',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  memo TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for expenses
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- Budgets table
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  limit_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for budgets
CREATE INDEX idx_budgets_month ON budgets(month);
CREATE UNIQUE INDEX idx_budgets_category_month ON budgets(category_id, month);

-- Investment Accounts table
CREATE TABLE investment_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  broker TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings table
CREATE TABLE holdings (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  qty NUMERIC(12, 4) NOT NULL,
  avg_price NUMERIC(12, 2) NOT NULL,
  current_price NUMERIC(12, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for holdings
CREATE INDEX idx_holdings_account ON holdings(account_id);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);

-- Investment Transactions table
CREATE TABLE investment_transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  type transaction_type NOT NULL,
  trade_date DATE NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  fees NUMERIC(12, 2) NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for investment_transactions
CREATE INDEX idx_inv_trans_account ON investment_transactions(account_id);
CREATE INDEX idx_inv_trans_symbol ON investment_transactions(symbol);
CREATE INDEX idx_inv_trans_date ON investment_transactions(trade_date);

-- Labels table
CREATE TABLE labels (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'Open',
  priority issue_priority NOT NULL DEFAULT 'Medium',
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for issues
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);

-- Issue-Label junction table (many-to-many)
CREATE TABLE issue_labels (
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, type) VALUES
  ('급여', 'income'),
  ('사업수입', 'income'),
  ('이자배당', 'income'),
  ('기타수입', 'income'),
  ('식비', 'expense'),
  ('교통비', 'expense'),
  ('주거비', 'expense'),
  ('의료비', 'expense'),
  ('문화생활', 'expense'),
  ('쇼핑', 'expense'),
  ('기타지출', 'expense');
