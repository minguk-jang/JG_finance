# Frontend (React + Vite)

## Purpose

브라우저 UI로 **FastAPI** 백엔드를 호출합니다.

- **Navigation**: Dashboard / Income / Expenses / Investments / Issues / Settings
- **Currency Toggle**: KRW ↔ USD
- **CRUD**: expenses, budgets, investments, issues
- **Mobile Responsive**: Tailwind CSS breakpoint 전략으로 모든 화면 크기 최적화

## Structure

```
/ (프론트엔드 루트)
├── components/           # React 컴포넌트
│   ├── Dashboard.tsx     # 대시보드 (월별 통계, 투자 현금 흐름)
│   ├── Income.tsx        # 수익 CRUD + 통계 (모바일 카드 지원)
│   ├── Expenses.tsx      # 지출 CRUD + 통계 (모바일 카드 지원)
│   ├── Investments.tsx   # 투자 계좌·보유 자산·거래 (API 연동)
│   ├── Issues.tsx        # 칸반 보드 (Open/In Progress/Closed)
│   ├── Settings.tsx      # 카테고리·예산·사용자·환율 관리
│   ├── QuickAddVoiceModal.tsx  # Gemini AI Quick Add
│   ├── Sidebar.tsx       # 네비게이션
│   ├── Header.tsx        # 헤더 (통화 토글)
│   └── ui/               # 재사용 가능 UI (Card 등)
├── lib/                  # 유틸리티
│   └── api.ts            # API 클라이언트
├── types.ts              # TypeScript 타입 정의
├── constants.ts          # 기본값 상수
├── App.tsx               # 메인 앱
├── index.tsx             # Vite 엔트리
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

> **참고**: 프론트엔드 파일은 현재 리포지터리 루트에 위치합니다.

## API Calls

- **Base URL** (dev): `http://localhost:8000`
- **Proxy**: Vite가 `/api` 요청을 백엔드로 프록시합니다.

### vite.config.ts (proxy example)

```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
```

### API Client (lib/api.ts)

```ts
export const API_BASE = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(path: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// apiPut, apiDelete도 유사하게 구현
```

**주요 메서드**:
- `getExpenses(params)` — 지출/수익 조회 (필터 포함)
- `createExpense(data)`, `updateExpense(id, data)`, `deleteExpense(id)`
- `getCategories()`, `createCategory(data)`, ...
- `getBudgets()`, `createBudget(data)`, ...
- `getHoldings()`, `createHolding(data)`, ...
- `getInvestmentTransactions(params)`, `createInvestmentTransaction(data)`, ...
- `getIssues()`, `createIssue(data)`, `updateIssue(id, data)`, `deleteIssue(id)`
- `getLabels()`, `getUsers()`, ...

## Run (dev)

```bash
npm install
npm run dev  # http://localhost:5173
```

## Mobile Responsive Design

프론트엔드는 **Tailwind CSS breakpoint** 전략을 사용하여 모바일/태블릿/데스크톱 모두에서 최적화된 UI를 제공합니다.

### Tailwind Breakpoints

- `sm`: 640px 이상
- `md`: 768px 이상
- `lg`: 1024px 이상
- `xl`: 1280px 이상

### 반응형 전략

#### 1. 테이블 ↔ 카드 전환

**데스크톱** (md 이상): 전통적인 테이블 레이아웃 (정렬 가능, 모든 컬럼 표시)

```tsx
<table className="hidden md:table w-full text-left">
  <thead className="bg-gray-700">
    <tr>
      <th className="p-3">날짜</th>
      <th className="p-3">카테고리</th>
      <th className="p-3">금액</th>
      <th className="p-3">메모</th>
      <th className="p-3">작성자</th>
      <th className="p-3">작업</th>
    </tr>
  </thead>
  <tbody>
    {/* ... */}
  </tbody>
</table>
```

**모바일** (md 미만): 컴팩트 카드 레이아웃

```tsx
<div className="block md:hidden space-y-2">
  {items.map((item) => (
    <div key={item.id} className="bg-gray-700 p-3 rounded-lg relative">
      <div className="flex justify-between items-start">
        <span className="text-xs text-gray-400">{item.date}</span>
        <div className="flex gap-1">
          {/* 수정/삭제 아이콘 */}
          <button onClick={() => handleEdit(item)}>
            <svg className="w-4 h-4 text-sky-400">...</svg>
          </button>
          <button onClick={() => handleDelete(item.id)}>
            <svg className="w-4 h-4 text-red-400">...</svg>
          </button>
        </div>
      </div>
      <div className="mt-1">
        <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400">
          {getCategoryName(item.category_id)}
        </span>
      </div>
      <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-2">
        {formatCurrency(item.amount)}
      </div>
      <div className="text-xs text-gray-300 mt-1">{item.memo}</div>
      <div className="text-xs text-gray-500 mt-0.5">{getUserName(item.created_by)}</div>
    </div>
  ))}
</div>
```

