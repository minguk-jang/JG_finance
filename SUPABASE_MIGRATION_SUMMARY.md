# Supabase 마이그레이션 완료 보고서

## 개요

JG Finance 프로젝트가 FastAPI + PostgreSQL 백엔드에서 **Supabase**로 완전히 전환되었습니다.

**전환 일자**: 2025-10-19
**작업 범위**: 백엔드 완전 제거, Supabase 통합, Vercel 배포 준비

---

## 변경 사항 요약

### 아키텍처 변경

**Before (FastAPI + PostgreSQL):**
```
Frontend (React + Vite)
    ↓ HTTP REST API
Backend (FastAPI + SQLAlchemy)
    ↓ SQL
Database (PostgreSQL)
```

**After (Supabase):**
```
Frontend (React + Vite)
    ↓ @supabase/supabase-js
Supabase (PostgreSQL + Auth + API)
```

### 제거된 항목
- ❌ FastAPI 백엔드 (`backend/` 폴더는 참조용으로 유지)
- ❌ SQLAlchemy ORM
- ❌ Alembic 마이그레이션
- ❌ 커스텀 JWT 인증
- ❌ Pydantic 스키마
- ❌ FastAPI 라우터

### 추가된 항목
- ✅ Supabase JavaScript 클라이언트 (`@supabase/supabase-js`)
- ✅ Supabase Auth 통합 (`lib/auth.tsx`)
- ✅ Row Level Security (RLS) 정책
- ✅ 타입 안전 데이터베이스 타입 (`types.ts`)
- ✅ 인증 모달 컴포넌트 (`components/AuthModal.tsx`)
- ✅ Vercel 배포 설정 (`vercel.json`)
- ✅ 환경 변수 템플릿 (`.env.example`)
- ✅ 상세 설정 가이드 (`docs/supabase-setup.md`, `docs/vercel-deployment.md`)

---

## 새로운 파일 구조

### 주요 신규 파일

```
프로젝트 루트/
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트 초기화
│   ├── auth.tsx             # 인증 컨텍스트 (AuthProvider, useAuth)
│   ├── database.ts          # DB 헬퍼 함수 (toCamelCase, toSnakeCase)
│   └── api.ts               # ✏️ 수정: Supabase 쿼리로 전면 리팩토링
├── components/
│   └── AuthModal.tsx        # 로그인/회원가입 모달
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # 데이터베이스 스키마
│       └── 002_rls_policies.sql      # RLS 보안 정책
├── docs/
│   ├── supabase-setup.md            # Supabase 설정 가이드
│   └── vercel-deployment.md         # Vercel 배포 가이드
├── types.ts                 # ✏️ 수정: Supabase Database 타입 추가
├── index.tsx                # ✏️ 수정: AuthProvider 추가
├── App.tsx                  # ✏️ 수정: useAuth 훅 사용
├── vercel.json              # Vercel 배포 설정
├── .env.example             # 환경 변수 템플릿
└── CLAUDE.md                # ✏️ 수정: Supabase 기반으로 업데이트
```

---

## 데이터베이스 스키마

### 테이블 목록 (10개)

| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| `users` | 사용자 (Supabase Auth 통합) | id (UUID), name, email, role, avatar |
| `categories` | 수입/지출 카테고리 | id, name, type (income/expense) |
| `expenses` | 지출 내역 | id, category_id, date, amount, memo, created_by |
| `budgets` | 예산 설정 | id, category_id, month, limit_amount |
| `investment_accounts` | 투자 계좌 | id, name, broker |
| `holdings` | 보유 종목 | id, account_id, symbol, name, qty, avg_price |
| `investment_transactions` | 투자 거래 내역 | id, account_id, symbol, type, trade_date, quantity, price |
| `issues` | 이슈 트래킹 | id, title, status, priority, assignee_id, body |
| `labels` | 이슈 라벨 | id, name, color |
| `issue_labels` | 이슈-라벨 연결 (M:N) | issue_id, label_id |

### Row Level Security (RLS)

모든 테이블에 RLS 활성화:
- ✅ 인증된 사용자만 접근 가능
- ✅ `auth.uid()`로 사용자 식별
- ✅ 각 테이블별 SELECT/INSERT/UPDATE/DELETE 정책 설정
- ✅ 사용자 자동 생성 트리거 (`handle_new_user()`)

---

## API 변경 사항

### Before (FastAPI REST API)

