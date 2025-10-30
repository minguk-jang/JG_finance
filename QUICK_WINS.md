# 즉시 적용 가능한 성능 개선 (Quick Wins)
**예상 시간**: 1-2일 | **예상 개선**: 30-40%

---

## 1. Dashboard 최적화 (30분)

### 문제
`calculateStatistics()` 함수가 매 렌더링마다 전체 지출 배열 순회

### 해결책
**파일**: `components/Dashboard.tsx:145-177`

```tsx
// ❌ 현재 코드
const stats = calculateStatistics();

// ✅ 개선 코드
const stats = useMemo(() => {
  return calculateStatistics();
}, [expenses]);
```

**추가**:
```tsx
import React, { useEffect, useState, useMemo } from 'react';  // useMemo 추가
```

---

## 2. Expenses 최적화 (30분)

### 문제
`getSortedExpenses()` 함수가 매 렌더링마다 배열 정렬

### 해결책
**파일**: `components/Expenses.tsx:1-2, 188-216`

```tsx
// ❌ 현재 코드
const sortedExpenses = getSortedExpenses();

// ✅ 개선 코드
const sortedExpenses = useMemo(() => {
  return getSortedExpenses();
}, [expenses, sortConfig]);
```

---

## 3. Income 최적화 (30분)

동일하게 Expenses와 동일한 패턴 적용

**파일**: `components/Income.tsx` (동일한 구조)

```tsx
// getSortedIncomes() → useMemo 래핑
const sortedIncomes = useMemo(() => {
  return getSortedIncomes();
}, [incomes, sortConfig]);
```

---

## 4. Dashboard 데이터 필터링 (1시간)

### 문제
`api.getExpenses()` 호출 시 필터링 없음 → 모든 데이터 로드

### 해결책
**파일**: `components/Dashboard.tsx:59-70`

```tsx
// ❌ 현재 코드
const fetchData = async () => {
  try {
    const [expensesData, categoriesData, budgetsData, holdingsData, transactionsData, notesData, issuesData] =
      await Promise.all([
        api.getExpenses(),           // ← 전체 데이터!
        api.getCategories(),
        api.getBudgets(),            // ← 전체 데이터!
        // ...
      ]);

// ✅ 개선 코드
const fetchData = async () => {
  try {
    const currentMonth = getLocalDateString().slice(0, 7);  // YYYY-MM
    const monthStart = `${currentMonth}-01`;
    const monthEnd = `${currentMonth}-31`;

    const [expensesData, categoriesData, budgetsData] =
      await Promise.all([
        api.getExpenses({
          from_date: monthStart,
          to_date: monthEnd,  // ← 현재 월만!
        }),
        api.getCategories(),
        api.getBudgets({ month: currentMonth }),  // ← 현재 월만!
      ]);

    // Holdings/Transactions는 필요할 때만 로드하거나 생략
    // notesData, issuesData도 필요시만 로드
```

---

## 5. Service Worker 폴링 개선 (5분)

### 문제
매 1시간마다 업데이트 확인 (불필요하게 자주)

### 해결책
**파일**: `App.tsx:67-71`

```tsx
// ❌ 현재 코드
setInterval(() => {
  registration.update().catch((err) => {
    console.warn('[App] Service Worker update check failed:', err);
  });
}, 3600000);  // 1시간

// ✅ 개선 코드 (6시간으로 변경)
setInterval(() => {
  registration.update().catch((err) => {
    console.warn('[App] Service Worker update check failed:', err);
  });
}, 6 * 3600000);  // 6시간 (백그라운드 API 호출 83% 감소)
```

---

## 6. Context API 준비 (예습용, Phase 2에서 구현)

향후 Props drilling을 제거하기 위해 Context 생성:

**새 파일 생성**: `lib/theme-context.tsx`
```tsx
import { createContext, useContext } from 'react';

interface ThemeContextType {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export default ThemeContext;
```

**새 파일 생성**: `lib/currency-context.tsx`
```tsx
import { createContext, useContext } from 'react';
import { Currency } from '../types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

export default CurrencyContext;
```

---

## 7. Notes 필터링 최적화 (선택사항, 15분)

### 문제
`getDaysAgo()` 계산이 매 렌더링마다 notes.map() 내에서 반복

### 해결책
**파일**: `components/Notes.tsx:155-218`

```tsx
// ✅ 메모이제이션 추가
const processedNotes = useMemo(() => {
  return notes.map(note => {
    const daysAgo = getDaysAgo(note.createdAt);
    const daysUntilDeletion = note.isCompleted && note.completedAt
      ? 7 - getDaysAgo(note.completedAt)
      : null;

    return {
      ...note,
      daysAgo,
      daysUntilDeletion,
    };
  });
}, [notes]);

// 렌더링에서 사용
{processedNotes.map((note) => (
  <Card key={note.id}>
    {/* note.daysAgo, note.daysUntilDeletion 사용 */}
  </Card>
))}
```

---

## 적용 순서

### Day 1 (오전)
1. Dashboard `calculateStatistics()` useMemo 적용
2. Expenses `getSortedExpenses()` useMemo 적용
3. Service Worker 폴링 간격 변경
4. 테스트 및 검증

### Day 1 (오후)
5. Dashboard 데이터 필터링 적용
6. Income `getSortedIncomes()` useMemo 적용
7. Notes 필터링 최적화 (선택)
8. 전체 테스트

### Day 2
9. Context 파일 생성 (Phase 2 준비)
10. 성능 측정 (Lighthouse)

---

## 검증 방법

### Chrome DevTools 사용
```javascript
// Console에서 렌더링 횟수 측정
let renderCount = 0;
console.count('Dashboard Render');

// Performance 탭에서 프로파일링
// 1. ⌘+Shift+P (Mac) / Ctrl+Shift+P (Windows)
// 2. "Performance" 검색
// 3. 기록 시작 → 페이지 상호작용 → 기록 중지
```

### 성능 개선 확인
```bash
# Before
npm run build
# dist 폴더 크기 확인

# After (개선 후)
npm run build
# dist 폴더 크기 확인 (10-20% 감소 예상)
```

---

## 예상 결과

| 개선 사항 | 효과 | 난이도 |
|---------|------|--------|
| Dashboard useMemo | 매 렌더링 10-15% 더 빠름 | 쉬움 |
| Expenses useMemo | 매 렌더링 8-10% 더 빠름 | 쉬움 |
| Dashboard 필터링 | 초기 로딩 50-60% 빠름 | 중간 |
| Service Worker | 백그라운드 API 83% 감소 | 쉬움 |

**총 예상 개선**: 30-40%

---

## 주의사항

1. **테스트 필수**: 각 변경 후 해당 페이지 기능 테스트
2. **의존성 확인**: useMemo 의존성 배열을 정확하게 지정
3. **점진적 적용**: 한 번에 하나씩 적용하여 문제 격리
4. **성능 측정**: Lighthouse로 Before/After 비교

---

## 다음 단계 (Phase 2)

- Context API로 Props drilling 제거
- 컴포넌트 메모이제이션 (QuickAccessCard, IssueCard)
- 코드 분할 (Lazy loading)
- API 캐싱 레이어
