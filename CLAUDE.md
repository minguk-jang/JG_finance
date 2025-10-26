# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

가계 재무 관리 PWA: **React 19 + TypeScript + Vite** (Frontend) + **Supabase** (Backend/DB/Auth)

이전 FastAPI 백엔드는 Supabase로 완전 전환되었으며, `backend/` 폴더는 참조용으로만 유지됩니다.

## 실행 명령

```bash
# Frontend 개발 서버
npm install              # 의존성 설치/업데이트 (package.json 변경 시)
npm run dev              # http://localhost:3000 (포트 3000)

# 프로덕션 빌드
npm run build            # dist/ 폴더에 빌드 결과 생성

# 빌드된 앱 미리보기
npm run preview

# Supabase 마이그레이션 적용 (CLI)
npx supabase login                    # 최초 1회만 로그인
npx supabase link --project-ref XXX   # 최초 1회만 프로젝트 연결
npx supabase db push                  # 마이그레이션 적용 (Docker 불필요)
```

**중요**:
- 백엔드는 Supabase 클라우드에서 호스팅되므로 로컬 서버 실행이 필요 없습니다
- 개발 서버는 포트 3000에서 실행됩니다 (vite.config.ts 참조)
- `vite.config.ts`의 프록시 설정은 레거시 FastAPI 백엔드용이며 현재는 사용되지 않습니다

## 환경 변수

프로젝트 루트에 `.env` 파일 필요:

```env
# 필수 - Supabase 연결
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 선택 - Gemini AI Quick Add
VITE_GEMINI_API_KEY=your-gemini-api-key
```

`.env.example` 파일을 복사하여 시작할 수 있습니다.

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
   - 사용자 프로필은 앱에서 자동으로 생성 및 동기화

4. **날짜 및 타임존 처리**
   - 모든 날짜는 KST(Asia/Seoul) 기준으로 처리
   - `lib/dateUtils.ts`의 유틸리티 함수 사용:
     - `getLocalDateString()`: 현재 로컬 날짜를 YYYY-MM-DD 형식으로 반환
     - `isValidDateFormat()`: 날짜 형식 검증
     - `parseDateString()`: 날짜 문자열을 Date 객체로 변환
   - **중요**: UTC 변환 없이 순수 로컬 시간대 사용

