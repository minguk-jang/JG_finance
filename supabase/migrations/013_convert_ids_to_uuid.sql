-- Migrate integer identifiers to UUID across all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Categories and dependent foreign keys
-- ============================================

ALTER TABLE IF EXISTS fixed_costs DROP CONSTRAINT IF EXISTS fixed_costs_category_id_fkey;
ALTER TABLE IF EXISTS budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;
ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;

ALTER TABLE budgets
  ALTER COLUMN category_id TYPE uuid
  USING uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, category_id::text);
ALTER TABLE expenses
  ALTER COLUMN category_id TYPE uuid
  USING uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, category_id::text);
ALTER TABLE fixed_costs
  ALTER COLUMN category_id TYPE uuid
  USING uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, category_id::text);

ALTER TABLE categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE categories
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, id::text);
ALTER TABLE categories ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE budgets
  ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE expenses
  ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE fixed_costs
  ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE fixed_costs
  ADD CONSTRAINT fixed_costs_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

DROP SEQUENCE IF EXISTS categories_id_seq;

-- ============================================
-- Budgets primary key
-- ============================================

ALTER TABLE budgets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE budgets
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('22222222-2222-2222-2222-222222222222'::uuid, id::text);
ALTER TABLE budgets ALTER COLUMN id SET DEFAULT uuid_generate_v4();
DROP SEQUENCE IF EXISTS budgets_id_seq;

-- ============================================
-- Expenses primary key and dependent foreign keys
-- ============================================

ALTER TABLE fixed_cost_payments DROP CONSTRAINT IF EXISTS fixed_cost_payments_expense_id_fkey;

ALTER TABLE fixed_cost_payments
  ALTER COLUMN expense_id TYPE uuid
  USING CASE
    WHEN expense_id IS NULL THEN NULL
    ELSE uuid_generate_v5('33333333-3333-3333-3333-333333333333'::uuid, expense_id::text)
  END;

ALTER TABLE expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE expenses
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('33333333-3333-3333-3333-333333333333'::uuid, id::text);
ALTER TABLE expenses ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE fixed_cost_payments
  ADD CONSTRAINT fixed_cost_payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

DROP SEQUENCE IF EXISTS expenses_id_seq;

-- ============================================
-- Investment accounts, holdings, and transactions
-- ============================================

ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_account_id_fkey;
ALTER TABLE investment_transactions DROP CONSTRAINT IF EXISTS investment_transactions_account_id_fkey;

ALTER TABLE holdings
  ALTER COLUMN account_id TYPE uuid
  USING uuid_generate_v5('44444444-4444-4444-4444-444444444444'::uuid, account_id::text);
ALTER TABLE investment_transactions
  ALTER COLUMN account_id TYPE uuid
  USING uuid_generate_v5('44444444-4444-4444-4444-444444444444'::uuid, account_id::text);

ALTER TABLE investment_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE investment_accounts
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('44444444-4444-4444-4444-444444444444'::uuid, id::text);
ALTER TABLE investment_accounts ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE holdings
  ADD CONSTRAINT holdings_account_id_fkey FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE CASCADE;
ALTER TABLE investment_transactions
  ADD CONSTRAINT investment_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE CASCADE;

ALTER TABLE holdings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE holdings
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('55555555-5555-5555-5555-555555555555'::uuid, id::text);
ALTER TABLE holdings ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE investment_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE investment_transactions
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('66666666-6666-6666-6666-666666666666'::uuid, id::text);
ALTER TABLE investment_transactions ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP SEQUENCE IF EXISTS investment_accounts_id_seq;
DROP SEQUENCE IF EXISTS holdings_id_seq;
DROP SEQUENCE IF EXISTS investment_transactions_id_seq;

-- ============================================
-- Labels, issues, and related tables
-- ============================================

ALTER TABLE issue_labels DROP CONSTRAINT IF EXISTS issue_labels_pkey;
ALTER TABLE issue_labels DROP CONSTRAINT IF EXISTS issue_labels_issue_id_fkey;
ALTER TABLE issue_labels DROP CONSTRAINT IF EXISTS issue_labels_label_id_fkey;
ALTER TABLE issue_comments DROP CONSTRAINT IF EXISTS issue_comments_issue_id_fkey;

ALTER TABLE issue_labels
  ALTER COLUMN issue_id TYPE uuid
  USING uuid_generate_v5('88888888-8888-8888-8888-888888888888'::uuid, issue_id::text);
ALTER TABLE issue_labels
  ALTER COLUMN label_id TYPE uuid
  USING uuid_generate_v5('77777777-7777-7777-7777-777777777777'::uuid, label_id::text);
ALTER TABLE issue_comments
  ALTER COLUMN issue_id TYPE uuid
  USING uuid_generate_v5('88888888-8888-8888-8888-888888888888'::uuid, issue_id::text);

ALTER TABLE issues ALTER COLUMN id DROP DEFAULT;
ALTER TABLE issues
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('88888888-8888-8888-8888-888888888888'::uuid, id::text);
ALTER TABLE issues ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE labels ALTER COLUMN id DROP DEFAULT;
ALTER TABLE labels
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('77777777-7777-7777-7777-777777777777'::uuid, id::text);
ALTER TABLE labels ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE issue_labels
  ADD CONSTRAINT issue_labels_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE;
