-- Calendar Events 테이블 생성
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  -- 날짜/시간: TIMESTAMP WITH TIME ZONE 사용 (타임존 정보 포함)
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  -- 반복 규칙: RFC 5545 RRULE 형식 (예: "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  recurrence_rule TEXT,
  -- 리마인더: JSON 배열 형식
  -- [
  --   { type: 'notification', minutes_before: 15, method: 'in_app' | 'email' },
  --   { type: 'notification', minutes_before: 60, method: 'push' }
  -- ]
  reminders JSONB DEFAULT '[]'::jsonb,
  -- 공유 여부
  is_shared BOOLEAN DEFAULT FALSE,
  -- 색상 커스터마이징 (기본값 없음 = 사용자 선호도 색상 사용)
  color_override TEXT,
  -- 메타데이터
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Calendar Preferences 테이블 생성
CREATE TABLE user_calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- 기본 캘린더 색상 (Hermès 팔레트 key 또는 커스텀 hex)
  color_hex TEXT DEFAULT '#0ea5e9',
  palette_key TEXT DEFAULT 'sky',  -- 'sky', 'coral', 'orange', 'tan', 'amber', 'dark' 등
  -- 기본 리마인더 설정
  reminders_default JSONB DEFAULT '[{"type":"notification","minutes_before":15,"method":"in_app"}]'::jsonb,
  -- 타임존 설정 (기본값: Asia/Seoul)
  timezone TEXT DEFAULT 'Asia/Seoul',
  -- 주의 시작 요일 (0=Sunday, 1=Monday)
  week_starts_on INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_preferences ENABLE ROW LEVEL SECURITY;

-- Calendar Events RLS 정책
-- 모든 사용자가 공유된 이벤트 조회 가능
CREATE POLICY "Users can view shared calendar events"
  ON calendar_events FOR SELECT
  USING (is_shared = TRUE);

-- 자신의 이벤트는 모두 조회 가능
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = created_by);

-- 자신의 이벤트만 생성 가능
CREATE POLICY "Users can create own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 자신의 이벤트만 수정 가능
CREATE POLICY "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = created_by);

-- 자신의 이벤트만 삭제 가능
CREATE POLICY "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = created_by);

-- Admin은 모든 이벤트 수정/삭제 가능
CREATE POLICY "Admin can manage all calendar events"
  ON calendar_events FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete all calendar events"
  ON calendar_events FOR DELETE
  USING (is_admin());

-- User Calendar Preferences RLS 정책
-- 자신의 선호도만 조회 가능
CREATE POLICY "Users can view own calendar preferences"
  ON user_calendar_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 선호도만 수정 가능
CREATE POLICY "Users can update own calendar preferences"
  ON user_calendar_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 자신의 선호도만 생성 가능
CREATE POLICY "Users can create own calendar preferences"
  ON user_calendar_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성 (성능 최적화)
-- 날짜 범위 조회 최적화
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_start_at ON calendar_events(start_at DESC);
CREATE INDEX idx_calendar_events_start_end ON calendar_events(start_at, end_at);
CREATE INDEX idx_calendar_events_is_shared ON calendar_events(is_shared) WHERE is_shared = TRUE;

-- 사용자별 조회 최적화
CREATE INDEX idx_user_calendar_preferences_user_id ON user_calendar_preferences(user_id);

-- 함수: 신규 사용자 기본 선호도 자동 생성
CREATE OR REPLACE FUNCTION create_default_calendar_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_calendar_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 신규 사용자 생성 시 자동으로 기본 선호도 생성
CREATE TRIGGER on_new_user_create_calendar_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_calendar_preferences();
