BEGIN;

-- ============================================
-- 고정비 공유 정책 (Fixed Costs & Payments)
-- ============================================

-- fixed_costs 테이블: 기존 개인 조회 정책 제거 후 공유 정책 생성
DROP POLICY IF EXISTS "Users can view own fixed_costs" ON fixed_costs;

-- 모든 인증 사용자가 모든 고정비를 조회 가능하게 허용
CREATE POLICY "Users can view shared fixed_costs" ON fixed_costs
  FOR SELECT
  USING (true);

-- fixed_cost_payments 테이블: 기존 개인 조회 정책 제거 후 공유 정책 생성
DROP POLICY IF EXISTS "Users can view own fixed_cost_payments" ON fixed_cost_payments;

-- 모든 인증 사용자가 모든 고정비 납부 내역을 조회 가능하게 허용
CREATE POLICY "Users can view shared fixed_cost_payments" ON fixed_cost_payments
  FOR SELECT
  USING (true);

COMMIT;