5. **모바일 반응형 패턴**
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
├── src/
│   ├── index.tsx        # Vite 엔트리 포인트 (React 부트스트랩)
│   ├── App.tsx          # 메인 앱 (페이지 라우팅, 레이아웃)
│   └── sw.ts            # Service Worker (Workbox 기반 PWA)
├── components/          # React 컴포넌트
│   ├── Dashboard.tsx    # 대시보드 (차트, 통계)
│   ├── Expenses.tsx     # 지출 관리 (Gemini AI Quick Add 포함)
│   ├── Income.tsx       # 수익 관리
│   ├── Investments.tsx  # 투자 관리 (계좌, 보유종목, 거래내역)
│   ├── Issues.tsx       # 이슈 보드 (칸반 스타일, 댓글 기능)
│   ├── FixedCosts.tsx   # 고정비 관리 (구독료, 월세 등)
│   ├── Notes.tsx        # 노트 관리 (간단한 메모, 체크리스트)
│   ├── Settings.tsx     # 설정 (카테고리, 예산, 사용자)
│   ├── Sidebar.tsx      # 사이드바 네비게이션
│   ├── Header.tsx       # 헤더 (페이지 전환, 통화 토글, 인증)
│   ├── AuthModal.tsx    # 로그인/회원가입 모달
│   ├── ui/              # 재사용 UI 컴포넌트 (Card 등)
│   └── icons/           # PWA 아이콘 (192x192, 512x512, maskable)
├── lib/
│   ├── api.ts           # Supabase API 래퍼 (모든 CRUD 함수)
│   ├── supabase.ts      # Supabase 클라이언트 초기화
│   ├── database.ts      # DB 헬퍼 (TableQuery, toCamelCase, toSnakeCase)
│   ├── gemini.ts        # Gemini AI API 통합 (지출 자동 분석)
│   ├── fixedCostGemini.ts  # Gemini AI 고정비 분석
│   ├── dateUtils.ts     # 날짜 유틸리티 (KST 기준, 타임존 처리)
│   └── sw-utils.ts      # Service Worker 유틸리티 (캐싱, 동기화)
├── types.ts             # TypeScript 타입 정의
├── constants.ts         # 상수 정의
├── supabase/migrations/ # SQL 마이그레이션
│   └── 010_add_notes.sql  # 최신 마이그레이션
├── docs/                # 프로젝트 문서
│   ├── frontend.md      # 프론트엔드 아키텍처
│   ├── backend.md       # 백엔드 API (참조용)
│   ├── supabase-setup.md        # Supabase 설정 가이드
│   ├── vercel-deployment.md     # Vercel 배포 가이드
│   ├── pwa-setup.md     # PWA 설정 및 캐싱
│   └── workflow.md      # 개발 워크플로
├── backend/             # FastAPI 백엔드 (참조용, 사용 중지)
├── vite.config.ts       # Vite + PWA 설정
├── vercel.json          # Vercel 배포 설정
├── package.json         # NPM 의존성
├── tsconfig.json        # TypeScript 설정
└── tailwind.config.js   # Tailwind CSS 설정
```

**참고**: 프론트엔드 파일은 리포지터리 루트에 위치하며, `backend/`는 레거시 FastAPI 코드 참조용입니다.

## 데이터베이스 테이블

**사용자 & 인증**:
- `users` (id: UUID, name, email, role, avatar)

**재무 관리**:
- `categories` (id: int, name, type: 'income'|'expense')
- `expenses` (id: int, category_id, date, amount, memo, created_by: UUID)
  - **주의**: Income과 Expenses는 동일한 `expenses` 테이블 사용
  - 카테고리의 `type` 필드로 수익/지출 구분 ('income' vs 'expense')
- `budgets` (id: int, category_id, month: 'YYYY-MM', limit_amount)

**투자 관리**:
- `investment_accounts` (id: int, name, broker)
- `holdings` (id: int, account_id, symbol, name, qty, avg_price, current_price)
- `investment_transactions` (id: int, account_id, symbol, type: 'BUY'|'SELL', trade_date, quantity, price, fees)

**이슈 관리**:
- `issues` (id: int, title, status, priority, assignee_id: UUID, body)
- `labels` (id: int, name, color)
- `issue_labels` (issue_id, label_id) - 다대다 관계
- `issue_comments` (id: int, issue_id, user_id: UUID, content, created_at, updated_at)

**고정비 관리**:
- `fixed_costs` (id: int, name, category_id, amount, payment_day, start_date, end_date, is_active, is_fixed_amount, created_by: UUID)
- `fixed_cost_payments` (id: int, fixed_cost_id, year_month: 'YYYY-MM', scheduled_amount, actual_amount, payment_date, status, created_by: UUID)

**노트 관리**:
- `notes` (id: int, content, is_completed, created_by: UUID, created_at, completed_at)

## 개발 워크플로

### 1. Frontend 개발

**API 호출 패턴**:
```tsx
import { api } from '../lib/api';

// 데이터 가져오기 (필터링 옵션)
const expenses = await api.getExpenses({
  from_date: '2025-01-01',
  to_date: '2025-12-31',
  category_id: 2,
  created_by: 'user-uuid-here'  // 작성자 필터
});

// 생성 (created_by는 자동 설정됨)
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
import { supabase } from '../lib/supabase';

// 현재 사용자 가져오기
const { data: { user } } = await supabase.auth.getUser();

// 로그인
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 로그아웃
await supabase.auth.signOut();
```

### 2. 데이터베이스 마이그레이션

**방법 1: Supabase CLI 사용 (권장)**

```bash
# 1. 프로젝트 연결 (최초 1회만)
npx supabase login
npx supabase link --project-ref your-project-ref

# 2. 마이그레이션 적용
npx supabase db push  # supabase/migrations/ 폴더의 모든 마이그레이션을 원격 DB에 적용

# 3. 마이그레이션 목록 확인
npx supabase migration list

# 4. 새 마이그레이션 파일 생성
npx supabase migration new add_feature_name
```

**방법 2: Supabase 웹 대시보드 사용**

1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/` 폴더의 `.sql` 파일 내용 복사
3. SQL Editor에서 실행

**마이그레이션 후 필수 작업:**
1. `types.ts`의 `Database` 타입 업데이트
2. `lib/api.ts`에 필요한 API 함수 추가

**주의사항:**
- `npx supabase db push`는 Docker 없이 사용 가능 (원격 DB에 직접 적용)
- `npx supabase db diff`는 Docker 필요 (로컬 shadow DB 사용)
- Project Ref는 Supabase Dashboard → Settings → General에서 확인

**기존 마이그레이션 파일**:
- `001_initial_schema.sql`: 초기 데이터베이스 스키마 (테이블 생성)
- `002_rls_policies.sql`: Row Level Security 정책 설정
- `003_fix_missing_users.sql`: 사용자 관리 버그 수정
- `004_fix_user_management.sql`: 역할 기반 권한 관리 (Admin/Editor/Viewer)
  - `is_admin()`, `is_editor_or_admin()` 헬퍼 함수
  - Admin은 모든 사용자 프로필 수정/삭제 가능
  - 일반 사용자는 본인 프로필만 수정 가능
