import React, { useEffect, useState, useMemo } from 'react';
import { Currency, Page } from '../types';
import Card from './ui/Card';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/dateUtils';

interface DashboardProps {
  currency: Currency;
  exchangeRate: number;
  onPageChange: (page: Page) => void;
}

interface QuickAccessCardProps {
  icon: string;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = React.memo(({ icon, label, count, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`${color} p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer flex flex-col items-center justify-center gap-1 sm:gap-2`}
    >
      <div className="text-2xl sm:text-3xl">{icon}</div>
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{count}</div>
      <div className="text-sm sm:text-base text-gray-700 opacity-90 font-medium">{label}</div>
    </button>
  );
});

const formatCurrency = (value: number, currency: Currency, exchangeRate: number) => {
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_USD_KRW_EXCHANGE_RATE;
  const amount = currency === 'USD' ? value / rate : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const Dashboard: React.FC<DashboardProps> = ({ currency, exchangeRate, onPageChange }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [fixedCostPayments, setFixedCostPayments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 현재 월만 필터링하여 가져오기 (성능 최적화)
        const currentMonth = getLocalDateString().slice(0, 7); // YYYY-MM
        const [year, month] = currentMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const fromDate = `${currentMonth}-01`;
        const toDate = `${currentMonth}-${lastDay.toString().padStart(2, '0')}`;

        const [expensesData, categoriesData, budgetsData, holdingsData, transactionsData, notesData, issuesData] = await Promise.all([
          api.getExpenses({ from_date: fromDate, to_date: toDate }), // 현재 월만 가져오기
          api.getCategories(),
          api.getBudgets(), // 예산은 모든 데이터 필요
          api.getHoldings(),
          api.getInvestmentTransactions(), // 거래 내역은 누적 계산에 필요
          api.getNotes().catch(() => []),
          api.getIssues().catch(() => []),
        ]);

        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        const normalizedBudgets = (Array.isArray(budgetsData) ? budgetsData : []).map((budget: any) => ({
          id: budget.id,
          categoryId: budget.categoryId,
          month: budget.month,
          limitAmount: budget.limitAmount ?? budget.limit_amount,
        }));
        setBudgets(normalizedBudgets);

        setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        setNotes(Array.isArray(notesData) ? notesData : []);
        setIssues(Array.isArray(issuesData) ? issuesData : []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('대시보드 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch fixed cost payments when month changes
  useEffect(() => {
    if (!selectedMonth) return;
    const fetchFixedCostPayments = async () => {
      try {
        const paymentsData = await api.getFixedCostPayments(selectedMonth).catch(() => []);
        setFixedCostPayments(Array.isArray(paymentsData) ? paymentsData : []);
      } catch (err) {
        console.error('Failed to fetch fixed cost payments:', err);
      }
    };
    fetchFixedCostPayments();
  }, [selectedMonth]);

  useEffect(() => {
    if (loading) return;

    const nowMonth = getLocalDateString().slice(0, 7); // YYYY-MM
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
    ).sort(
      (a, b) => b.localeCompare(a)
    );

    if (availableMonths.length === 0) {
      setSelectedMonth(nowMonth);
      return;
    }

    if (!selectedMonth) {
      if (availableMonths.includes(nowMonth)) {
        setSelectedMonth(nowMonth);
      } else {
        setSelectedMonth(availableMonths[0]);
      }
    } else if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [loading, expenses, budgets, transactions, selectedMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl text-gray-400">로딩중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card title="대시보드 에러">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  const nowMonth = new Date().toISOString().slice(0, 7);
  const activeMonth = selectedMonth || nowMonth;

  // 카테고리 매핑 (useMemo로 캐싱)
  const categoriesById = useMemo(
    () => new Map(categories.map((cat: any) => [cat.id, cat])),
    [categories]
  );

  // 월별 지출/수입 필터링 (useMemo로 캐싱)
  const { monthlyExpenses, monthlyIncomes } = useMemo(() => {
    const expenses_filtered = expenses.filter(
      (expense: any) =>
        expense.date &&
        expense.date.startsWith(activeMonth) &&
        categoriesById.get(expense.categoryId)?.type === 'expense'
    );

    const incomes_filtered = expenses.filter(
      (expense: any) =>
        expense.date &&
        expense.date.startsWith(activeMonth) &&
        categoriesById.get(expense.categoryId)?.type === 'income'
    );

    return { monthlyExpenses: expenses_filtered, monthlyIncomes: incomes_filtered };
  }, [expenses, activeMonth, categoriesById]);

  // 총 지출/수입 계산 (useMemo로 캐싱)
  const { totalExpense, totalIncome, netIncome } = useMemo(() => {
    const expense = monthlyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const income = monthlyIncomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
    return { totalExpense: expense, totalIncome: income, netIncome: income - expense };
  }, [monthlyExpenses, monthlyIncomes]);

  // 예산 관련 계산 (useMemo로 캐싱)
  const { monthBudgets, totalBudgetLimit, budgetUsage } = useMemo(() => {
    const budgets_filtered = budgets.filter((budget: any) => budget.month === activeMonth);
    const limit = budgets_filtered.reduce((sum: number, budget: any) => sum + (budget.limitAmount || 0), 0);
    const usage = limit > 0 ? (totalExpense / limit) * 100 : 0;
    return { monthBudgets: budgets_filtered, totalBudgetLimit: limit, budgetUsage: usage };
  }, [budgets, activeMonth, totalExpense]);

  // 투자 자산 평가액 (useMemo로 캐싱)
  const totalHoldingsValue = useMemo(() => {
    return holdings.reduce((sum: number, holding: any) => {
      const qty = holding.qty ?? 0;
      const price = holding.current_price ?? holding.currentPrice ?? 0;
      return sum + price * qty;
    }, 0);
  }, [holdings]);

  // 거래 계산 헬퍼 함수
  const getTransactionTotals = (list: any[]) =>
    list.reduce(
      (acc, transaction) => {
        const fees = transaction.fees ?? 0;
        const gross = (transaction.quantity ?? 0) * (transaction.price ?? 0);
        if (transaction.type === 'BUY') {
          acc.buyAmount += gross + fees;
          acc.buyCount += 1;
        } else if (transaction.type === 'SELL') {
          acc.sellAmount += gross - fees;
          acc.sellCount += 1;
        }
        return acc;
      },
      { buyAmount: 0, sellAmount: 0, buyCount: 0, sellCount: 0 }
    );

  // 거래 내역 필터링 및 계산 (useMemo로 캐싱)
  const {
    cumulativeTransactions,
    monthlyTransactions,
    cumulativeTotals,
    monthlyTotals,
    cumulativeNetCash,
    monthlyNetCash,
    monthlyTransactionCount,
  } = useMemo(() => {
    const [year, month] = activeMonth.split('-').map(Number);
    const endOfMonth = new Date(year, month, 0); // 월의 마지막 날
    const endDateStr = getLocalDateString(endOfMonth);

    const cumulative = transactions.filter(
      (transaction: any) =>
        typeof transaction.trade_date === 'string' && transaction.trade_date <= endDateStr
    );
    const monthly = transactions.filter(
      (transaction: any) =>
        typeof transaction.trade_date === 'string' &&
        transaction.trade_date.slice(0, 7) === activeMonth
    );

    const cumulativeTotals = getTransactionTotals(cumulative);
    const monthlyTotals = getTransactionTotals(monthly);

    return {
      cumulativeTransactions: cumulative,
      monthlyTransactions: monthly,
      cumulativeTotals,
      monthlyTotals,
      cumulativeNetCash: cumulativeTotals.sellAmount - cumulativeTotals.buyAmount,
      monthlyNetCash: monthlyTotals.sellAmount - monthlyTotals.buyAmount,
      monthlyTransactionCount: monthly.length,
    };
  }, [transactions, activeMonth]);

  // 사용 가능한 월 목록 계산 (useMemo로 캐싱)
  const availableMonths = useMemo(() => {
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

    return Array.from(
      new Set([...monthsFromExpenses, ...monthsFromBudgets, ...monthsFromTransactions])
    ).sort((a, b) => b.localeCompare(a));
  }, [expenses, budgets, transactions]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(event.target.value);
  };

  // Quick Access 카운트 (useMemo로 캐싱)
  const { pendingNotesCount, unpaidPaymentsCount, openIssuesCount } = useMemo(() => ({
    pendingNotesCount: notes.filter((note: any) => !note.isCompleted).length,
    unpaidPaymentsCount: fixedCostPayments.filter((payment: any) => payment.status !== 'paid').length,
    openIssuesCount: issues.filter((issue: any) => issue.status === 'Open' || issue.status === 'In Progress').length,
  }), [notes, fixedCostPayments, issues]);

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold surface-text">대시보드</h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-400 mt-1 sm:mt-2">재무 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <label htmlFor="month-select" className="text-xs font-medium text-gray-300 mb-1.5">월 선택</label>
          <div className="relative w-40 sm:w-44 md:w-48">
            <select
              id="month-select"
              value={activeMonth}
              onChange={handleMonthChange}
              className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            >
              {availableMonths.length === 0 && <option value={nowMonth} className="bg-gray-800">{nowMonth}</option>}
              {availableMonths.map((month) => (
                <option key={month} value={month} className="bg-gray-800">{month}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 sm:px-3 text-gray-400">
              <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 주요 재무 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <button
          onClick={() => onPageChange('Income')}
          className="text-left cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <Card title="총 수입">
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-400">
              {formatCurrency(totalIncome, currency, exchangeRate)}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">{monthlyIncomes.length}개</p>
          </Card>
        </button>

        <button
          onClick={() => onPageChange('Expenses')}
          className="text-left cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <Card title="총 지출">
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-400">
              {formatCurrency(totalExpense, currency, exchangeRate)}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">{monthlyExpenses.length}개</p>
          </Card>
        </button>

        <button
          onClick={() => onPageChange('Income')}
          className="text-left cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <Card title="순수입">
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-sky-400">
              {formatCurrency(netIncome, currency, exchangeRate)}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {netIncome >= 0 ? '흑자' : '적자'}
            </p>
          </Card>
        </button>

        <button
          onClick={() => onPageChange('Expenses')}
          className="text-left cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <Card title="예산 사용률">
            {totalBudgetLimit > 0 ? (
              <>
                <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${budgetUsage > 100 ? 'text-red-400' : 'text-indigo-400'}`}>
                  {budgetUsage.toFixed(1)}%
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  {formatCurrency(totalExpense, currency, exchangeRate)}
                </p>
              </>
            ) : (
              <div className="text-xs sm:text-sm md:text-base text-gray-400">예산 없음</div>
            )}
          </Card>
        </button>
      </div>

      {/* Quick Access */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-300 mb-2 sm:mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <QuickAccessCard
            icon="📝"
            label="간단 노트"
            count={pendingNotesCount}
            color="bg-blue-200 hover:bg-blue-300"
            onClick={() => onPageChange('Notes')}
          />
          <QuickAccessCard
            icon="💳"
            label="고정비 미납"
            count={unpaidPaymentsCount}
            color="bg-purple-200 hover:bg-purple-300"
            onClick={() => onPageChange('FixedCosts')}
          />
          <QuickAccessCard
            icon="🎯"
            label="이슈"
            count={openIssuesCount}
            color="bg-orange-200 hover:bg-orange-300"
            onClick={() => onPageChange('Issues')}
          />
          <button
            className="bg-gradient-to-r from-pink-200 to-rose-200 hover:from-pink-300 hover:to-rose-300 p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer flex flex-col items-center justify-center gap-1 sm:gap-2"
          >
            <div className="text-3xl sm:text-4xl">💖</div>
            <div className="text-xs sm:text-sm text-gray-700 font-semibold">쭈여니 사랑해</div>
          </button>
        </div>
      </div>

      {/* 상세 정보 토글 */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-300">상세 분석</h3>
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Card title="누적 투자 순현금">
          <div
            className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${
              cumulativeNetCash >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {cumulativeNetCash >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(cumulativeNetCash), currency, exchangeRate)}
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            <span className="hidden sm:inline">누적 </span>매수 {formatCurrency(cumulativeTotals.buyAmount, currency, exchangeRate)} <span className="hidden sm:inline">· 누적 </span>매도{' '}
            {formatCurrency(cumulativeTotals.sellAmount, currency, exchangeRate)}
          </p>
        </Card>
        <Card title={`${activeMonth} 월간 현금흐름`}>
          <div
            className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${
              monthlyNetCash >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {monthlyNetCash >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(monthlyNetCash), currency, exchangeRate)}
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            매수 {formatCurrency(monthlyTotals.buyAmount, currency, exchangeRate)} <span className="hidden sm:inline">·</span> 매도{' '}
            {formatCurrency(monthlyTotals.sellAmount, currency, exchangeRate)}
          </p>
        </Card>
        <Card title={`${activeMonth} 거래 요약`}>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-indigo-400">{monthlyTransactionCount}건</div>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            매수 {monthlyTotals.buyCount}건 <span className="hidden sm:inline">·</span> 매도 {monthlyTotals.sellCount}건
          </p>
        </Card>
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              <Card title="카테고리별 지출">
                {monthlyExpenses.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">이번 달 지출 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {categories
                      .filter((cat: any) => cat.type === 'expense')
                      .map((cat: any) => {
                        const catExpenses = monthlyExpenses.filter((exp: any) => exp.categoryId === cat.id);
                        const catTotal = catExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
                        if (catTotal === 0) return null;
                        const percentage = totalExpense > 0 ? (catTotal / totalExpense) * 100 : 0;

                        return (
                          <div key={cat.id}>
                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                              <span className="truncate mr-2">{cat.name}</span>
                              <span className="text-red-400 font-semibold flex-shrink-0">{formatCurrency(catTotal, currency, exchangeRate)}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 mt-0.5">{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                )}
              </Card>

              <Card title="카테고리별 수입">
                {monthlyIncomes.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">이번 달 수입 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {categories
                      .filter((cat: any) => cat.type === 'income')
                      .map((cat: any) => {
                        const catIncomes = monthlyIncomes.filter((inc: any) => inc.categoryId === cat.id);
                        const catTotal = catIncomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
                        if (catTotal === 0) return null;
                        const percentage = totalIncome > 0 ? (catTotal / totalIncome) * 100 : 0;

                        return (
                          <div key={cat.id}>
                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                              <span className="truncate mr-2">{cat.name}</span>
                              <span className="text-green-400 font-semibold flex-shrink-0">{formatCurrency(catTotal, currency, exchangeRate)}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 mt-0.5">{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                )}
              </Card>
            </div>

            {monthBudgets.length > 0 && (
              <Card title={`예산 현황 (${activeMonth})`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                  {monthBudgets.map((budget: any) => {
                    const categoryId = budget.categoryId;
                    const category = categoriesById.get(categoryId);
                    const limit = budget.limitAmount || 0;
                    const spent = monthlyExpenses
                      .filter((expense: any) => expense.categoryId === categoryId)
                      .reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
                    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

                    return (
                      <div key={budget.id} className="flex flex-col items-center">
                        <div className="relative w-20 sm:w-20 md:w-24 h-20 sm:h-20 md:h-24">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#374151"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={percentage > 100 ? '#EF4444' : '#0EA5E9'}
                              strokeWidth="3"
                              strokeDasharray={`${Math.min(percentage, 100)}, 100`}
                            />
                          </svg>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm font-semibold">
                            {Math.round(percentage)}%
                          </div>
                        </div>
                        <p className="mt-2 sm:mt-2 text-xs text-gray-400 text-center truncate w-full px-1">{category?.name || '미지정'}</p>
                        <p className="text-xs text-gray-500 truncate w-full text-center px-1">{formatCurrency(spent, currency, exchangeRate)}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {holdings.length > 0 && (
              <Card title="투자 자산">
                <div className="space-y-2 md:space-y-3">
                  {holdings.map((holding: any) => {
                    const value = (holding.current_price ?? holding.currentPrice ?? 0) * (holding.qty ?? 0);
                    if (value === 0) return null;
                    const percentage = totalHoldingsValue > 0 ? (value / totalHoldingsValue) * 100 : 0;

                    return (
                      <div key={holding.id}>
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="truncate mr-2">{holding.name ?? holding.symbol ?? `Asset ${holding.id}`}</span>
                          <span className="text-indigo-400 font-semibold flex-shrink-0">{formatCurrency(value, currency, exchangeRate)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400 mt-0.5">{percentage.toFixed(1)}%</div>
                      </div>
                    );
                  }).filter(Boolean)}
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-700 text-center">
                    <p className="text-xs sm:text-sm text-gray-400">총 평가액</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-400">{formatCurrency(totalHoldingsValue, currency, exchangeRate)}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
