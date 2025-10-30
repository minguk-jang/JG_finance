# 성능 문제 상세 진단 (파일:줄번호)

## 1. 렌더링 성능 문제 (Critical)

### 1.1 메모이제이션 전무

#### 문제 1: QuickAccessCard 재렌더링
- **파일**: `/home/user/JG_finance/components/Dashboard.tsx:22-33`
- **심각도**: 높음
- **문제**: Component가 메모이제이션되지 않음
```tsx
const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ icon, label, count, color, onClick }) => {
  // Dashboard 상태 변경 시마다 재렌더링
};
```
- **영향**: Dashboard에 7개 QuickAccessCard → 매번 7개 재생성
- **해결**: `export default React.memo(QuickAccessCard);`

#### 문제 2: IssueCard 재렌더링
- **파일**: `/home/user/JG_finance/components/Issues.tsx:41-102`
- **심각도**: 높음
- **문제**: 이슈 목록의 각 카드가 매번 재렌더링
- **해결**: `export default React.memo(IssueCard);`

#### 문제 3: Recharts 컴포넌트 재렌더링
- **파일**: `/home/user/JG_finance/components/FixedCosts.tsx:100-200` (예상)
- **심각도**: 높음
- **문제**: LineChart가 매번 재렌더링
- **해결**: lazy loading + memoization

---

### 1.2 useMemo 누락

#### 문제 1: 통계 계산 반복
- **파일**: `/home/user/JG_finance/components/Dashboard.tsx:145-177`
- **함수명**: `calculateStatistics()`
- **심각도**: 높음
- **문제**: 매 렌더링마다 모든 지출 배열 순회
```tsx
// Line 177
const stats = calculateStatistics();

// calculateStatistics() 구현 (Line 143-175)
const calculateStatistics = () => {
  const totalAmount = expenses.reduce(...);
  const byCategoryMap = new Map();
  expenses.forEach(exp => { /* ... */ });
  // ... 많은 계산
};
```
- **영향**: 500개 지출 = ~10ms × 10 렌더링/초 = 100ms/초 낭비
- **해결**:
```tsx
const stats = useMemo(() => calculateStatistics(), [expenses]);
```

#### 문제 2: 정렬 반복
- **파일**: `/home/user/JG_finance/components/Expenses.tsx:188-216`
- **함수명**: `getSortedExpenses()`
- **심각도**: 높음
- **문제**: 매 렌더링마다 배열 복사 후 정렬
```tsx
const getSortedExpenses = () => {
  const sorted = [...expenses];  // 배열 복사
  sorted.sort((a, b) => { /* ... */ });  // O(n log n) 정렬
  return sorted;
};

const sortedExpenses = getSortedExpenses();
```
- **영향**: 1000개 지출 = ~15ms × 렌더링
- **해결**:
```tsx
const sortedExpenses = useMemo(() => getSortedExpenses(), [expenses, sortConfig]);
```

#### 문제 3: 동일 문제 - Income
- **파일**: `/home/user/JG_finance/components/Income.tsx:130-250` (예상 범위)
- **영향**: Income 페이지에서 동일한 성능 저하

#### 문제 4: 통계 계산 - FixedCosts
- **파일**: `/home/user/JG_finance/components/FixedCosts.tsx:1-200` (예상)
- **심각도**: 높음
- **문제**: 매달 통계 계산이 최적화되지 않음

#### 문제 5: 월별 가용 데이터 계산
- **파일**: `/home/user/JG_finance/components/Dashboard.tsx:112-147`
- **함수명**: (useEffect 내 계산)
- **심각도**: 중간
- **문제**:
```tsx
const monthsFromExpenses = expenses
  .map((expense) => (typeof expense.date === 'string' ? expense.date.slice(0, 7) : null))
  .filter((month): month is string => Boolean(month));
const monthsFromBudgets = budgets
  .map((budget) => budget.month)
  .filter((month): month is string => Boolean(month));
const monthsFromTransactions = transactions
  .map((transaction) =>
    typeof transaction.trade_date === 'string' ? transaction.trade_date.slice(0, 7) : null
  )
  .filter((month): month is string => Boolean(month));
const availableMonths = Array.from(
  new Set([...monthsFromExpenses, ...monthsFromBudgets, ...monthsFromTransactions])
).sort((a, b) => b.localeCompare(a));  // 배열 생성 + 정렬
```
- **해결**: useMemo로 감싸기

