-- User Color Preferences 테이블 생성 (고정비 및 일정 색상 설정)
CREATE TABLE user_color_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- 개인 일정 색상
  personal_color TEXT DEFAULT '#0ea5e9',
  personal_palette_key TEXT DEFAULT 'sky',
  -- 공용 일정 색상
  shared_color TEXT DEFAULT '#ec4899',
  shared_palette_key TEXT DEFAULT 'pink',
  -- 기본 색상 팔레트: 'sky', 'coral', 'orange', 'tan', 'amber', 'rose', 'pink', 'purple', 'blue', 'green', 'teal', 'cyan'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE user_color_preferences ENABLE ROW LEVEL SECURITY;

-- RLS 정책
-- 자신의 색상 선호도만 조회 가능
CREATE POLICY "Users can view own color preferences"
  ON user_color_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 색상 선호도만 수정 가능
CREATE POLICY "Users can update own color preferences"
  ON user_color_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 자신의 색상 선호도만 생성 가능
CREATE POLICY "Users can create own color preferences"
  ON user_color_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_user_color_preferences_user_id ON user_color_preferences(user_id);

-- 함수: 신규 사용자 기본 색상 선호도 자동 생성
CREATE OR REPLACE FUNCTION create_default_color_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_color_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 신규 사용자 생성 시 자동으로 기본 색상 선호도 생성
CREATE TRIGGER on_new_user_create_color_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_color_preferences();
