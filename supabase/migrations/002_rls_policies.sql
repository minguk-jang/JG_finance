-- Row Level Security (RLS) Policies for JG Finance
-- Run this SQL in your Supabase SQL Editor after running 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view all users (for assignee dropdowns, etc.)
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for first-time setup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CATEGORIES TABLE POLICIES
-- ============================================

-- All authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create categories (implement role check if needed)
CREATE POLICY "Authenticated users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update categories
CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete categories
CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- EXPENSES TABLE POLICIES
-- ============================================

-- Users can view all expenses
CREATE POLICY "Authenticated users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

-- Users can create expenses
CREATE POLICY "Authenticated users can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update all expenses (or restrict to own: auth.uid() = created_by)
CREATE POLICY "Authenticated users can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Users can delete all expenses (or restrict to own: auth.uid() = created_by)
CREATE POLICY "Authenticated users can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- BUDGETS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- INVESTMENT ACCOUNTS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view investment accounts"
  ON investment_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create investment accounts"
  ON investment_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update investment accounts"
  ON investment_accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete investment accounts"
  ON investment_accounts FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- HOLDINGS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view holdings"
  ON holdings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create holdings"
  ON holdings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update holdings"
  ON holdings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete holdings"
  ON holdings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- INVESTMENT TRANSACTIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view investment transactions"
  ON investment_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create investment transactions"
  ON investment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update investment transactions"
  ON investment_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete investment transactions"
  ON investment_transactions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ISSUES TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete issues"
  ON issues FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- LABELS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view labels"
  ON labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete labels"
  ON labels FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ISSUE_LABELS TABLE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view issue labels"
  ON issue_labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create issue labels"
  ON issue_labels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete issue labels"
  ON issue_labels FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- OPTIONAL: Create function to handle new user signup
-- ============================================

-- This function automatically creates a user profile when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'Viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
