-- Admin이 모든 사용자의 색상 설정을 관리할 수 있도록 RLS 정책 추가

-- Admin이 모든 사용자 색상 설정 조회 가능
CREATE POLICY "Admins can view all color preferences"
  ON user_color_preferences FOR SELECT
  USING (public.is_admin());

-- Admin이 모든 사용자 색상 설정 수정 가능
CREATE POLICY "Admins can update all color preferences"
  ON user_color_preferences FOR UPDATE
  USING (public.is_admin());

-- Admin이 모든 사용자 색상 설정 생성 가능 (신규 사용자 생성 시)
CREATE POLICY "Admins can create all color preferences"
  ON user_color_preferences FOR INSERT
  WITH CHECK (public.is_admin());