#### 2. 반응형 폰트

```tsx
// 제목
<h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">

// 본문
<p className="text-xs sm:text-sm md:text-base">

// 카드 내 주요 정보
<div className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold">
```

#### 3. 반응형 간격

```tsx
// 컴포넌트 간 간격
<div className="space-y-3 sm:space-y-4 md:space-y-6">

// 카드 간 간격
<div className="space-y-2 sm:space-y-3">

// 그리드 갭
<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
```

#### 4. 반응형 그리드

```tsx
// 대시보드 카드 (2열 → 4열)
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">

// 통계 카드 (1열 → 2열 → 3열)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">

// 예산 차트 (2열 → 3열 → 6열)
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
```

### 적용 컴포넌트

#### ✅ Income.tsx
- **카테고리별 통계 테이블**: 데스크톱 테이블 → 모바일 카드
- **수익 내역 테이블**: 데스크톱 테이블 (6개 컬럼) → 모바일 카드

**모바일 카드 예시**:
```tsx
// 수익 내역 카드
<div className="block md:hidden space-y-2">
  {sortedIncomes.map((income) => (
    <div key={income.id} className="bg-gray-700 p-3 rounded-lg relative">
      <div className="flex justify-between items-start">
        <span className="text-xs text-gray-400">{income.date}</span>
        <div className="flex gap-1">
          <button onClick={() => handleOpenModal(income)} title="수정">
            <svg className="w-4 h-4 text-sky-400">...</svg>
          </button>
          <button onClick={() => handleDelete(income.id)} title="삭제">
            <svg className="w-4 h-4 text-red-400">...</svg>
          </button>
        </div>
      </div>
      <div className="mt-1">
        <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400">
          {getCategoryName(income.category_id)}
        </span>
      </div>
      <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-2">
        {formatCurrency(income.amount, currency, exchangeRate)}
      </div>
      <div className="text-xs text-gray-300 mt-1">{income.memo}</div>
      <div className="text-xs text-gray-500 mt-0.5">{getUserName(income.created_by)}</div>
    </div>
  ))}
</div>
```

#### ✅ Expenses.tsx
- **카테고리별 통계 테이블**: 데스크톱 테이블 → 모바일 카드
- **지출 내역 테이블**: 데스크톱 테이블 (6개 컬럼) → 모바일 카드
- Income.tsx와 동일한 패턴, 색상만 red 계열 사용

#### ✅ Dashboard.tsx
- **원형 차트 크기**: `w-16 sm:w-18 md:w-20` → `w-20 sm:w-20 md:w-24` (모바일에서 25% 증가)
- **타이틀 간결화**: "2025-10까지 누적 투자 순현금" → "누적 투자 순현금"
- **프로그레스 바 폰트**: `text-xs md:text-sm` → `text-xs sm:text-sm` (작은 화면에서도 읽기 쉽게)
- **월 선택 드롭다운**: 모바일에서도 충분한 크기 (160px 고정)

#### ⏳ Investments.tsx (예정)
- **보유 자산 테이블** (8개 컬럼): 데스크톱 테이블 → 모바일 카드
- **투자 거래 내역** (11개 컬럼): 데스크톱 테이블 → 모바일 카드
- **투자 계좌 테이블** (3개 컬럼): 간단한 카드 레이아웃

#### ✅ Issues.tsx
- 이미 카드 레이아웃으로 구현되어 모바일 친화적
- 칸반 보드 형식 (`grid grid-cols-1 md:grid-cols-3`)

### 반응형 개발 가이드

새 컴포넌트 작성 시 다음 패턴을 따르세요:

1. **테이블은 md 이상에서만 표시**
   ```tsx
   <table className="hidden md:table">...</table>
   ```

2. **카드는 md 미만에서만 표시**
   ```tsx
   <div className="block md:hidden space-y-2">...</div>
   ```

3. **폰트는 breakpoint별로 스케일**
   ```tsx
   text-xs sm:text-sm md:text-base lg:text-lg
   ```

4. **간격도 breakpoint별로 증가**
   ```tsx
   space-y-2 sm:space-y-3 md:space-y-4
   gap-2 sm:gap-3 md:gap-4
   ```