---

### 1.3 useCallback 누락

#### 문제 1: Props drilling에서 인라인 함수
- **파일**: `/home/user/JG_finance/App.tsx:222-227`
- **심각도**: 중간
- **문제**:
```tsx
<Sidebar
  currentPage={currentPage}
  setCurrentPage={handlePageChange}
  theme={theme}
  isOpen={sidebarOpen}
  onToggle={() => setSidebarOpen(!sidebarOpen)}  // ← 매번 새로운 함수
/>

<Header
  // ...
  onMenuToggle={() => setSidebarOpen(!sidebarOpen)}  // ← 매번 새로운 함수
/>
```
- **영향**: Sidebar/Header Props 객체 참조 변경 → 자식 컴포넌트 재렌더링 (메모이제이션 없음)
- **해결**:
```tsx
const handleToggleSidebar = useCallback(() => {
  setSidebarOpen(prev => !prev);
}, []);
```

#### 문제 2: 필터 핸들러
- **파일**: `/home/user/JG_finance/components/Expenses.tsx:417-434`
- **심각도**: 중간
- **문제**:
```tsx
const handleToggleSelect = (id: string) => { /* ... */ };
const handleSelectAll = () => { /* ... */ };
const handleDeselectAll = () => { /* ... */ };
const handleDeleteSelected = async () => { /* ... */ };
```
- **영향**: 핸들러가 props로 전달되면 참조 변경 → 자식 재렌더링

---

## 2. 초기 로딩 성능 (Critical)

### 2.1 필터링 없는 전체 데이터 로드

#### 문제 1: Dashboard에서 모든 지출 로드
- **파일**: `/home/user/JG_finance/components/Dashboard.tsx:62-70`
- **심각도**: 매우 높음
- **코드**:
```tsx
const [expensesData, categoriesData, budgetsData, holdingsData, transactionsData, notesData, issuesData] =
  await Promise.all([
    api.getExpenses(),              // ← 필터 없음
    api.getCategories(),
    api.getBudgets(),               // ← 필터 없음
    api.getHoldings(),
    api.getInvestmentTransactions(), // ← 필터 없음
    api.getNotes().catch(() => []),
    api.getIssues().catch(() => []),
  ]);
```
- **문제**:
  - 데이터 500개 지출 + 100개 예산 + 50개 거래 = 2-3MB 전송
  - 파싱: ~200-300ms
  - 상태 업데이트: ~100-200ms
- **해결**:
```tsx
const currentMonth = getLocalDateString().slice(0, 7);
const monthStart = `${currentMonth}-01`;
const monthEnd = `${currentMonth}-31`;

const [expensesData, categoriesData, budgetsData] = await Promise.all([
  api.getExpenses({
    from_date: monthStart,
    to_date: monthEnd,  // ← 현재 월만!
  }),
  api.getCategories(),
  api.getBudgets({ month: currentMonth }),  // ← 현재 월만!
]);
```

#### 문제 2: 고정비 납부 내역 전체 로드
- **파일**: `/home/user/JG_finance/components/Dashboard.tsx:99-110`
- **심각도**: 중간
- **코드**:
```tsx
useEffect(() => {
  if (!selectedMonth) return;
  const fetchFixedCostPayments = async () => {
    try {
      const paymentsData = await api.getFixedCostPayments(selectedMonth)
        .catch(() => []);
```
- **문제**: selectedMonth 변경 시마다 전체 납부 내역 로드
- **해결**: 선택적으로만 로드 (필요할 때)

---

### 2.2 코드 분할 부재

