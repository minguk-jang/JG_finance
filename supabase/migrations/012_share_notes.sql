BEGIN;

-- 기존 개인 노트 조회 정책 제거
DROP POLICY IF EXISTS "Users can view own notes" ON notes;

-- 모든 인증 사용자가 모든 노트를 조회 가능하게 허용
CREATE POLICY "Users can view shared notes" ON notes
  FOR SELECT
  USING (true);

COMMIT;
