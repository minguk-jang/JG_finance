# 🚨 긴급: 역할 변경 기능 활성화 가이드

## 문제 증상
- 가족 구성원의 역할을 변경하면 "수정되었습니다" 알림이 뜨지만
- 새로고침하면 변경사항이 적용되지 않음

## 원인
Supabase 데이터베이스에 Admin 권한 정책이 적용되지 않았습니다.

## 해결 방법 (5분 소요)

### 1단계: Supabase 대시보드 접속
1. https://supabase.com 접속 후 로그인
2. JG Finance 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 실행
아래 SQL을 복사하여 SQL Editor에 붙여넣고 **Run** 버튼 클릭:

```sql
-- ============================================
-- Admin 권한 함수 생성
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 기존 정책 삭제 후 새 정책 적용
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- 회원가입 시 프로필 생성
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 일반 사용자: 자신의 프로필만 수정
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin: 모든 사용자 프로필 수정 가능
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin: 사용자 삭제 가능 (자기 자신 제외)
CREATE POLICY "Admins can delete users except self"
  ON users FOR DELETE
  TO authenticated
  USING (is_admin() AND id != auth.uid());

-- 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### 3단계: 확인
1. SQL 실행 후 "Success" 메시지 확인
2. 앱으로 돌아가서 **새로고침** (Cmd+R 또는 Ctrl+R)
3. 설정 탭에서 역할 변경 다시 시도
4. 새로고침 후 변경사항 확인

## 예상 결과
✅ Admin이 다른 사용자의 역할을 변경할 수 있음
✅ 일반 사용자는 자신의 이름/아바타만 수정 가능
✅ 역할 변경 후 새로고침해도 변경사항 유지됨

## 문제 지속 시 체크리스트
- [ ] Supabase SQL Editor에서 SQL이 성공적으로 실행되었는가?
- [ ] 브라우저를 완전히 새로고침했는가? (Shift + Cmd + R)
- [ ] 현재 로그인한 사용자의 역할이 Admin인가?
- [ ] Supabase 대시보드 → Authentication → Users에서 사용자 역할 확인

## 추가 도움
문제가 계속되면 Supabase 대시보드 → Table Editor → users 테이블에서
직접 역할을 수정해볼 수 있습니다.