- `005_add_fixed_costs.sql`: 고정비 관리 기능 (fixed_costs, fixed_cost_payments 테이블)
- `006_add_issue_comments.sql`: 이슈 댓글 기능 (issue_comments 테이블)
- `007_add_fixed_cost_summary_rpc.sql`: 고정비 요약 함수
- `008_add_expense_link_to_payments.sql`: 고정비 납부와 지출 연동
- `009_add_fixed_cost_amount_mode.sql`: 고정비 금액 고정/변동 모드
- `010_add_notes.sql`: 노트 관리 기능 (notes 테이블)

**예시**:
```sql
-- supabase/migrations/007_add_notes_table.sql
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
- 위치: `src/sw.ts` (커스텀 Service Worker)
- Workbox 기반 (precache + runtime caching)
- `vite.config.ts`의 `injectManifest` 설정으로 `dist/sw.js`로 빌드됨
- 수정 후 `npm run build`로 프로덕션 테스트 필수
- 개발 환경에서도 PWA 동작 (devOptions.enabled: true)

**Manifest**:
- `vite.config.ts`의 `VitePWA({ manifest: {...} })` 섹션
- 앱 이름: '쭈꾹 가계부' (short_name: '쭈꾹')
- 아이콘: `components/icons/icon-*.png` (192x192, 512x512, maskable)
- 테마 컬러: #0ea5e9 (하늘색)

**상세 문서**: `docs/pwa-setup.md`, `docs/pwa-deployment.md`

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

**핵심 모듈**: `lib/gemini.ts`의 `generateExpenseSuggestion()` 함수

**동작 방식**:
1. 사용자가 자연어 입력 (예: "어제 스타벅스에서 5000원 커피")
2. `buildPrompt()`로 시스템 프롬프트 + 현재 시간(KST) + 카테고리 목록 생성
3. Gemini API (`gemini-2.5-flash`) 호출
4. JSON 응답 파싱 및 검증:
   - `amount` (number): 금액
   - `currency` (KRW/USD): 통화
   - `categoryName` (string): 카테고리 이름
   - `date` (YYYY-MM-DD): 날짜
   - `memo` (string): 메모
   - `confidence` (0-1, 선택): 신뢰도 점수
5. 컴포넌트에서 폼 자동 입력
6. 사용자 확인 후 저장

**환경 변수**:
- `VITE_GEMINI_API_KEY` (필수): Gemini API 키
- `VITE_GEMINI_MODEL` (선택): 모델 ID (기본값: `gemini-2.5-flash`)

**주요 특징**:
- 한국어 자연어 처리 최적화
- 상대적 날짜 표현 지원 ("어제", "지난주 화요일" → YYYY-MM-DD 변환)
- 기존 카테고리 목록과 매칭
- 통화 자동 감지 (기본값: KRW)

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

### 이슈 댓글 조회 및 작성
```tsx
// 특정 이슈의 댓글 조회 (사용자 정보 포함)
const comments = await api.getIssueComments(issueId);

// 새 댓글 작성 (user_id는 자동 설정됨)
await api.createIssueComment({
  issueId: 123,
  content: '댓글 내용'
});

// 댓글 수정
await api.updateIssueComment(commentId, {
  content: '수정된 댓글'
});

// 댓글 삭제
await api.deleteIssueComment(commentId);
```

### 고정비 관리
```tsx
// 고정비 조회 (카테고리 정보 포함)
const fixedCosts = await api.getFixedCosts();

// 새 고정비 추가 (created_by는 자동 설정됨)
await api.createFixedCost({
  name: '넷플릭스 구독',
  categoryId: 1,
  amount: 14500,
  paymentDay: 15,  // 매월 15일
  startDate: '2025-01-01',
  endDate: null,  // 종료일 없음 (계속 활성)
  isActive: true,
  memo: '프리미엄 플랜'
});

// 특정 월의 고정비 납부 내역 조회
const payments = await api.getFixedCostPayments('2025-10');

// 고정비 납부 완료 처리
await api.updateFixedCostPayment(paymentId, {
  status: 'paid',
  actualAmount: 14500,
  paymentDate: '2025-10-15'
});
```

### 다중 선택 및 일괄 삭제
Income 및 Expenses 컴포넌트는 체크박스 기반 다중 선택과 일괄 삭제를 지원합니다:
```tsx
// 상태 관리
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

// 개별 선택 토글
const toggleSelect = (id: number) => {
  const newSet = new Set(selectedIds);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  setSelectedIds(newSet);
};

// 일괄 삭제
const handleBulkDelete = async () => {
  for (const id of selectedIds) {
    await api.deleteExpense(id);
  }
  setSelectedIds(new Set());
  await fetchData();
};
```

### 노트 관리
간단한 메모 및 체크리스트 기능:
```tsx
// 노트 조회
const notes = await api.getNotes();

