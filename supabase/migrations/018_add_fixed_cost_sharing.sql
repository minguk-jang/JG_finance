-- Fixed Costs 테이블에 공유 및 색상 필드 추가
ALTER TABLE fixed_costs
ADD COLUMN is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN color_override TEXT;

-- 인덱스 추가 (공유된 고정비 조회 최적화)
CREATE INDEX idx_fixed_costs_is_shared ON fixed_costs(is_shared) WHERE is_shared = TRUE;

-- 기존 RLS 정책 확인 및 공유 이벤트 조회 정책 추가
-- (기존 RLS 정책은 유지)

-- 모든 사용자가 공유된 고정비 조회 가능
CREATE POLICY "Users can view shared fixed costs"
  ON fixed_costs FOR SELECT
  USING (is_shared = TRUE);
