# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

가계 재무 관리 PWA: **React 19 + TypeScript + Vite** (Frontend) + **Supabase** (Backend/DB/Auth)

이전 FastAPI 백엔드는 Supabase로 완전 전환되었으며, `backend/` 폴더는 참조용으로만 유지됩니다.

## 실행 명령

```bash
# Frontend 개발 서버
npm run dev              # http://localhost:3000

# 프로덕션 빌드
npm run build

# 빌드된 앱 미리보기
npm run preview
```

**중요**: 백엔드는 Supabase 클라우드에서 호스팅되므로 로컬 서버 실행이 필요 없습니다.

## 환경 변수

프로젝트 루트에 `.env` 파일 필요:

```env
# 필수 - Supabase 연결
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 선택 - Gemini AI Quick Add
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.0-flash-exp
```

## 기술 스택 & 아키텍처

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS**: 모바일 반응형 (sm/md/lg/xl breakpoints)
- **PWA**: vite-plugin-pwa, Service Worker (`src/sw.ts`)
- **차트**: Recharts

### Backend (Supabase)
- **PostgreSQL**: Supabase managed database
- **Authentication**: Supabase Auth (이메일/비밀번호)
- **Row Level Security (RLS)**: 사용자별 데이터 격리

### 핵심 아키텍처 패턴

1. **데이터베이스 ↔ Frontend 변환**
   - DB는 `snake_case` (PostgreSQL 규칙)
   - Frontend는 `camelCase` (JavaScript 규칙)
   - `lib/database.ts`의 `toCamelCase()` / `toSnakeCase()` 자동 변환
   - `lib/api.ts`의 모든 API 함수가 자동으로 변환 처리

2. **타입 안전성**
   - `types.ts`에 Supabase Database 타입 정의
   - 모든 테이블 구조가 TypeScript 타입으로 표현됨
   - `Database['public']['Tables']` 구조 사용

3. **인증 아키텍처**
   - Supabase Auth의 `auth.users` 테이블과 커스텀 `public.users` 테이블 병용
   - `auth.users`: Supabase 인증 정보 (이메일, 비밀번호)
   - `public.users`: 앱 프로필 정보 (이름, 역할, 아바타)
   - 두 테이블 모두 UUID 기반 `id` 사용
   - `lib/auth.tsx`의 `ensureProfile()`이 auth.users → public.users 자동 동기화

4. **모바일 반응형 패턴**
   ```tsx
   // 데스크톱: 테이블 레이아웃
   <table className="hidden md:table">...</table>

   // 모바일: 카드 레이아웃
   <div className="block md:hidden space-y-2">
     {items.map(item => <Card>...</Card>)}
   </div>
   ```

## 폴더 구조

```
/
├── components/           # React 컴포넌트
│   ├── Dashboard.tsx     # 대시보드 (차트, 통계)
│   ├── Expenses.tsx      # 지출 관리 (Gemini AI Quick Add 포함)
│   ├── Income.tsx        # 수익 관리
│   ├── Investments.tsx   # 투자 관리 (계좌, 보유종목, 거래내역)
│   ├── Issues.tsx        # 이슈 보드 (칸반 스타일)
│   ├── Settings.tsx      # 설정 (카테고리, 예산, 사용자)
│   ├── Header.tsx        # 헤더 (페이지 전환, 통화 토글, 인증)
│   └── AuthModal.tsx     # 로그인/회원가입 모달
├── lib/
│   ├── api.ts           # Supabase API 래퍼 (모든 CRUD 함수)
│   ├── supabase.ts      # Supabase 클라이언트 초기화
│   ├── auth.tsx         # 인증 컨텍스트 (useAuth, AuthProvider)
│   └── database.ts      # DB 헬퍼 (TableQuery, toCamelCase, toSnakeCase)
├── types.ts             # TypeScript 타입 정의
├── supabase/migrations/ # SQL 마이그레이션
├── App.tsx              # 메인 앱 (페이지 라우팅)
├── vite.config.ts       # Vite + PWA 설정
└── vercel.json          # Vercel 배포 설정
```

## 데이터베이스 테이블

**사용자 & 인증**:
- `users` (id: UUID, name, email, role, avatar)

**재무 관리**:
- `categories` (id: int, name, type: 'income'|'expense')
- `expenses` (id: int, category_id, date, amount, memo, created_by: UUID)
- `budgets` (id: int, category_id, month: 'YYYY-MM', limit_amount)

**투자 관리**:
- `investment_accounts` (id: int, name, broker)
- `holdings` (id: int, account_id, symbol, name, qty, avg_price, current_price)
- `investment_transactions` (id: int, account_id, symbol, type: 'BUY'|'SELL', trade_date, quantity, price, fees)

**이슈 관리**:
- `issues` (id: int, title, status, priority, assignee_id: UUID, body)
- `labels` (id: int, name, color)
- `issue_labels` (issue_id, label_id) - 다대다 관계

