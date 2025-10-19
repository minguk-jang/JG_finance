# CLAUDE.md

## 프로젝트 개요

가계 재무 관리 풀스택 PWA: **React 19 + TypeScript + Vite** (FE) + **Supabase** (Backend/DB/Auth)

## 폴더 구조

```
/
├── components/         # React 컴포넌트 (Dashboard, Income, Expenses, Investments, Issues, Settings, Auth)
├── lib/
│   ├── api.ts         # Supabase API 클라이언트
│   ├── supabase.ts    # Supabase 초기화
│   ├── auth.tsx       # 인증 컨텍스트
│   └── database.ts    # DB 헬퍼 함수
├── types.ts           # 타입 정의 (Supabase Database 타입 포함)
├── supabase/
│   └── migrations/    # SQL 마이그레이션
├── backend/           # (참조용) 기존 FastAPI 코드
└── docs/              # 상세 문서
```

## 실행 명령

**Frontend**: `npm run dev` → http://localhost:5173
**Build**: `npm run build`
**Preview**: `npm run preview`

## 기술 스택

**Frontend**: React 19, TypeScript, Vite, Tailwind CSS (반응형: sm/md/lg/xl breakpoints)
**Backend**: Supabase (PostgreSQL + Auth + Real-time + Storage)
**Authentication**: Supabase Auth (이메일/비밀번호)
**Database**: PostgreSQL (Supabase managed)
**Deployment**: Vercel
**Features**: PWA, 대시보드, 수익/지출 관리, 투자 추적, 이슈 보드, Gemini AI Quick Add

**데이터베이스 테이블**:
- `users` (Supabase Auth 통합)
- `categories`, `expenses`, `budgets`
- `investment_accounts`, `holdings`, `investment_transactions`
- `issues`, `labels`, `issue_labels`

**모바일 반응형**: 테이블 `hidden md:table` + 카드 `block md:hidden` 패턴 적용

## 주요 파일

**Frontend**:
- `lib/api.ts`: Supabase 쿼리를 래핑한 API 함수들
- `lib/supabase.ts`: Supabase 클라이언트 초기화
- `lib/auth.tsx`: 인증 컨텍스트 및 훅 (useAuth)
- `lib/database.ts`: 타입 안전 DB 헬퍼 함수
- `types.ts`: Supabase Database 타입 정의
- `components/AuthModal.tsx`: 로그인/회원가입 모달

**Backend (Supabase)**:
- `supabase/migrations/001_initial_schema.sql`: 데이터베이스 스키마
- `supabase/migrations/002_rls_policies.sql`: Row Level Security 정책

**Configuration**:
- `vercel.json`: Vercel 배포 설정
- `.env.example`: 환경 변수 템플릿

## 작업 가이드

**Frontend 개발**:
1. `lib/api.ts`에서 Supabase 쿼리 함수 사용
2. 컴포넌트에서 `api.*` 메서드 호출
3. 인증이 필요한 경우 `useAuth()` 훅 사용

**데이터베이스 변경**:
1. Supabase 대시보드 SQL Editor에서 쿼리 실행
2. 또는 `supabase/migrations/` 폴더에 SQL 파일 추가
3. `types.ts`의 Database 타입 업데이트

**인증**:
- `useAuth()` 훅: 현재 사용자, 로그인, 로그아웃, 프로필 등
- `useRequireAuth()` 훅: 인증 필수 페이지에서 사용

**환경변수**:
- **필수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **선택**: `VITE_GEMINI_API_KEY`

## 배포

### Supabase 설정
1. Supabase 프로젝트 생성
2. SQL 마이그레이션 실행 (`supabase/migrations/*.sql`)
3. URL과 anon key 획득

### Vercel 배포
1. GitHub 저장소 연결
2. 환경 변수 설정 (VITE_SUPABASE_*)
3. 자동 배포

상세 가이드:
- `docs/supabase-setup.md` - Supabase 설정
- `docs/vercel-deployment.md` - Vercel 배포

## 상태

**완료**:
- ✅ Supabase 전환 (FastAPI 제거)
- ✅ Supabase Auth 통합
- ✅ Row Level Security (RLS)
- ✅ PWA 기능 (Service Worker, 오프라인 지원)
- ✅ 대시보드, 수익/지출 CRUD
- ✅ 투자 관리 (계좌, 보유종목, 거래내역)
- ✅ 이슈 보드
- ✅ Gemini AI Quick Add
- ✅ 모바일 반응형 (일부)
- ✅ Vercel 배포 준비

**예정**:
- 🔄 모든 컴포넌트 모바일 반응형 완성
- 🔄 프론트엔드 테스트 (React Testing Library)
- 🔄 Real-time 기능 (Supabase Realtime)
- 🔄 OAuth 로그인 (Google, GitHub 등)
- 🔄 데이터 Export/Import 기능

## 참고사항

- **기존 FastAPI 코드**: `backend/` 폴더는 참조용으로 유지 (제거 가능)
- **데이터 변환**: `lib/database.ts`의 `toCamelCase`/`toSnakeCase`로 snake_case ↔ camelCase 자동 변환
- **타입 안전성**: Supabase Database 타입으로 완전한 타입 안전성 제공
- **보안**: RLS로 사용자별 데이터 격리 (auth.uid() 기반)

상세 문서: `README.md`, `docs/` 폴더 참조