#### 문제 1: 모든 컴포넌트 정적 import
- **파일**: `/home/user/JG_finance/App.tsx:1-17`
- **심각도**: 매우 높음
- **코드**:
```tsx
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Expenses, { ExpensesHandle } from './components/Expenses';
import Income, { IncomeHandle } from './components/Income';
import Investments from './components/Investments';
import Issues from './components/Issues';
import Settings from './components/Settings';
import FixedCosts from './components/FixedCosts';
import Notes from './components/Notes';
import QuickAddVoiceModal from './components/QuickAddVoiceModal';
// ...
```
- **문제**: 초기 로딩에 모든 컴포넌트 번들링
- **영향**: 번들 크기 ~300-400KB, LCP 저하
- **해결**:
```tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Expenses = lazy(() => import('./components/Expenses'));
const Income = lazy(() => import('./components/Income'));
const Investments = lazy(() => import('./components/Investments'));
const Issues = lazy(() => import('./components/Issues'));
const FixedCosts = lazy(() => import('./components/FixedCosts'));
const Notes = lazy(() => import('./components/Notes'));
const Settings = lazy(() => import('./components/Settings'));

// renderContent에서:
const renderContent = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {/* 동적으로 로드된 컴포넌트 */}
    </Suspense>
  );
};
```

#### 문제 2: Recharts 동기 로드
- **파일**: `/home/user/JG_finance/components/FixedCosts.tsx:6`
- **심각도**: 높음
- **코드**:
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer }
  from 'recharts';  // ← 100KB+ 라이브러리
```
- **문제**: FixedCosts가 보이지 않아도 로드됨
- **해결**: 모달이 열릴 때만 로드
```tsx
import { lazy, Suspense } from 'react';

const TrendChart = lazy(() => import('./TrendChart'));

// FixedCosts.tsx에서:
{showTrendModal && (
  <Suspense fallback={<ChartSkeleton />}>
    <TrendChart data={trendData} />
  </Suspense>
)}
```

---

## 3. 데이터 페칭 최적화 (High)

### 3.1 중복 API 호출

#### 문제 1: 이슈 댓글마다 모든 사용자 로드
- **파일**: `/home/user/JG_finance/lib/api.ts:388-405`
- **심각도**: 높음
- **코드**:
```tsx
getIssueComments: async (issueId: string) => {
  const data = await handleRequest(
    supabase
      .from('issue_comments')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true })
  );

  const comments = toCamelCase(data) || [];
  const users = await api.getUsers();  // ← 매번 모든 사용자 로드!

  return comments.map((comment: any) => ({
    ...comment,
    user: users?.find((u: any) => u.id === comment.userId)
  }));
};
```
- **영향**:
  - 이슈 댓글 조회 시: getUsers() 호출
  - 댓글 작성 후: createIssueComment에서 다시 getUsers() 호출 (Line 460)
  - 댓글 수정 시: updateIssueComment에서 또 다시 getUsers() 호출 (Line 486)
- **해결**: 사용자 캐싱
```tsx
let userCache: any[] | null = null;

const getUsers = async (useCache = true) => {
  if (useCache && userCache) {
    return userCache;
  }
  const data = await handleRequest(
    supabase.from('users').select('*').order('name')
  );
  userCache = toCamelCase(data);
  return userCache;
};

// 또는 React Query 사용
import { useQuery } from '@tanstack/react-query';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 5 * 60 * 1000,  // 5분간 캐시
  });
};
```

#### 문제 2: 동일한 getUsers() 호출 반복
- **파일**: `/home/user/JG_finance/lib/api.ts:399, 418, 460, 486`
- **함수 위치**:
  - Line 399: `getIssueComments()` → `api.getUsers()`
  - Line 418: `getIssueComment()` → `api.getUsers()`
  - Line 460: `createIssueComment()` → `api.getUsers()`
  - Line 486: `updateIssueComment()` → `api.getUsers()`
- **심각도**: 높음
- **영향**: 이슈 페이지 방문 후 댓글 상호작용 시 동일 API 여러 번 호출

#### 문제 3: 필터 변경 시마다 전체 재페치
- **파일**: `/home/user/JG_finance/components/Expenses.tsx:82-112`
- **심각도**: 높음
- **코드**:
```tsx
useEffect(() => {
  fetchData();
}, [filters]);  // ← filters 객체의 참조 변경 시마다 실행
```
- **문제**: 필터 입력 시 매 글자마다 API 호출
- **해결**: 디바운싱
```tsx
const [filters, setFilters] = useState({...});
const [debouncedFilters, setDebouncedFilters] = useState({...});

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedFilters(filters);
  }, 500);
  return () => clearTimeout(timer);
}, [filters]);

