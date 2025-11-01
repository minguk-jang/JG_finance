import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Currency, FixedCost, FixedCostPayment, Category, Expense } from '../types';
import Card from './ui/Card';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateFixedCostRecommendations } from '../lib/fixedCostGemini';
import { useAuth } from '../lib/auth';

interface FixedCostsProps {
  currency: Currency;
  exchangeRate: number;
}

type VariableHistoryEntry = {
  yearMonth: string;
  amount: number | null;
  actualAmount: number | null;
  scheduledAmount: number | null;
  status: FixedCostPayment['status'];
};

interface VariablePaymentStat {
  average: number | null;
  max: number | null;
  min: number | null;
  count: number;
  entries: VariableHistoryEntry[];
  latestAmount: number | null;
}

const formatCurrency = (value: number, currency: Currency, exchangeRate: number) => {
  const amount = currency === 'USD' ? value / exchangeRate : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const FixedCosts: React.FC<FixedCostsProps> = ({ currency, exchangeRate }) => {
  const { user } = useAuth();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [payments, setPayments] = useState<FixedCostPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  // Monthly summary statistics
  const [currentMonthSummary, setCurrentMonthSummary] = useState<any>(null);
  const [prevMonthSummary, setPrevMonthSummary] = useState<any>(null);

  // Trend data for 6 months
  const [trendData, setTrendData] = useState<any[]>([]);

  // Current selected month
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [processingPayment, setProcessingPayment] = useState<{ payment: FixedCostPayment; cost: FixedCost } | null>(null);
  const [showExpenseSelectModal, setShowExpenseSelectModal] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<{ payment: FixedCostPayment; cost: FixedCost } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    amount: '',
    paymentDay: 1,
    startDate: '',
    endDate: '',
    memo: '',
    isFixedAmount: true,
    isShared: false,
    colorOverride: null as string | null,
  });

  // Payment form state
  const [paymentFormData, setPaymentFormData] = useState({
    actualAmount: '',
    paymentDate: '',
    memo: '',
  });

  // Expense selection state
  const [availableExpenses, setAvailableExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseFilters, setExpenseFilters] = useState({
    categoryId: '',
    createdBy: '',
  });
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [variablePaymentStats, setVariablePaymentStats] = useState<Record<string, VariablePaymentStat>>({});
  const [scheduledAmountModal, setScheduledAmountModal] = useState<{ payment: FixedCostPayment; cost: FixedCost } | null>(null);
  const [scheduledAmountDraft, setScheduledAmountDraft] = useState<string>('');
  const [isSavingScheduledAmount, setIsSavingScheduledAmount] = useState(false);
  const [statInfoModal, setStatInfoModal] = useState<{ payment: FixedCostPayment; cost: FixedCost } | null>(null);

  const fieldBaseClasses =
    'theme-field bg-gray-700 border-2 border-gray-600 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all';
  const inputFieldClasses = `${fieldBaseClasses} px-3 py-2 text-sm`;
  const selectFieldClasses = `${fieldBaseClasses} w-full px-3 py-2 text-sm appearance-none cursor-pointer pr-9`;
  const getLastNYearMonths = useCallback((baseYearMonth: string, count: number) => {
    if (!baseYearMonth) return [];
    const [year, month] = baseYearMonth.split('-').map(Number);
    if (!year || !month) return [];
    const baseDate = new Date(year, month - 1, 1);
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const target = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      results.push(`${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`);
    }
    return results;
  }, []);

  // Initialize selected month to current month
  useEffect(() => {
    const today = new Date();
    const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(yearMonth);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!selectedMonth) return;
    fetchData();
  }, [selectedMonth]);

  // Fetch trend data when trend modal opens
  useEffect(() => {
    if (showTrendModal && selectedMonth) {
      fetchTrendData();
    }
  }, [showTrendModal, selectedMonth]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await api.getUsers();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error('Failed to load users', err);
      }
    };
    loadUsers();
  }, []);

  const fetchExpensesForSelection = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      setExpenseLoading(true);
      const [year, month] = selectedMonth.split('-').map(Number);
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month, 0);

      const params: any = {
        from_date: fromDate.toISOString().slice(0, 10),
        to_date: toDate.toISOString().slice(0, 10),
      };

      if (expenseFilters.categoryId) {
        params.category_id = expenseFilters.categoryId;
      }
      if (expenseFilters.createdBy) {
        params.created_by = expenseFilters.createdBy;
      }

      const expensesData = await api.getExpenses(params);
      setAvailableExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (err: any) {
      console.error('Failed to fetch expenses for selection:', err);
      setError(err.message || '지출 목록을 불러오지 못했습니다.');
    } finally {
      setExpenseLoading(false);
    }
  }, [expenseFilters, selectedMonth]);

  useEffect(() => {
    if (!showExpenseSelectModal) return;
    fetchExpensesForSelection();
  }, [showExpenseSelectModal, fetchExpensesForSelection]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate previous month
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const [fixedCostsData, paymentsData, categoriesData, currentSummary, prevSummary] = await Promise.all([
        api.getFixedCosts({ year_month: selectedMonth, is_active: true }),
        api.getFixedCostPayments({ year_month: selectedMonth }),
        api.getCategories(),
        api.getFixedCostMonthlySummary(selectedMonth),
        api.getFixedCostMonthlySummary(prevYearMonth),
      ]);

      setFixedCosts(Array.isArray(fixedCostsData) ? fixedCostsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setCurrentMonthSummary(currentSummary);
      setPrevMonthSummary(prevSummary);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Generate payments for current month if not exists
  const generatePayments = async () => {
    try {
      await api.generateMonthlyFixedCostPayments(selectedMonth);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '월별 지출 생성에 실패했습니다.');
    }
  };

  const ensurePaymentForCost = async (cost: FixedCost) => {
    if (!selectedMonth) return;

    try {
      const existingPayments = await api.getFixedCostPayments({
        year_month: selectedMonth,
        fixed_cost_id: cost.id,
      });

      if (Array.isArray(existingPayments) && existingPayments.length > 0) {
        return;
      }

      const isFixedAmount = cost.isFixedAmount ?? true;
      const scheduledAmount = isFixedAmount ? cost.amount : null;

      await api.createFixedCostPayment({
        fixedCostId: cost.id,
        yearMonth: selectedMonth,
        scheduledAmount,
        status: 'scheduled',
      });
    } catch (err: any) {
      const message = err?.message || '';
      if (message.toLowerCase().includes('duplicate')) {
        return;
      }
      throw err;
    }
  };

  // Fetch trend data for the last 6 months
  const fetchTrendData = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const months: string[] = [];

      // Generate 6 months including current month
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(year, month - 1 - i, 1);
        const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        months.push(targetMonth);
      }

      // Fetch summary for each month
      const summaries = await Promise.all(
        months.map(m => api.getFixedCostMonthlySummary(m))
      );

      const trendChartData = summaries.map((summary, index) => ({
        month: months[index],
        monthLabel: months[index].substring(5), // Just MM
        scheduled: summary?.totalScheduled || 0,
        paid: summary?.totalPaid || 0,
        remaining: summary?.totalRemaining || 0,
      }));

      setTrendData(trendChartData);
    } catch (err) {
      console.error('Failed to fetch trend data:', err);
    }
  };

  // Navigate to previous/next month
  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newYearMonth);
  };

  // LLM 추천 핸들러 (AddVoiceModal 패턴 사용)
  const handleLLMRecommend = async () => {
    if (!user?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!selectedMonth) {
      setError('월을 선택해주세요.');
      return;
    }

    try {
      setIsRecommending(true);
      setError(null);

      console.log(`LLM 추천 시작: ${selectedMonth}, 사용자: ${user.id}`);

      // 1. 변동 고정비만 필터링 (isFixedAmount: false)
      const variablePayments = payments.filter(
        payment => payment.fixedCost?.isFixedAmount === false
      );

      if (variablePayments.length === 0) {
        setError('추천할 변동 고정비가 없습니다.');
        return;
      }

      // 2. 해당 월의 지출 데이터 가져오기 (api.ts 사용)
      const [year, month] = selectedMonth.split('-').map(Number);
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month, 0);

      const expensesData = await api.getExpenses({
        from_date: fromDate.toISOString().slice(0, 10),
        to_date: toDate.toISOString().slice(0, 10),
      });

      // 3. 카테고리별 지출 집계
      const categoryMap = new Map<string, {
        categoryId: string;
        categoryName: string;
        totalAmount: number;
        count: number;
        avgAmount: number;
      }>();

      for (const expense of expensesData) {
        const category = categories.find(c => c.id === expense.categoryId);
        if (!category) continue;

        if (!categoryMap.has(expense.categoryId)) {
          categoryMap.set(expense.categoryId, {
            categoryId: expense.categoryId,
            categoryName: category.name,
            totalAmount: 0,
            count: 0,
            avgAmount: 0,
          });
        }

        const summary = categoryMap.get(expense.categoryId)!;
        summary.totalAmount += expense.amount ?? 0;
        summary.count += 1;
      }

      // 평균 계산
      const categoryExpenses = Array.from(categoryMap.values()).map(summary => ({
        ...summary,
        avgAmount: summary.count > 0 ? Math.round(summary.totalAmount / summary.count) : 0,
      }));

      // 4. 변동 고정비 정보 준비
      const variableFixedCosts = variablePayments.map(payment => ({
        id: payment.fixedCost!.id,
        name: payment.fixedCost!.name,
        categoryId: payment.fixedCost!.categoryId,
        categoryName: payment.fixedCost!.category?.name || '미분류',
        paymentDay: payment.fixedCost!.paymentDay,
      }));

      // 5. Gemini 호출 (QuickAddVoiceModal 패턴)
      const recommendations = await generateFixedCostRecommendations(
        selectedMonth,
        variableFixedCosts,
        categoryExpenses,
        currency
      );

      if (recommendations.length === 0) {
        setError('추천 결과가 없습니다.');
        return;
      }

      // 6. 각 payment의 scheduledAmount 업데이트 (api.ts 사용)
      let updatedCount = 0;
      const updateResults: { name: string; amount: number }[] = [];

      for (const recommendation of recommendations) {
        const payment = variablePayments.find(
          p => p.fixedCost?.id === recommendation.fixedCostId
        );

        if (!payment) continue;

        try {
          await api.updateFixedCostPayment(payment.id, {
            scheduledAmount: recommendation.recommendedAmount,
          });
          updatedCount++;
          updateResults.push({
            name: payment.fixedCost!.name,
            amount: recommendation.recommendedAmount,
          });
        } catch (err) {
          console.error(`Failed to update payment ${payment.id}:`, err);
        }
      }

      // 7. 성공 메시지 및 데이터 새로고침
      if (updatedCount > 0) {
        const summary = updateResults
          .map(r => `• ${r.name}: ${r.amount.toLocaleString()}원`)
          .join('\n');

        alert(`✓ ${updatedCount}개 항목 추천 완료:\n\n${summary}`);
        await fetchData();
      } else {
        setError('예정 금액을 업데이트하지 못했습니다.');
      }

    } catch (err: any) {
      console.error('LLM 추천 실패:', err);
      setError(err.message || 'LLM 추천 중 오류가 발생했습니다.');
    } finally {
      setIsRecommending(false);
    }
  };

  // Calculate statistics with month-over-month comparison
  const stats = React.useMemo(() => {
    const current = currentMonthSummary || {
      totalScheduled: 0,
      totalPaid: 0,
      totalRemaining: 0,
      paidCount: 0,
      totalCount: 0,
      paidRatio: 0,
    };

    const prev = prevMonthSummary || {
      totalScheduled: 0,
      totalPaid: 0,
      totalRemaining: 0,
      paidCount: 0,
      totalCount: 0,
      paidRatio: 0,
    };

    // Calculate month-over-month change
    const scheduledChange = prev.totalScheduled > 0
      ? ((current.totalScheduled - prev.totalScheduled) / prev.totalScheduled) * 100
      : 0;

    const paidChange = prev.totalPaid > 0
      ? ((current.totalPaid - prev.totalPaid) / prev.totalPaid) * 100
      : 0;

    return {
      ...current,
      scheduledChange,
      paidChange,
      remainingPercentage: current.totalScheduled > 0
        ? (current.totalRemaining / current.totalScheduled) * 100
        : 0,
    };
  }, [currentMonthSummary, prevMonthSummary]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      const dayA = a.fixedCost?.paymentDay ?? 31;
      const dayB = b.fixedCost?.paymentDay ?? 31;
      if (dayA === dayB) {
        const idA = a.fixedCostId ?? '';
        const idB = b.fixedCostId ?? '';
        return idA.localeCompare(idB);
      }
      return dayA - dayB;
    });
  }, [payments]);

  // Calculate days until payment based on selectedMonth
  const getDaysUntilPayment = (paymentDay: number): number => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const paymentDate = new Date(year, month - 1, paymentDay);
    paymentDate.setHours(0, 0, 0, 0);

    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '-';
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || '알 수 없음';
  };

  const getCostForPayment = useCallback(
    (payment: FixedCostPayment): FixedCost | undefined => {
      return payment.fixedCost || fixedCosts.find(cost => cost.id === payment.fixedCostId);
    },
    [fixedCosts]
  );

  useEffect(() => {
    if (!selectedMonth) {
      setVariablePaymentStats({});
      return;
    }

    const variablePayments = payments
      .map(payment => ({
        payment,
        cost: getCostForPayment(payment),
      }))
      .filter(
        (item): item is { payment: FixedCostPayment; cost: FixedCost } =>
          !!item.cost && !(item.cost.isFixedAmount ?? true)
      );

    if (variablePayments.length === 0) {
      setVariablePaymentStats({});
      return;
    }

    const targetMonths = getLastNYearMonths(selectedMonth, 3);
    if (targetMonths.length === 0) {
      setVariablePaymentStats({});
      return;
    }

    const uniqueIds = Array.from(new Set(variablePayments.map(({ payment }) => payment.fixedCostId)));
    let isMounted = true;

    const loadStats = async () => {
      try {
        const results = await Promise.all(
          uniqueIds.map(async (fixedCostId) => {
            const history = await api.getFixedCostPayments({ fixed_cost_id: fixedCostId });
            return {
              fixedCostId,
              history: Array.isArray(history) ? (history as FixedCostPayment[]) : [],
            };
          })
        );

        if (!isMounted) {
          return;
        }

        const next: Record<string, VariablePaymentStat> = {};
        results.forEach(({ fixedCostId, history }) => {
          const relevantEntries = history
            .filter(entry => targetMonths.includes(entry.yearMonth))
            .map(entry => {
              const amount =
                entry.actualAmount !== null && entry.actualAmount !== undefined
                  ? entry.actualAmount
                  : entry.scheduledAmount;
              return {
                yearMonth: entry.yearMonth,
                amount: amount ?? null,
                actualAmount: entry.actualAmount,
                scheduledAmount: entry.scheduledAmount,
                status: entry.status,
              };
            })
            .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
            .slice(0, 3);

          const amounts = relevantEntries
            .map(entry => entry.amount)
            .filter((value): value is number => value !== null && value !== undefined);

          next[fixedCostId] = {
            average: amounts.length > 0 ? amounts.reduce((sum, value) => sum + value, 0) / amounts.length : null,
            max: amounts.length > 0 ? Math.max(...amounts) : null,
            min: amounts.length > 0 ? Math.min(...amounts) : null,
            count: relevantEntries.length,
            entries: relevantEntries,
            latestAmount: relevantEntries.length > 0 ? relevantEntries[0].amount : null,
          };
        });

        setVariablePaymentStats(next);
      } catch (err) {
        console.error('Failed to load variable payment stats', err);
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [payments, selectedMonth, getCostForPayment, getLastNYearMonths]);

  const formatStatCurrency = useCallback(
    (value: number | null) => {
      if (value === null || value === undefined) {
        return '-';
      }
      return formatCurrency(value, currency, exchangeRate);
    },
    [currency, exchangeRate]
  );

  const openScheduledAmountEditor = (payment: FixedCostPayment, cost: FixedCost) => {
    setScheduledAmountModal({ payment, cost });
    setScheduledAmountDraft(
      payment.scheduledAmount !== null && payment.scheduledAmount !== undefined
        ? payment.scheduledAmount.toString()
        : ''
    );
    setIsSavingScheduledAmount(false);
  };

  const closeScheduledAmountModal = () => {
    setScheduledAmountModal(null);
    setScheduledAmountDraft('');
    setIsSavingScheduledAmount(false);
  };

  const handleScheduledAmountSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduledAmountModal) return;

    const rawValue = scheduledAmountDraft.trim();
    const parsedValue = rawValue === '' ? null : Number(rawValue);

    if (parsedValue !== null && (Number.isNaN(parsedValue) || parsedValue < 0)) {
      setError('예정 금액은 0 이상의 숫자여야 합니다.');
      return;
    }

    try {
      setIsSavingScheduledAmount(true);
      await api.updateFixedCostPayment(scheduledAmountModal.payment.id, {
        scheduledAmount: parsedValue,
      });
      closeScheduledAmountModal();
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save scheduled amount', err);
      setError(err.message || '예정 금액을 저장하지 못했습니다.');
      setIsSavingScheduledAmount(false);
    }
  };

  const renderVariableStatContent = (payment: FixedCostPayment, cost: FixedCost) => {
    const stat = variablePaymentStats[payment.fixedCostId];
    if (!stat || stat.count === 0) {
      return (
        <div className="space-y-1 text-xs text-gray-200">
          <p className="font-semibold text-gray-100">최근 3개월 데이터 없음</p>
          <p className="text-gray-400">
            아직 최근 기록이 없거나 LLM 추천으로만 관리되는 항목입니다.
          </p>
        </div>
      );
    }

    const currentLabel =
      payment.scheduledAmount !== null && payment.scheduledAmount !== undefined
        ? formatCurrency(payment.scheduledAmount, currency, exchangeRate)
        : '미지정';

    return (
      <div className="space-y-2 text-xs text-gray-100">
        <div>
          <p className="font-semibold text-gray-50">{cost.name}</p>
          <p className="text-gray-400 mt-1">현재 예정 금액: {currentLabel}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 border border-gray-700/60 rounded-lg p-2 bg-gray-800/70">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">평균</p>
            <p className="font-semibold text-sky-300">{formatStatCurrency(stat.average)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">최고</p>
            <p className="font-semibold text-emerald-300">{formatStatCurrency(stat.max)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">최저</p>
            <p className="font-semibold text-rose-300">{formatStatCurrency(stat.min)}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">최근 기록</p>
          <ul className="space-y-1">
            {stat.entries.map(entry => (
              <li key={`${payment.fixedCostId}-${entry.yearMonth}`} className="flex items-center justify-between">
                <span className="text-gray-300">{entry.yearMonth}</span>
                <span className="font-medium text-gray-100">{formatStatCurrency(entry.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Open payment modal
  const openPaymentModal = (payment: FixedCostPayment) => {
    const fixedCost = getCostForPayment(payment);
    if (!fixedCost) {
      setError('고정비 정보를 찾을 수 없습니다.');
      return;
    }
    setProcessingPayment({ payment, cost: fixedCost });
    setPaymentFormData({
      actualAmount:
        payment.scheduledAmount !== null && payment.scheduledAmount !== undefined
          ? payment.scheduledAmount.toString()
          : '',
      paymentDate: payment.paymentDate || getLocalDateString(),
      memo: payment.memo || fixedCost.memo || '',
    });
    setShowPaymentModal(true);
  };

  // Process payment and create expense
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!processingPayment) return;

    const { payment } = processingPayment;

    try {
      const actualRaw = paymentFormData.actualAmount.trim();
      if (!actualRaw) {
        setError('실제 금액을 입력해주세요.');
        return;
      }

      const actualAmount = Number(actualRaw);
      if (Number.isNaN(actualAmount)) {
        setError('실제 금액은 숫자여야 합니다.');
        return;
      }
      const paymentDate = paymentFormData.paymentDate;

      await api.updateFixedCostPayment(payment.id, {
        status: 'paid',
        actualAmount,
        paymentDate,
        memo: paymentFormData.memo || null,
      });

      setShowPaymentModal(false);
      setProcessingPayment(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '지불 처리에 실패했습니다.');
    }
  };

  const handleRevertPayment = async (payment: FixedCostPayment) => {
    if (!confirm('지불 상태를 되돌릴까요?')) return;

    try {
      await api.updateFixedCostPayment(payment.id, {
        status: 'scheduled',
        actualAmount: null,
        paymentDate: null,
        memo: null,
        expenseId: null,
      });

      await fetchData();
    } catch (err: any) {
      setError(err.message || '지불 상태를 되돌리지 못했습니다.');
    }
  };

  // Handle share toggle
  const handleShareToggle = async (cost: FixedCost) => {
    try {
      const newSharedStatus = !cost.isShared;
      await api.updateFixedCost(cost.id, {
        isShared: newSharedStatus,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || '공유 설정 변경에 실패했습니다.');
    }
  };

  // Handle form submission for add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data: any = {
        name: formData.name,
        categoryId: formData.categoryId,
        amount: Number(formData.amount),
        paymentDay: Number(formData.paymentDay),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        memo: formData.memo || null,
        isFixedAmount: formData.isFixedAmount,
        isShared: formData.isShared,
        colorOverride: formData.colorOverride,
      };

      let savedCost: FixedCost | null = null;

      if (editingCost) {
        data.isActive = editingCost.isActive ?? true;
        savedCost = await api.updateFixedCost(editingCost.id, data);
      } else {
        data.isActive = true;
        savedCost = await api.createFixedCost(data);
      }

      if (!editingCost && savedCost) {
        await ensurePaymentForCost(savedCost);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingCost(null);
      setShowExpenseSelectModal(false);
      setSelectedExpense(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      amount: '',
      paymentDay: 1,
      startDate: '',
      endDate: '',
      memo: '',
      isFixedAmount: true,
      isShared: false,
      colorOverride: null,
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingCost(null);
    setSelectedExpense(null);
    setShowExpenseSelectModal(true);
  };

  const openEditModal = (cost: FixedCost) => {
    setFormData({
      name: cost.name,
      categoryId: cost.categoryId,
      amount: cost.amount.toString(),
      paymentDay: cost.paymentDay,
      startDate: cost.startDate,
      endDate: cost.endDate || '',
      memo: cost.memo || '',
      isFixedAmount: cost.isFixedAmount ?? true,
      isShared: cost.isShared ?? false,
      colorOverride: cost.colorOverride || null,
    });
    setEditingCost(cost);
    setSelectedExpense(null);
    setShowExpenseSelectModal(false);
    setShowEditModal(true);
  };

  const handleExpensePick = (expense: Expense) => {
    const expenseDate = expense.date ? new Date(expense.date) : new Date();
    const categoryName = getCategoryName(expense.categoryId);
    const normalizedMemo = expense.memo ? expense.memo.replace(/^\[고정비\]\s*/i, '').trim() : '';
    const derivedName = normalizedMemo || (categoryName !== '-' ? `${categoryName} 고정비` : '새 고정비');

    setFormData({
      name: derivedName,
      categoryId: expense.categoryId,
      amount: expense.amount !== undefined && expense.amount !== null ? expense.amount.toString() : '',
      paymentDay: expenseDate.getDate(),
      startDate: expense.date?.slice(0, 10) || getLocalDateString(),
      endDate: '',
      memo: expense.memo || '',
      isFixedAmount: true,
    });
    setSelectedExpense(expense);
    setShowExpenseSelectModal(false);
    setShowAddModal(true);
  };

  const openManualEntryForm = () => {
    setSelectedExpense(null);
    setShowExpenseSelectModal(false);
    setShowAddModal(true);
  };

  // Open delete modal
  const openDeleteModal = (payment: FixedCostPayment) => {
    const fixedCost = getCostForPayment(payment);
    if (!fixedCost) {
      setError('고정비 정보를 찾을 수 없습니다.');
      return;
    }
    setDeletingPayment({ payment, cost: fixedCost });
    setShowDeleteModal(true);
  };

  // Delete only this month's payment
  const handleDeleteThisMonth = async () => {
    if (!deletingPayment) return;

    try {
      await api.deleteFixedCostPayment(deletingPayment.payment.id);
      setShowDeleteModal(false);
      setDeletingPayment(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  // Delete the entire fixed cost (all months)
  const handleDeleteAllMonths = async () => {
    if (!deletingPayment) return;

    try {
      await api.deleteFixedCost(deletingPayment.cost.id);
      setShowDeleteModal(false);
      setDeletingPayment(null);
      setShowEditModal(false);
      setEditingCost(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">고정비 관리</h1>

        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="이전 달"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-semibold min-w-[120px] text-center">
            {selectedMonth && new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="다음 달"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-sm text-gray-400">월 총 예정</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-100">
            {formatCurrency(stats.totalScheduled || 0, currency, exchangeRate)}
          </p>
          {stats.scheduledChange !== 0 && (
            <p className={`text-xs mt-1 ${stats.scheduledChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.scheduledChange > 0 ? '↑' : '↓'} {Math.abs(stats.scheduledChange).toFixed(1)}% 전월대비
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-sm text-gray-400">지불완료</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-400">
            {formatCurrency(stats.totalPaid || 0, currency, exchangeRate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.paidRatio?.toFixed(1) || '0.0'}% ({stats.paidCount || 0}/{stats.totalCount || 0}건)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⏳</span>
            <h3 className="text-sm text-gray-400">남은액</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-orange-400">
            {formatCurrency(stats.totalRemaining || 0, currency, exchangeRate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.remainingPercentage.toFixed(1)}% 미지불
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-sm text-gray-400">전월대비</h3>
          </div>
          <div className="space-y-1">
            {stats.paidChange !== 0 ? (
              <>
                <p className={`text-lg font-bold ${stats.paidChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats.paidChange > 0 ? '↑' : '↓'} {Math.abs(stats.paidChange).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">지불액 증감</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">전월 데이터 없음</p>
            )}
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 고정비 추가
        </button>

        <button
          onClick={generatePayments}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          title="활성화된 고정비만 선택한 달에 자동 생성합니다. '이번 달만 삭제'한 항목도 다시 생성됩니다. 완전히 제거하려면 '수정' → '항목 완전 삭제'를 사용하세요."
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          이번 달 항목 생성
        </button>

        <button
          onClick={() => setShowTrendModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          월간 트렌드
        </button>

        <button
          onClick={handleLLMRecommend}
          disabled={isRecommending}
          className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
            isRecommending
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
          title="Gemini AI를 사용하여 변동 고정비의 예정 금액을 추천합니다."
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {isRecommending ? 'LLM 분석 중...' : 'LLM 추천'}
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        {sortedPayments.length === 0 ? (
          <div className="text-center py-16 text-gray-500 border border-dashed border-gray-700 rounded-lg">
            <p className="text-sm">이 달의 고정비 항목이 없습니다.</p>
            <p className="text-xs text-gray-400 mt-2">"이번 달 항목 생성" 버튼으로 지난 달 항목을 복사해보세요.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">상태</th>
                <th className="text-left py-3 px-4">항목명</th>
                <th className="text-left py-3 px-4">결제일</th>
                <th className="text-right py-3 px-4">예정금액</th>
                <th className="text-right py-3 px-4">실제금액</th>
                <th className="text-center py-3 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => {
                const cost = getCostForPayment(payment);
                if (!cost) return null;
                const daysUntil = getDaysUntilPayment(cost.paymentDay);
                const isPaid = payment.status === 'paid';
                const isFixedAmount = cost.isFixedAmount ?? true;
                const canProcessPayment = !isPaid;
                const scheduledDisplay = payment.scheduledAmount ?? (isFixedAmount ? cost.amount : null);
                return (
                  <tr key={payment.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <span className="text-2xl">{isPaid ? '✅' : '⏳'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{cost.name}</div>
                        <button
                          onClick={() => handleShareToggle(cost)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            cost.isShared ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                          }`}
                          title={cost.isShared ? '모든 사용자가 볼 수 있는 공용 일정입니다. 클릭하여 개인 일정으로 변경' : '본인만 볼 수 있는 개인 일정입니다. 클릭하여 공용 일정으로 변경'}
                        >
                          {cost.isShared ? '공용' : '개인'}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">{cost.category?.name || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{cost.paymentDay}일</div>
                      {!isPaid && (
                        <div className="text-xs text-gray-500">
                          {daysUntil > 0 ? `D-${daysUntil}` : daysUntil === 0 ? '오늘' : `${Math.abs(daysUntil)}일 지남`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isFixedAmount ? (
                        scheduledDisplay !== null
                          ? formatCurrency(scheduledDisplay, currency, exchangeRate)
                          : <span className="text-gray-500">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <div className="relative group inline-flex">
                            <button
                              type="button"
                              onClick={() => setStatInfoModal({ payment, cost })}
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                                payment.scheduledAmount !== null && payment.scheduledAmount !== undefined
                                  ? 'border-sky-400/60 bg-sky-500/10 text-sky-200 hover:border-sky-400 hover:text-sky-100'
                                  : 'border-gray-600 bg-gray-700/60 text-gray-200 hover:border-sky-400 hover:text-sky-100'
                              }`}
                              aria-label="변동 고정비 최근 3개월 정보"
                            >
                              <span className="text-[11px] uppercase tracking-wide">변동 고정비</span>
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 hidden w-64 -translate-x-1/2 -translate-y-3 rounded-lg border border-gray-700/80 bg-gray-900/95 p-3 text-left shadow-xl opacity-0 transition-all duration-150 md:block md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
                              {renderVariableStatContent(payment, cost)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openScheduledAmountEditor(payment, cost)}
                            className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-100 transition-colors hover:border-sky-500 hover:text-sky-300"
                          >
                            예정금액 입력
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isPaid && payment.actualAmount !== null ? (
                        <div>
                          <div className="text-green-400">
                            {formatCurrency(payment.actualAmount, currency, exchangeRate)}
                          </div>
                          <div className="text-xs text-gray-500">{payment.paymentDate}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {canProcessPayment && (
                          <button
                            onClick={() => openPaymentModal(payment)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                          >
                            지불완료
                          </button>
                        )}
                        {isPaid && (
                          <button
                            onClick={() => handleRevertPayment(payment)}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                          >
                            지불취소
                          </button>
                        )}
                        <button
                          onClick={() => cost && openEditModal(cost)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => openDeleteModal(payment)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          title="이번 달만 또는 모든 달 삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {sortedPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded-lg">
            <p className="text-sm">이 달의 고정비 항목이 없습니다.</p>
            <p className="text-xs text-gray-400 mt-2">버튼을 눌러 항목을 생성하세요.</p>
          </div>
        ) : (
          sortedPayments.map((payment) => {
            const cost = getCostForPayment(payment);
            if (!cost) return null;
            const daysUntil = getDaysUntilPayment(cost.paymentDay);
            const isPaid = payment.status === 'paid';
            const isFixedAmount = cost.isFixedAmount ?? true;
            const canProcessPayment = !isPaid;
            const scheduledDisplay = payment.scheduledAmount ?? (isFixedAmount ? cost.amount : null);
            return (
              <Card key={payment.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{isPaid ? '✅' : '⏳'}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cost.name}</h3>
                        <button
                          onClick={() => handleShareToggle(cost)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            cost.isShared ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                          }`}
                          title={cost.isShared ? '모든 사용자가 볼 수 있는 공용 일정입니다. 클릭하여 개인 일정으로 변경' : '본인만 볼 수 있는 개인 일정입니다. 클릭하여 공용 일정으로 변경'}
                        >
                          {cost.isShared ? '공용' : '개인'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-400">{cost.category?.name || '-'}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{cost.paymentDay}일</span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">예정:</span>
                    {isFixedAmount ? (
                      <span className="font-medium">
                        {scheduledDisplay !== null
                          ? formatCurrency(scheduledDisplay, currency, exchangeRate)
                          : '-'}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-2 text-right">
                        <button
                          type="button"
                          onClick={() => setStatInfoModal({ payment, cost })}
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                            payment.scheduledAmount !== null && payment.scheduledAmount !== undefined
                              ? 'border-sky-400/60 bg-sky-500/10 text-sky-200'
                              : 'border-gray-600 bg-gray-700/60 text-gray-200'
                          }`}
                          aria-label="변동 고정비 최근 3개월 정보"
                        >
                          <span className="text-[11px] uppercase tracking-wide">변동 고정비</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openScheduledAmountEditor(payment, cost)}
                          className="rounded-md border border-gray-600 px-3 py-1 text-xs text-gray-100 transition-colors hover:border-sky-500 hover:text-sky-300"
                        >
                          예정금액 입력
                        </button>
                      </div>
                    )}
                  </div>

                  {isPaid && payment.actualAmount !== null ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">실제:</span>
                      <span className="text-green-400 font-medium">
                        {formatCurrency(payment.actualAmount, currency, exchangeRate)}
                        <span className="text-xs text-gray-500 ml-2">({payment.paymentDate})</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">미지불</span>
                      <span className="text-orange-400">
                        {daysUntil > 0 ? `D-${daysUntil}` : daysUntil === 0 ? '오늘' : `${Math.abs(daysUntil)}일 지남`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {canProcessPayment && (
                    <button
                      onClick={() => openPaymentModal(payment)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                    >
                      지불완료
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => handleRevertPayment(payment)}
                      className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                    >
                      지불취소
                    </button>
                  )}
                  <button
                    onClick={() => cost && openEditModal(cost)}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => openDeleteModal(payment)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    title="이번 달만 또는 모든 달 삭제"
                  >
                    삭제
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
      {/* Expense Selection Modal */}
      {showExpenseSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold">지출 내역에서 불러오기</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedMonth
                      ? `${new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 지출 중에서 가져옵니다.`
                      : '지출 기록을 선택해 고정비를 빠르게 등록하세요.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowExpenseSelectModal(false);
                    setSelectedExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">카테고리</label>
                  <div className="relative">
                    <select
                      value={expenseFilters.categoryId}
                      onChange={(e) => setExpenseFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                      className={selectFieldClasses}
                    >
                      <option value="" className="bg-gray-800">전체</option>
                      {categories
                        .filter(c => c.type === 'expense')
                        .map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-gray-800">{cat.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">작성자</label>
                  <div className="relative">
                    <select
                      value={expenseFilters.createdBy}
                      onChange={(e) => setExpenseFilters(prev => ({ ...prev, createdBy: e.target.value }))}
                      className={selectFieldClasses}
                    >
                      <option value="" className="bg-gray-800">전체</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id} className="bg-gray-800">{user.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-1">빠른 작업</label>
                  <button
                    type="button"
                    onClick={fetchExpensesForSelection}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm transition-colors"
                  >
                    목록 새로고침
                  </button>
                </div>
              </div>

              <div className="border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-[50vh] overflow-y-auto">
                {expenseLoading && (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    지출을 불러오는 중입니다...
                  </div>
                )}

                {!expenseLoading && availableExpenses.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <p>조건에 맞는 지출이 없습니다.</p>
                    <button
                      onClick={openManualEntryForm}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      직접 입력으로 이동
                    </button>
                  </div>
                )}

                {!expenseLoading && availableExpenses.map(expense => {
                  const expenseDate = expense.date ? new Date(expense.date) : null;
                  return (
                    <button
                      key={expense.id}
                      onClick={() => handleExpensePick(expense)}
                      className="w-full text-left p-4 hover:bg-gray-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-gray-100">
                          {expenseDate
                            ? expenseDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                            : '날짜 미상'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {getCategoryName(expense.categoryId)}
                        </div>
                        <div className="text-sky-400 font-semibold">
                          {formatCurrency(expense.amount || 0, currency, exchangeRate)}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {expense.memo || '메모 없음'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        작성자: {getUserName(expense.createdBy)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button
                  type="button"
                  onClick={openManualEntryForm}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  직접 입력으로 건너뛰기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseSelectModal(false);
                    setSelectedExpense(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingCost ? '고정비 수정' : '새 고정비 추가'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingCost(null);
                    setSelectedExpense(null);
                    setShowExpenseSelectModal(false);
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedExpense && (
                  <div className="p-3 border border-blue-500/40 bg-blue-500/10 rounded-lg space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-blue-300">선택된 지출</p>
                        <p className="text-lg font-semibold text-white">
                          {getCategoryName(selectedExpense.categoryId)}
                        </p>
                        <p className="text-sm text-gray-400">
                          {selectedExpense.date
                            ? new Date(selectedExpense.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '날짜 미상'} · {getUserName(selectedExpense.createdBy)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">금액</p>
                        <p className="text-xl font-bold text-sky-400">
                          {formatCurrency(selectedExpense.amount || 0, currency, exchangeRate)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      메모: {selectedExpense.memo || '없음'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setShowExpenseSelectModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600/50 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
                      >
                        다른 지출 선택
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedExpense(null)}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors"
                      >
                        연결 해제
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">항목명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                    placeholder="Netflix 구독료"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">카테고리 *</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className={selectFieldClasses}
                    >
                      <option value="" className="bg-gray-800">선택하세요</option>
                      {categories
                        .filter(c => c.type === 'expense')
                        .map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-gray-800">{cat.name}</option>
                        ))
                      }
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">월 금액 *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                    placeholder="14500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">매월 결제일 *</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.paymentDay}
                      onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
                      className={selectFieldClasses}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day} className="bg-gray-800">{day}일</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">시작일 *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">종료일 (선택)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                  />
                  <p className="text-xs text-gray-500 mt-1">비워두면 무기한</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">메모 (선택)</label>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    className={`${inputFieldClasses} w-full resize-none`}
                    rows={3}
                    placeholder="연간 구독, 카드 자동결제"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/60 border border-gray-600 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">금액 고정 여부</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.isFixedAmount
                        ? '매달 같은 금액을 자동 적용합니다.'
                        : '매달 예정 금액을 직접 입력합니다.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFixedAmount: !formData.isFixedAmount })}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      formData.isFixedAmount ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200'
                    }`}
                  >
                    {formData.isFixedAmount ? '고정' : '변동'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/60 border border-gray-600 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">공유 여부</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.isShared
                        ? '모든 사용자가 볼 수 있는 공용 일정입니다.'
                        : '본인만 볼 수 있는 개인 일정입니다.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isShared: !formData.isShared })}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      formData.isShared ? 'bg-pink-600 text-white' : 'bg-gray-600 text-gray-200'
                    }`}
                  >
                    {formData.isShared ? '공용' : '개인'}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingCost(null);
                      setSelectedExpense(null);
                      setShowExpenseSelectModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Amount Modal */}
      {scheduledAmountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-gray-800 shadow-2xl">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">예정 금액 설정</h2>
                <p className="text-sm text-gray-400 mt-1">{scheduledAmountModal.cost.name}</p>
              </div>
              <button
                onClick={closeScheduledAmountModal}
                className="text-gray-400 transition-colors hover:text-gray-200"
                aria-label="예정 금액 입력 닫기"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduledAmountSubmit} className="px-6 py-5 space-y-5">
              <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3 text-sm text-gray-300 space-y-1">
                <p>
                  현재 상태:{' '}
                  {scheduledAmountModal.payment.scheduledAmount !== null && scheduledAmountModal.payment.scheduledAmount !== undefined
                    ? formatCurrency(scheduledAmountModal.payment.scheduledAmount, currency, exchangeRate)
                    : '미지정'}
                </p>
                <p className="text-xs text-gray-500">
                  금액을 비워 두면 이 항목은 “변동 · 미지정” 상태로 표시됩니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">예정 금액</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={scheduledAmountDraft}
                  onChange={(e) => setScheduledAmountDraft(e.target.value)}
                  className={`${inputFieldClasses} w-full`}
                  placeholder="예: 45000"
                />
              </div>

              {(() => {
                const quickStat = variablePaymentStats[scheduledAmountModal.payment.fixedCostId];
                const suggestions: Array<{ label: string; value: number }> = [];
                if (quickStat) {
                  if (quickStat.average !== null) {
                    suggestions.push({ label: '평균 적용', value: quickStat.average });
                  }
                  if (quickStat.latestAmount !== null) {
                    suggestions.push({ label: '최근 값', value: quickStat.latestAmount });
                  }
                  if (quickStat.max !== null) {
                    suggestions.push({ label: '최고값', value: quickStat.max });
                  }
                }

                if (suggestions.length === 0) {
                  return null;
                }

                return (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">빠르게 채우기</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((item, index) => (
                        <button
                          key={`${item.label}-${index}`}
                          type="button"
                          onClick={() => setScheduledAmountDraft(String(item.value))}
                          className="rounded-full border border-sky-500/40 px-3 py-1 text-xs text-sky-200 transition-colors hover:border-sky-400 hover:text-sky-100"
                        >
                          {item.label} · {formatStatCurrency(item.value)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeScheduledAmountModal}
                  className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-200 transition-colors hover:bg-gray-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingScheduledAmount}
                  className={`flex-1 rounded-lg px-4 py-2 font-semibold transition-colors ${
                    isSavingScheduledAmount
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-sky-600 text-white hover:bg-sky-500'
                  }`}
                >
                  {isSavingScheduledAmount ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variable Stat Modal (Mobile & accessibility) */}
      {statInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-gray-800 shadow-2xl">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">최근 3개월 기록</h2>
                <p className="text-sm text-gray-400 mt-1">{statInfoModal.cost.name}</p>
              </div>
              <button
                onClick={() => setStatInfoModal(null)}
                className="text-gray-400 transition-colors hover:text-gray-200"
                aria-label="최근 기록 닫기"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                {renderVariableStatContent(statInfoModal.payment, statInfoModal.cost)}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    openScheduledAmountEditor(statInfoModal.payment, statInfoModal.cost);
                    setStatInfoModal(null);
                  }}
                  className="flex-1 rounded-lg border border-sky-500/50 px-4 py-2 text-sky-200 transition-colors hover:bg-sky-500/10"
                >
                  예정 금액 입력
                </button>
                <button
                  type="button"
                  onClick={() => setStatInfoModal(null)}
                  className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-200 transition-colors hover:bg-gray-700"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Modal */}
      {showTrendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">월간 트렌드 분석</h2>
                <button
                  onClick={() => setShowTrendModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <h3 className="text-sm text-gray-400 mb-1">평균 월 예정액</h3>
                  <p className="text-xl font-bold">
                    {formatCurrency(
                      trendData.reduce((sum, d) => sum + d.scheduled, 0) / (trendData.length || 1),
                      currency,
                      exchangeRate
                    )}
                  </p>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm text-gray-400 mb-1">평균 월 지불액</h3>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency(
                      trendData.reduce((sum, d) => sum + d.paid, 0) / (trendData.length || 1),
                      currency,
                      exchangeRate
                    )}
                  </p>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm text-gray-400 mb-1">6개월 총 지불액</h3>
                  <p className="text-xl font-bold text-blue-400">
                    {formatCurrency(
                      trendData.reduce((sum, d) => sum + d.paid, 0),
                      currency,
                      exchangeRate
                    )}
                  </p>
                </Card>
              </div>

              {/* Line Chart */}
              <div className="bg-gray-900 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">월별 고정비 추이</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#9CA3AF"
                      label={{ value: '월', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      label={{ value: '금액', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value: number) => formatCurrency(value, currency, exchangeRate)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="scheduled"
                      stroke="#60A5FA"
                      name="예정액"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="paid"
                      stroke="#34D399"
                      name="지불액"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="remaining"
                      stroke="#F59E0B"
                      name="미지불액"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly breakdown table */}
              <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">월별 상세 내역</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">월</th>
                        <th className="text-right py-2">예정액</th>
                        <th className="text-right py-2">지불액</th>
                        <th className="text-right py-2">미지불액</th>
                        <th className="text-right py-2">완료율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.map((data) => (
                        <tr key={data.month} className="border-b border-gray-800">
                          <td className="py-2">{data.month}</td>
                          <td className="text-right">{formatCurrency(data.scheduled, currency, exchangeRate)}</td>
                          <td className="text-right text-green-400">{formatCurrency(data.paid, currency, exchangeRate)}</td>
                          <td className="text-right text-orange-400">{formatCurrency(data.remaining, currency, exchangeRate)}</td>
                          <td className="text-right">
                            {data.scheduled > 0 ? ((data.paid / data.scheduled) * 100).toFixed(1) : '0.0'}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTrendModal(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && processingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">지불 처리</h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setProcessingPayment(null);
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">고정비 항목</p>
                <p className="text-lg font-semibold">{processingPayment.cost.name}</p>
                <p className="text-sm text-gray-400 mt-1">
                  예정 금액:{' '}
                  {processingPayment.payment.scheduledAmount !== null && processingPayment.payment.scheduledAmount !== undefined
                    ? formatCurrency(processingPayment.payment.scheduledAmount, currency, exchangeRate)
                    : processingPayment.cost.isFixedAmount
                      ? formatCurrency(processingPayment.cost.amount, currency, exchangeRate)
                      : '변동 · 미지정'}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">실제 지불 금액 *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={paymentFormData.actualAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, actualAmount: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                    placeholder="14500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">지불 날짜 *</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className={`${inputFieldClasses} w-full`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">메모 (선택)</label>
                  <textarea
                    value={paymentFormData.memo}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, memo: e.target.value })}
                    className={`${inputFieldClasses} w-full resize-none`}
                    rows={3}
                    placeholder="추가 메모 사항"
                  />
                </div>

                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    ℹ️ 고정비 관리는 지출 탭과 별개로 동작합니다.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setProcessingPayment(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    지불 완료
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">삭제 옵션 선택</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingPayment(null);
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">고정비 항목</p>
                <p className="text-lg font-semibold">{deletingPayment.cost.name}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {deletingPayment.cost.category?.name || '-'} · 매월 {deletingPayment.cost.paymentDay}일
                </p>
              </div>

              <div className="space-y-3">
                {/* 이번 달만 삭제 */}
                <button
                  onClick={handleDeleteThisMonth}
                  className="w-full p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold">이번 달만 삭제</p>
                      <p className="text-sm text-orange-200 mt-1">
                        • {selectedMonth}의 납부 내역만 삭제됩니다<br />
                        • 고정비 자체는 유지됩니다<br />
                        • 다음 달에 다시 생성됩니다
                      </p>
                    </div>
                  </div>
                </button>

                {/* 모든 달 삭제 */}
                <button
                  onClick={handleDeleteAllMonths}
                  className="w-full p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <div>
                      <p className="font-semibold">모든 달 삭제 (고정비 제거)</p>
                      <p className="text-sm text-red-200 mt-1">
                        • 고정비 자체를 비활성화합니다<br />
                        • 과거 납부 내역은 유지됩니다<br />
                        • 다음 달부터 자동 생성되지 않습니다
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingPayment(null);
                }}
                className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedCosts;