// 새 노트 추가 (created_by는 자동 설정됨)
await api.createNote({
  content: '할 일 내용',
  isCompleted: false
});

// 노트 완료 처리
await api.updateNote(noteId, {
  isCompleted: true,
  completedAt: new Date().toISOString()
});

// 노트 삭제
await api.deleteNote(noteId);
```

## 코딩 스타일 & 규칙

**React/TypeScript**:
- 들여쓰기: 2 스페이스
- 문자열: 작은따옴표 ('') 사용
- 컴포넌트: PascalCase (예: `Dashboard.tsx`)
- 함수/변수: camelCase (예: `getUserName()`)
- 파일 위치: `components/` 폴더 또는 사용처 근처

**Python (backend/ 참조용)**:
- 들여쓰기: 4 스페이스
- 함수/변수: snake_case
- Black 호환 권장

**환경 변수**:
- 새 키 추가 시 `.env.example` 업데이트 필수
- 실제 시크릿은 절대 커밋 금지

**Commit Convention**:
- Conventional Commits 형식 사용
- 예: `feat(frontend): add sidebar tweaks`, `fix(backend): expenses schema`

## 중요 참고사항

1. **FastAPI 백엔드는 사용 중지**: `backend/` 폴더는 참조용이며 실행되지 않음
2. **vite.config.ts의 프록시 설정**: 개발 환경에서 `/api` 요청은 현재 사용되지 않음 (Supabase 직접 연결)
3. **타입 변환**: API 함수는 항상 camelCase 반환, DB는 snake_case - 변환은 자동
4. **UUID vs INT**: users 테이블은 UUID, 나머지는 auto-increment INT
5. **created_by 필드**: 자동으로 현재 로그인 사용자 UUID 설정됨
6. **Income/Expense 테이블**: 동일한 `expenses` 테이블 공유, 카테고리 타입으로 구분
7. **날짜 처리**: 모든 날짜는 KST 기준이며 UTC 변환 없이 처리됨 - `lib/dateUtils.ts` 사용 필수
8. **PWA 테스트**: Service Worker 수정 후 반드시 프로덕션 빌드로 테스트 (`npm run build && npm run preview`)

## 문제 해결

### 환경 변수 오류
```
Missing Supabase environment variables
```
→ `.env.example`을 복사하여 `.env` 생성 후 Supabase 프로젝트 설정값 입력

### 빌드 오류
```
npm run build
```
→ TypeScript 타입 오류 확인, `types.ts`의 Database 타입 정의가 실제 스키마와 일치하는지 확인

### RLS 정책 오류 (403 Forbidden)
→ Supabase 대시보드에서 RLS 정책 확인, `auth.uid()`와 `created_by`/`user_id` 일치 여부 확인

### Service Worker 캐싱 문제
→ 개발자 도구 → Application → Clear storage 또는 `npm run build && npm run preview`로 프로덕션 빌드 테스트

## 테스트

### Frontend 테스트 (예정)
- **프레임워크**: Vitest + React Testing Library
- **위치**: `components/__tests__/` (컴포넌트 옆에 colocate)
- **파일 형식**: `*.test.tsx`
- **테스트 대상**:
  - Income/Expense API 통합
  - 예산 검증 로직
  - 고정비 납부 생성 및 변동 금액 수정/취소 플로우
  - 투자/이슈 통합

**실행 명령 (향후)**:
```bash
npm run test
```

### Backend 테스트 (참조용, FastAPI)
- **프레임워크**: Pytest
- **위치**: `backend/tests/`
- **데이터베이스**: In-memory SQLite 픽스처

**실행 명령**:
```bash
cd backend
source venv/bin/activate
pytest                    # 전체 테스트
pytest tests/test_expenses_api.py -vv  # 특정 테스트
```

## 문서

상세 정보는 다음 문서 참조:
- `docs/supabase-setup.md` - Supabase 초기 설정 및 마이그레이션
- `docs/vercel-deployment.md` - Vercel 프로덕션 배포 가이드
- `docs/frontend.md` - 프론트엔드 아키텍처 및 컴포넌트 구조
- `docs/pwa-setup.md` - PWA 설정, Service Worker, 오프라인 지원
- `docs/workflow.md` - 개발 워크플로 및 마이그레이션 가이드
- `AGENTS.md` - 기여자 가이드 (코딩 스타일, PR 규칙)

**참고**: `README.md`는 FastAPI 백엔드 기준으로 작성되어 일부 정보가 구버전일 수 있습니다. Supabase 기반 개발 시 이 CLAUDE.md와 docs/ 폴더를 우선 참조하세요.