```typescript
// lib/api.ts
const response = await fetch('/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

### After (Supabase)

```typescript
// lib/api.ts
const data = await handleRequest(
  supabase.from('expenses').insert(snakeData).select().single()
);
return toCamelCase(data);
```

### 변경된 메서드

모든 API 메서드가 Supabase 쿼리로 변경됨:
- `api.getExpenses()` → `supabase.from('expenses').select('*')`
- `api.createExpense()` → `supabase.from('expenses').insert()`
- `api.updateExpense()` → `supabase.from('expenses').update()`
- `api.deleteExpense()` → `supabase.from('expenses').delete()`

**자동 변환**:
- snake_case (DB) ↔ camelCase (Frontend)
- `toCamelCase()` / `toSnakeCase()` 함수 사용

---

## 인증 시스템

### Supabase Auth 통합

**Before (커스텀 JWT):**
```typescript
// 수동 JWT 토큰 관리
// 로그인, 회원가입, 토큰 갱신 로직 직접 구현
```

**After (Supabase Auth):**
```typescript
// lib/auth.tsx
const { user, session, signIn, signUp, signOut } = useAuth();

// 자동으로 관리됨:
// - JWT 토큰 자동 갱신
// - localStorage에 세션 저장
// - 인증 상태 실시간 동기화
```

### 인증 흐름

1. **회원가입**:
   - `signUp(email, password, name)`
   - Supabase가 `auth.users` 테이블에 사용자 생성
   - 트리거가 `public.users` 테이블에 프로필 생성

2. **로그인**:
   - `signIn(email, password)`
   - JWT 토큰 발급 및 localStorage 저장
   - `AuthContext`가 전역 상태 관리

3. **보호된 데이터 접근**:
   - RLS가 자동으로 `auth.uid()` 확인
   - 권한 없는 접근 차단

---

## 타입 시스템

### Supabase Database 타입

```typescript
// types.ts
export interface Database {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: number;
          category_id: number;
          date: string;
          amount: number;
          memo: string;
          created_by: string;  // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      // ... 다른 테이블들
    };
  };
}
```

**장점**:
- ✅ 완전한 타입 안전성
- ✅ IDE 자동 완성
- ✅ 컴파일 시점 에러 감지
- ✅ 데이터베이스 스키마와 동기화

---

## 배포 설정

### Vercel 배포

**vercel.json 설정**:
- ✅ SPA 라우팅 (`rewrites`)
- ✅ Service Worker 헤더
- ✅ 보안 헤더 (X-Frame-Options, X-XSS-Protection)
- ✅ 캐시 전략

**환경 변수**:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GEMINI_API_KEY=AIzaSy...  # (선택사항)
```

---

## 다음 단계

### 필수 작업

1. **Supabase 프로젝트 생성**
   ```bash
   # 1. https://supabase.com에서 프로젝트 생성
   # 2. SQL Editor에서 마이그레이션 실행
   # 3. URL과 anon key 복사
   ```

2. **로컬 환경 설정**
   ```bash
   cp .env.example .env
   # .env 파일에 Supabase 정보 입력
   npm install
   npm run dev
   ```

3. **Vercel 배포**
   ```bash
   # 1. GitHub에 푸시
   # 2. Vercel에서 프로젝트 import
   # 3. 환경 변수 설정
   # 4. Deploy 클릭
   ```

### 선택 작업

- [ ] OAuth 로그인 추가 (Google, GitHub 등)
- [ ] Supabase Realtime으로 실시간 업데이트
- [ ] Supabase Storage로 파일 업로드 기능
- [ ] 프론트엔드 테스트 작성
- [ ] 데이터 Export/Import 기능

---

## 문서

### 설정 가이드
- 📘 `docs/supabase-setup.md` - Supabase 설정 방법
- 📗 `docs/vercel-deployment.md` - Vercel 배포 방법
- 📕 `CLAUDE.md` - 프로젝트 개요 및 작업 가이드

### SQL 마이그레이션
- 🗃️ `supabase/migrations/001_initial_schema.sql` - 데이터베이스 스키마
- 🔒 `supabase/migrations/002_rls_policies.sql` - 보안 정책

---

## 요약

✅ **완료**: FastAPI → Supabase 완전 전환
✅ **백엔드**: 제거 (Supabase로 대체)
✅ **인증**: Supabase Auth 통합
✅ **보안**: Row Level Security (RLS)
✅ **타입**: 완전한 타입 안전성
✅ **배포**: Vercel 준비 완료

**다음**: Supabase 프로젝트 생성 → SQL 실행 → Vercel 배포

---

**질문이나 문제가 있으면 다음 문서를 참조하세요:**
- `docs/supabase-setup.md`
- `docs/vercel-deployment.md`
- `CLAUDE.md`
