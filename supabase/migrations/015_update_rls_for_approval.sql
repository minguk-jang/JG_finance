-- Update RLS policies to require approval status
-- Only approved users can access data (except for viewing their own user profile)

-- ============================================
-- CATEGORIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Approved users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- EXPENSES TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON expenses;

CREATE POLICY "Approved users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- BUDGETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view budgets" ON budgets;
DROP POLICY IF EXISTS "Authenticated users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Authenticated users can update budgets" ON budgets;
DROP POLICY IF EXISTS "Authenticated users can delete budgets" ON budgets;

CREATE POLICY "Approved users can view budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- INVESTMENT ACCOUNTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view investment accounts" ON investment_accounts;
DROP POLICY IF EXISTS "Authenticated users can create investment accounts" ON investment_accounts;
DROP POLICY IF EXISTS "Authenticated users can update investment accounts" ON investment_accounts;
DROP POLICY IF EXISTS "Authenticated users can delete investment accounts" ON investment_accounts;

CREATE POLICY "Approved users can view investment accounts"
  ON investment_accounts FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create investment accounts"
  ON investment_accounts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update investment accounts"
  ON investment_accounts FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete investment accounts"
  ON investment_accounts FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- HOLDINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view holdings" ON holdings;
DROP POLICY IF EXISTS "Authenticated users can create holdings" ON holdings;
DROP POLICY IF EXISTS "Authenticated users can update holdings" ON holdings;
DROP POLICY IF EXISTS "Authenticated users can delete holdings" ON holdings;

CREATE POLICY "Approved users can view holdings"
  ON holdings FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create holdings"
  ON holdings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update holdings"
  ON holdings FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete holdings"
  ON holdings FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- INVESTMENT TRANSACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view investment transactions" ON investment_transactions;
DROP POLICY IF EXISTS "Authenticated users can create investment transactions" ON investment_transactions;
DROP POLICY IF EXISTS "Authenticated users can update investment transactions" ON investment_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete investment transactions" ON investment_transactions;

CREATE POLICY "Approved users can view investment transactions"
  ON investment_transactions FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create investment transactions"
  ON investment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update investment transactions"
  ON investment_transactions FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete investment transactions"
  ON investment_transactions FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- ISSUES TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can create issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can delete issues" ON issues;

CREATE POLICY "Approved users can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete issues"
  ON issues FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- LABELS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view labels" ON labels;
DROP POLICY IF EXISTS "Authenticated users can create labels" ON labels;
DROP POLICY IF EXISTS "Authenticated users can update labels" ON labels;
DROP POLICY IF EXISTS "Authenticated users can delete labels" ON labels;

CREATE POLICY "Approved users can view labels"
  ON labels FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can update labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete labels"
  ON labels FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- ISSUE_LABELS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view issue labels" ON issue_labels;
DROP POLICY IF EXISTS "Authenticated users can create issue labels" ON issue_labels;
DROP POLICY IF EXISTS "Authenticated users can delete issue labels" ON issue_labels;

CREATE POLICY "Approved users can view issue labels"
  ON issue_labels FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create issue labels"
  ON issue_labels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved());

CREATE POLICY "Approved users can delete issue labels"
  ON issue_labels FOR DELETE
  TO authenticated
  USING (public.is_approved());

-- ============================================
-- ISSUE_COMMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all issue comments" ON issue_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON issue_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON issue_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON issue_comments;

CREATE POLICY "Approved users can view issue comments"
  ON issue_comments FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create comments"
  ON issue_comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = user_id);

CREATE POLICY "Approved users can update own comments"
  ON issue_comments FOR UPDATE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = user_id);

CREATE POLICY "Approved users can delete own comments"
  ON issue_comments FOR DELETE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = user_id);

-- ============================================
-- FIXED_COSTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can insert own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can update own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can delete own fixed_costs" ON fixed_costs;

CREATE POLICY "Approved users can view own fixed_costs"
  ON fixed_costs FOR SELECT
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can insert own fixed_costs"
  ON fixed_costs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can update own fixed_costs"
  ON fixed_costs FOR UPDATE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can delete own fixed_costs"
  ON fixed_costs FOR DELETE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

-- ============================================
-- FIXED_COST_PAYMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can insert own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can update own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can delete own fixed_cost_payments" ON fixed_cost_payments;

CREATE POLICY "Approved users can view own fixed_cost_payments"
  ON fixed_cost_payments FOR SELECT
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can insert own fixed_cost_payments"
  ON fixed_cost_payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can update own fixed_cost_payments"
  ON fixed_cost_payments FOR UPDATE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can delete own fixed_cost_payments"
  ON fixed_cost_payments FOR DELETE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

-- ============================================
-- NOTES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Notes are shared - check migration 012_share_notes.sql
CREATE POLICY "Approved users can view all notes"
  ON notes FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

-- ============================================
-- STUDY_SESSIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can create own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;

CREATE POLICY "Approved users can view all study sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can create own study sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can update own study sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

CREATE POLICY "Approved users can delete own study sessions"
  ON study_sessions FOR DELETE
  TO authenticated
  USING (public.is_approved() AND auth.uid() = created_by);

-- ============================================
-- STUDY_REFERENCES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all study references" ON study_references;
DROP POLICY IF EXISTS "Users can insert references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can update references for own sessions" ON study_references;
DROP POLICY IF EXISTS "Users can delete references for own sessions" ON study_references;

CREATE POLICY "Approved users can view all study references"
  ON study_references FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can insert references for own sessions"
  ON study_references FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Approved users can update references for own sessions"
  ON study_references FOR UPDATE
  TO authenticated
  USING (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Approved users can delete references for own sessions"
  ON study_references FOR DELETE
  TO authenticated
  USING (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_references.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

-- ============================================
-- STUDY_FOLLOWUPS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all study followups" ON study_followups;
DROP POLICY IF EXISTS "Users can insert followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can update followups for own sessions" ON study_followups;
DROP POLICY IF EXISTS "Users can delete followups for own sessions" ON study_followups;

CREATE POLICY "Approved users can view all study followups"
  ON study_followups FOR SELECT
  TO authenticated
  USING (public.is_approved());

CREATE POLICY "Approved users can insert followups for own sessions"
  ON study_followups FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Approved users can update followups for own sessions"
  ON study_followups FOR UPDATE
  TO authenticated
  USING (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Approved users can delete followups for own sessions"
  ON study_followups FOR DELETE
  TO authenticated
  USING (
    public.is_approved() AND
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_followups.study_session_id
      AND study_sessions.created_by = auth.uid()
    )
  );

-- ============================================
-- NOTE: users table policies remain unchanged
-- Users can always view their own profile (even if pending)
-- to check their approval status
-- ============================================