ALTER TABLE issue_labels
  ADD CONSTRAINT issue_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE;
ALTER TABLE issue_comments
  ADD CONSTRAINT issue_comments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE;
ALTER TABLE issue_labels
  ADD CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id);

ALTER TABLE issue_comments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE issue_comments
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, id::text);
ALTER TABLE issue_comments ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP SEQUENCE IF EXISTS labels_id_seq;
DROP SEQUENCE IF EXISTS issues_id_seq;
DROP SEQUENCE IF EXISTS issue_comments_id_seq;

-- ============================================
-- Fixed costs tables
-- ============================================

ALTER TABLE fixed_cost_payments DROP CONSTRAINT IF EXISTS fixed_cost_payments_fixed_cost_id_fkey;

ALTER TABLE fixed_cost_payments
  ALTER COLUMN fixed_cost_id TYPE uuid
  USING uuid_generate_v5('99999999-9999-9999-9999-999999999999'::uuid, fixed_cost_id::text);

ALTER TABLE fixed_costs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE fixed_costs
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('99999999-9999-9999-9999-999999999999'::uuid, id::text);
ALTER TABLE fixed_costs ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE fixed_cost_payments
  ADD CONSTRAINT fixed_cost_payments_fixed_cost_id_fkey FOREIGN KEY (fixed_cost_id) REFERENCES fixed_costs(id) ON DELETE CASCADE;

ALTER TABLE fixed_cost_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE fixed_cost_payments
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, id::text);
ALTER TABLE fixed_cost_payments ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP SEQUENCE IF EXISTS fixed_costs_id_seq;
DROP SEQUENCE IF EXISTS fixed_cost_payments_id_seq;

-- ============================================
-- Notes table
-- ============================================

ALTER TABLE notes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE notes
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, id::text);
ALTER TABLE notes ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP SEQUENCE IF EXISTS notes_id_seq;

-- ============================================
-- Study session tables
-- ============================================

-- Drop RLS policies first (they prevent column type changes)
DROP POLICY IF EXISTS "Users can insert references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can update references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can delete references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Approved users can insert references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Approved users can update references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Approved users can delete references for own sessions" ON study_references;

DROP POLICY IF EXISTS "Users can insert followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can update followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can delete followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Approved users can insert followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Approved users can update followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Approved users can delete followups for own sessions" ON study_followups;

-- Drop foreign key constraints
ALTER TABLE study_references DROP CONSTRAINT IF EXISTS study_references_study_session_id_fkey;
ALTER TABLE study_followups DROP CONSTRAINT IF EXISTS study_followups_study_session_id_fkey;

-- Change column types
ALTER TABLE study_references
  ALTER COLUMN study_session_id TYPE uuid
  USING uuid_generate_v5('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, study_session_id::text);
ALTER TABLE study_followups
  ALTER COLUMN study_session_id TYPE uuid
  USING uuid_generate_v5('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, study_session_id::text);

ALTER TABLE study_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE study_sessions
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, id::text);
ALTER TABLE study_sessions ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE study_references
  ADD CONSTRAINT study_references_study_session_id_fkey FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE;
ALTER TABLE study_followups
  ADD CONSTRAINT study_followups_study_session_id_fkey FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE;

ALTER TABLE study_references ALTER COLUMN id DROP DEFAULT;
ALTER TABLE study_references
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, id::text);
ALTER TABLE study_references ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE study_followups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE study_followups
  ALTER COLUMN id TYPE uuid
  USING uuid_generate_v5('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, id::text);
ALTER TABLE study_followups ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP SEQUENCE IF EXISTS study_sessions_id_seq;
DROP SEQUENCE IF EXISTS study_references_id_seq;
DROP SEQUENCE IF EXISTS study_followups_id_seq;

-- ============================================
-- Recreate RLS policies for study_references
-- ============================================

-- Ensure policies are dropped before recreating
DROP POLICY IF EXISTS "Users can view all study references" ON study_references;
DROP POLICY IF EXISTS "Users can insert references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can update references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can delete references for own sessions" ON study_references;

CREATE POLICY "Users can view all study references"
  ON study_references FOR SELECT
  USING (true);

CREATE POLICY "Users can insert references for own sessions"
  ON study_references FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update references for own sessions"
  ON study_references FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete references for own sessions"
  ON study_references FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

-- ============================================
-- Recreate RLS policies for study_followups
-- ============================================

DROP POLICY IF EXISTS "Users can view all study followups" ON study_followups;
DROP POLICY IF EXISTS "Users can insert followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can update followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can delete followups for own sessions" ON study_followups;

CREATE POLICY "Users can view all study followups"
  ON study_followups FOR SELECT
  USING (true);

CREATE POLICY "Users can insert followups for own sessions"
  ON study_followups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update followups for own sessions"
  ON study_followups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete followups for own sessions"
  ON study_followups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );
