# Supabase 설정 가이드

이 문서는 JG Finance를 Supabase와 함께 설정하는 방법을 설명합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입하고 로그인합니다
2. "New Project" 버튼을 클릭합니다
3. 프로젝트 이름을 입력하고 데이터베이스 비밀번호를 설정합니다
4. 지역(Region)을 선택합니다 (한국의 경우 Northeast Asia (Seoul) 추천)
5. "Create new project" 버튼을 클릭합니다

## 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 **SQL Editor**로 이동합니다
2. 새 쿼리를 생성하고 다음 파일의 내용을 순서대로 실행합니다:
   - `supabase/migrations/001_initial_schema.sql` (테이블 스키마)
   - `supabase/migrations/002_rls_policies.sql` (보안 정책)

또는 Supabase CLI를 사용하는 경우:

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 마이그레이션 실행
supabase db push
```

## 3. 환경 변수 설정

### 로컬 개발

1. `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:
   ```bash
   cp .env.example .env
   ```

2. Supabase 대시보드에서 **Settings** → **API**로 이동합니다

3. 다음 값들을 복사하여 `.env` 파일에 붙여넣습니다:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_ANON_KEY`: anon public key

### Vercel 배포

1. Vercel 대시보드에서 프로젝트의 **Settings** → **Environment Variables**로 이동합니다

2. 다음 환경 변수를 추가합니다:
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
   - `VITE_GEMINI_API_KEY`: (선택사항) Gemini AI API 키

3. **Save**를 클릭합니다

## 4. 인증 설정

### 이메일 인증 활성화

1. Supabase 대시보드에서 **Authentication** → **Providers**로 이동합니다
2. **Email** 프로바이더가 활성화되어 있는지 확인합니다
3. (선택사항) **Confirm email**을 비활성화하여 개발 중 빠른 가입을 허용할 수 있습니다

### 추가 인증 방법 (선택사항)

Supabase는 다양한 OAuth 프로바이더를 지원합니다:
- Google
- GitHub
- Facebook
- 기타 등등

**Authentication** → **Providers**에서 원하는 프로바이더를 활성화할 수 있습니다.

## 5. Row Level Security (RLS) 확인

RLS 정책이 올바르게 적용되었는지 확인합니다:

1. Supabase 대시보드에서 **Database** → **Tables**로 이동합니다
2. 각 테이블을 선택하고 **Policies** 탭을 확인합니다
3. 모든 테이블에 정책이 설정되어 있어야 합니다

## 6. 첫 사용자 생성

애플리케이션을 실행하고 회원가입 기능을 사용하여 첫 사용자를 생성합니다:

```bash
npm install
npm run dev
```

1. 브라우저에서 http://localhost:5173 접속
2. 로그인 모달이 나타나면 "회원가입" 선택
3. 이메일, 비밀번호, 이름 입력 후 가입

## 7. 데이터 확인

Supabase 대시보드의 **Table Editor**에서 데이터를 확인하고 수정할 수 있습니다.

## 문제 해결

### 인증 오류

- Supabase URL과 anon key가 올바른지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- Supabase 대시보드의 **Logs**에서 에러 확인

### RLS 정책 오류

- 데이터를 읽거나 쓸 수 없다면 RLS 정책을 확인
- SQL Editor에서 정책을 다시 실행해 보기
- 임시로 RLS를 비활성화하여 테스트 (개발 환경에서만):
  ```sql
  ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
  ```

### 연결 문제

- 네트워크 연결 확인
- Supabase 프로젝트가 일시 중지되지 않았는지 확인 (무료 플랜은 1주일 비활성 시 일시 중지)
- CORS 설정 확인 (Supabase는 기본적으로 모든 origin 허용)

## 추가 리소스

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