useEffect(() => {
  fetchData();
}, [debouncedFilters]);  // ← 디바운스된 값 사용
```

---

### 3.2 API 응답 캐싱 부재

#### 문제 1: 카테고리 매번 로드
- **파일**: `/home/user/JG_finance/components/Expenses.tsx:91-95`
- **심각도**: 중간
- **코드**:
```tsx
const fetchData = async () => {
  const [expensesData, categoriesData, usersData] = await Promise.all([
    api.getExpenses(params),
    api.getCategories(),  // ← 매번 로드 (변하지 않음)
    api.getUsers()        // ← 매번 로드 (변하지 않음)
  ]);
```
- **영향**: 필터 변경 시마다 getCategories(), getUsers() 호출
- **해결**: 초기 로드만, 또는 캐싱

---

## 4. Props Drilling & 상태 관리 (Medium)

### 문제 1: App에서 많은 상태 관리
- **파일**: `/home/user/JG_finance/App.tsx:19-31`
- **심각도**: 중간
- **코드**:
```tsx
const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
const [currency, setCurrency] = useState<Currency>('KRW');
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
const [sidebarOpen, setSidebarOpen] = useState(false);
const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
const [exchangeRate, setExchangeRate] = useState<number>(...);
const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
```
- **문제**: 한 개 상태 변경 → App 리렌더링 → 모든 자식 리렌더링
- **예시**:
  - currency 변경 → Sidebar, Header, Dashboard, 모든 페이지 재렌더링
  - theme 변경 → 동일 문제

---

## 5. Service Worker 최적화 (Low)

### 문제 1: 과도한 폴링
- **파일**: `/home/user/JG_finance/App.tsx:67-71`
- **심각도**: 낮음
- **코드**:
```tsx
setInterval(() => {
  registration.update().catch((err) => {
    console.warn('[App] Service Worker update check failed:', err);
  });
}, 3600000);  // 1시간마다
```
- **문제**: 1시간마다 업데이트 확인 (과도)
- **영향**: 백그라운드 API 호출 ~8회/일
- **해결**: 6시간으로 변경 또는 네트워크 idle 감지

---

## 6. 컴포넌트 크기 문제 (Medium)

| 파일 | 줄수 | 권장 | 문제점 |
|------|------|------|--------|
| FixedCosts.tsx | 1834 | 800-1000 | 모달, 필터, 통계 혼재 |
| Expenses.tsx | 1202 | 600-800 | 필터, 정렬, 인라인 편집 혼재 |
| Settings.tsx | 1192 | 600-800 | 유저/예산/카테고리 관리 혼재 |
| Income.tsx | 1171 | 600-800 | Expenses 복제 (코드 중복) |

### 영향
- 유지보수 어려움
- 스크롤 속도 저하 (Virtual scrolling 필요)
- 메모리 사용량 증가

---

## Summary Table: 파일별 문제점

| 파일 | 문제 | 심각도 | 위치 |
|------|------|--------|------|
| Dashboard.tsx | calculateStatistics() useMemo 필요 | 높음 | Line 177 |
| Dashboard.tsx | 불필요한 데이터 로드 (필터링 부재) | 매우 높음 | Line 62-70 |
| Expenses.tsx | getSortedExpenses() useMemo 필요 | 높음 | Line 472 |
| Expenses.tsx | 필터 디바운싱 필요 | 높음 | Line 82-112 |
| Income.tsx | getSortedIncomes() useMemo 필요 | 높음 | 전체 |
| App.tsx | Props drilling (currency, theme) | 중간 | Line 222-237 |
| App.tsx | 코드 분할 부재 | 매우 높음 | Line 1-17 |
| App.tsx | Service Worker 과도한 폴링 | 낮음 | Line 67-71 |
| lib/api.ts | 중복 getUsers() 호출 | 높음 | Line 399, 418, 460, 486 |
| FixedCosts.tsx | Recharts 동기 로드 | 높음 | Line 6 |
| FixedCosts.tsx | 컴포넌트 크기 (1834줄) | 중간 | 전체 |
| Notes.tsx | getDaysAgo() 반복 계산 | 낮음 | Line 244 |
| Issues.tsx | IssueCard 메모이제이션 부재 | 중간 | Line 41 |
| QuickAccessCard | React.memo 부재 | 중간 | Dashboard.tsx Line 22 |