## 개발 워크플로

### 1. Frontend 개발

**API 호출 패턴**:
```tsx
import { api } from '../lib/api';

// 데이터 가져오기
const expenses = await api.getExpenses({ from_date: '2025-01-01' });

// 생성
const newExpense = await api.createExpense({
  categoryId: 2,
  date: '2025-10-21',
  amount: 50000,
  memo: 'Coffee'
});

// 수정
await api.updateExpense(id, { amount: 55000 });

// 삭제
await api.deleteExpense(id);
```

**인증 사용**:
```tsx
import { useAuth } from '../lib/auth';

function MyComponent() {
  const { user, profile, signIn, signOut } = useAuth();

  if (!user) {
    return <LoginPrompt />;
  }

  return <div>안녕하세요, {profile?.name}</div>;
}
```

### 2. 데이터베이스 마이그레이션

스키마 변경 시:
1. Supabase 대시보드 → SQL Editor에서 쿼리 실행
2. 또는 `supabase/migrations/` 폴더에 새 `.sql` 파일 추가
3. `types.ts`의 `Database` 타입 업데이트
4. `lib/api.ts`에 필요한 API 함수 추가

**예시**:
```sql
-- supabase/migrations/004_add_notes_table.sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);
```

### 3. 컴포넌트 개발

**모바일 반응형 체크리스트**:
- [ ] 테이블이 있다면 `hidden md:table` 적용
- [ ] 모바일 카드 레이아웃 추가 (`block md:hidden`)
- [ ] 폰트 크기 반응형 (`text-base sm:text-lg md:text-xl`)
- [ ] 간격 반응형 (`space-y-2 sm:space-y-4`)
- [ ] 버튼/입력 필드 터치 친화적 크기 (최소 44px)

### 4. PWA 관련 작업

**Service Worker**:
- 위치: `src/sw.ts`
- Workbox 기반 (precache + runtime caching)
- 수정 후 `npm run build`로 테스트 필요

**Manifest**:
- `vite.config.ts`의 `VitePWA({ manifest: {...} })` 섹션
- 아이콘: `components/icons/icon-*.png`

## Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있어 사용자는 자신의 데이터만 접근 가능:

```sql
-- 예시: expenses 테이블 정책
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = created_by);
```

**주의**:
- `created_by` 또는 `user_id` 필드에는 항상 `auth.uid()` (현재 로그인한 사용자의 UUID) 설정
- `lib/api.ts`의 `createExpense` 등이 자동으로 처리

## Gemini AI Quick Add

**위치**: `components/Expenses.tsx`의 `handleGeminiAnalyze()` 함수

**동작 방식**:
1. 사용자가 자연어 입력 (예: "어제 스타벅스에서 5000원 커피")
2. Gemini API로 텍스트 전송
3. JSON 응답 파싱 (date, category, amount, memo)
4. 폼 자동 입력
5. 사용자 확인 후 저장

**환경 변수**: `VITE_GEMINI_API_KEY` 필수

## 배포

### Vercel 배포
1. GitHub 저장소 연결
2. 환경 변수 설정:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` (선택)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. 자동 배포

**설정 파일**: `vercel.json` (SPA 라우팅, 보안 헤더, PWA 캐싱)

## 일반적인 작업

### 새 카테고리 추가
```tsx
await api.createCategory({ name: '교통비', type: 'expense' });
```

### 월별 지출 조회
```tsx
const expenses = await api.getExpenses({
  from_date: '2025-10-01',
  to_date: '2025-10-31'
});
```

### 투자 거래 필터링
```tsx
const transactions = await api.getInvestmentTransactions({
  account_id: 1,
  type: 'BUY',
  start_date: '2025-01-01'
});
```

### 이슈 상태 변경
```tsx
await api.updateIssue(issueId, { status: 'Closed' });
```

## 중요 참고사항

1. **FastAPI 백엔드는 사용 중지**: `backend/` 폴더는 참조용이며 실행되지 않음
2. **vite.config.ts의 프록시 설정**: 개발 환경에서 `/api` 요청은 현재 사용되지 않음 (Supabase 직접 연결)
3. **타입 변환**: API 함수는 항상 camelCase 반환, DB는 snake_case - 변환은 자동
4. **UUID vs INT**: users 테이블은 UUID, 나머지는 auto-increment INT
5. **created_by 필드**: 자동으로 현재 로그인 사용자 UUID 설정됨

## 문서

상세 정보는 다음 문서 참조:
- `README.md` - 전체 프로젝트 개요
- `docs/supabase-setup.md` - Supabase 초기 설정
- `docs/vercel-deployment.md` - 프로덕션 배포
- `docs/frontend.md` - 프론트엔드 아키텍처
- `docs/pwa-setup.md` - PWA 기능
