-- Study Sessions 테이블 생성
CREATE TABLE study_sessions (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  participants TEXT,
  tags TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study References 테이블 생성 (1:N)
CREATE TABLE study_references (
  id SERIAL PRIMARY KEY,
  study_session_id INTEGER REFERENCES study_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Follow-ups 테이블 생성 (1:N)
CREATE TABLE study_followups (
  id SERIAL PRIMARY KEY,
  study_session_id INTEGER REFERENCES study_sessions(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  owner TEXT,
  due DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_followups ENABLE ROW LEVEL SECURITY;

-- Study Sessions RLS 정책
CREATE POLICY "Users can view all study sessions"
  ON study_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = created_by);

-- Study References RLS 정책 (세션 소유자만 수정/삭제)
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

-- Study Follow-ups RLS 정책 (세션 소유자만 수정/삭제)
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

-- 인덱스 생성
CREATE INDEX idx_study_sessions_created_by ON study_sessions(created_by);
CREATE INDEX idx_study_sessions_date ON study_sessions(date DESC);
CREATE INDEX idx_study_references_session_id ON study_references(study_session_id);
CREATE INDEX idx_study_followups_session_id ON study_followups(study_session_id);
