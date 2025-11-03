-- 고정비 및 고정비 납부 내역을 모든 인증 사용자가 공유
-- 고정비는 가계 전체에서 관리하는 항목이므로 모든 사용자가 조회/수정 가능해야 함

-- ============================================
-- Drop existing policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can insert own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can update own fixed_costs" ON fixed_costs;
DROP POLICY IF EXISTS "Users can delete own fixed_costs" ON fixed_costs;

DROP POLICY IF EXISTS "Users can view own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can insert own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can update own fixed_cost_payments" ON fixed_cost_payments;
DROP POLICY IF EXISTS "Users can delete own fixed_cost_payments" ON fixed_cost_payments;

-- ============================================
-- Create new shared policies for fixed_costs
-- ============================================

CREATE POLICY "Authenticated users can view all fixed_costs" ON fixed_costs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert fixed_costs" ON fixed_costs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update all fixed_costs" ON fixed_costs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all fixed_costs" ON fixed_costs
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- Create new shared policies for fixed_cost_payments
-- ============================================

CREATE POLICY "Authenticated users can view all fixed_cost_payments" ON fixed_cost_payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert fixed_cost_payments" ON fixed_cost_payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update all fixed_cost_payments" ON fixed_cost_payments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all fixed_cost_payments" ON fixed_cost_payments
  FOR DELETE USING (auth.role() = 'authenticated');