5. **그리드는 점진적으로 열 수 증가**
   ```tsx
   grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
   ```

## Quick Add (Gemini AI)

### Prerequisites

프로젝트 루트에 `.env` 파일 생성:

```bash
VITE_GEMINI_API_KEY=your-google-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.0-flash-exp  # (선택)
```

- [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 API 키 발급
- 최소 권한으로 관리

### 사용 흐름

1. 지출 화면에서 텍스트 입력 (예: "오늘 스타벅스에서 5천원")
2. "Gemini 분석" 버튼 클릭
3. AI가 날짜, 카테고리, 금액, 메모 자동 파싱
4. 제안된 데이터 검토 및 수정
5. 저장

### 오류 처리

- API 호출 실패 시 오류 메시지 표시
- 사용자가 수동으로 폼 수정 가능
- 저장은 정상적으로 동작

## Exchange Rate Control

### 기능

- **설정 → 환율 설정** 카드에서 USD → KRW 환율 입력
- 값은 브라우저 `localStorage`에 저장 (새로고침 후에도 유지)
- 상단 통화 토글 (KRW ↔ USD)과 모든 금액 표시에 즉시 반영

### 저장 위치

```tsx
// 환율 저장
localStorage.setItem('exchangeRate', rate.toString());

// 환율 불러오기
const savedRate = localStorage.getItem('exchangeRate');
```

### 적용 화면

- Dashboard
- Income
- Expenses
- Investments

## Component Details

### Dashboard.tsx

**API Calls**:
- `/api/expenses` — 월별 수입·지출 데이터
- `/api/categories` — 카테고리 목록
- `/api/budgets` — 예산 목록
- `/api/investments/holdings` — 보유 자산
- `/api/investments/transactions` — 투자 거래 (월별 현금 흐름 계산)

**Features**:
- 월 선택 드롭다운
- 총 수입/지출/순수입/예산 사용률 카드
- 카테고리별 지출/수입 프로그레스 바
- 예산 현황 원형 차트
- 투자 자산 배분 프로그레스 바
- 누적/월간 투자 현금 흐름

### Income.tsx & Expenses.tsx

**API Calls**:
- `/api/expenses` — 필터 포함 (from_date, to_date, category_id)
- `/api/categories` — 카테고리 목록

**Features**:
- 날짜/카테고리 필터
- 정렬 (날짜, 카테고리, 금액)
- 통계 (총액, 평균, 최대, 최다 카테고리)
- 카테고리별 통계 (테이블 또는 카드)
- CRUD 모달
- 모바일 카드 레이아웃

### Investments.tsx

**API Calls**:
- `/api/investments/accounts` — 계좌 CRUD
- `/api/investments/holdings` — 보유 자산 CRUD
- `/api/investments/transactions` — 거래 CRUD + 필터

**Features**:
- 투자 계좌 관리
- 보유 자산 관리 (손익 계산)
- 매수·매도 거래 내역 (필터: account_id, start_date, end_date, type)
- 자산 배분 파이 차트

### Issues.tsx

**API Calls**:
- `/api/issues` — 이슈 CRUD
- `/api/labels` — 라벨 조회
- `/api/users` — 사용자 목록

**Features**:
- 칸반 보드 (Open / In Progress / Closed)
- 이슈 생성/수정/삭제
- 라벨 및 우선순위 설정
- 담당자 지정

### Settings.tsx

**API Calls**:
- `/api/categories` — 카테고리 CRUD
- `/api/budgets` — 예산 CRUD
- `/api/users` — 사용자 CRUD

**Features**:
- 카테고리 관리 (type: income/expense)
- 예산 관리 (월별)
- 사용자 관리
- 환율 설정 (localStorage)
- 카테고리 삭제 시 연관 관계 검사

## Testing

프론트엔드 테스트는 **Vitest + React Testing Library** 기반 구성을 권장합니다.

```bash
# 예정
npm run test
```

**테스트 대상**:
- 컴포넌트 렌더링
- 사용자 인터랙션 (버튼 클릭, 폼 입력)
- API 호출 (모킹)
- 모바일/데스크톱 반응형 전환

## Future Enhancements

- Investments.tsx 모바일 반응형 완성
- 프론트엔드 테스트 자동화
- 상태 관리 라이브러리 (Zustand, Redux Toolkit 등) 도입
- 성능 최적화 (React.memo, useMemo, lazy loading)
- PWA 지원 (오프라인 모드, 푸시 알림)
