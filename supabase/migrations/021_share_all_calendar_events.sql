-- 모든 사용자가 서로의 일정을 조회할 수 있도록 RLS 정책 변경
-- 단, 수정/삭제는 작성자만 가능하도록 유지 (안전성 확보)

-- 1. 기존 SELECT 정책 삭제 (존재하는 경우)
DO $$
BEGIN
  -- "Users can view shared calendar events" 정책 삭제
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_events'
    AND policyname = 'Users can view shared calendar events'
  ) THEN
    DROP POLICY "Users can view shared calendar events" ON calendar_events;
  END IF;

  -- "Users can view own calendar events" 정책 삭제
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_events'
    AND policyname = 'Users can view own calendar events'
  ) THEN
    DROP POLICY "Users can view own calendar events" ON calendar_events;
  END IF;
END $$;

-- 2. 새 SELECT 정책: 모든 인증된 사용자가 모든 calendar_events 조회 가능
CREATE POLICY "All authenticated users can view all calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (true);

-- 참고:
-- - UPDATE/DELETE 정책은 그대로 유지됩니다 (작성자 + Admin만 수정 가능)
-- - 이를 통해 다른 사람의 일정을 볼 수 있지만 수정은 불가능합니다
