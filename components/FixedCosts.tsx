import React, { useEffect, useState } from 'react';
import { Currency, FixedCost, FixedCostPayment, Category } from '../types';
import Card from './ui/Card';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FixedCostsProps {
  currency: Currency;
  exchangeRate: number;
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
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [payments, setPayments] = useState<FixedCostPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [processingPayment, setProcessingPayment] = useState<{ payment: FixedCostPayment; cost: FixedCost } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: 0,
    amount: '',
    paymentDay: 1,
    startDate: '',
    endDate: '',
    isActive: true,
    memo: '',
  });

  // Payment form state
  const [paymentFormData, setPaymentFormData] = useState({
    actualAmount: '',
    paymentDate: '',
    memo: '',
  });

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

  // Auto-generate payments for the selected month
  useEffect(() => {
    if (!selectedMonth) return;
    const autoGenerate = async () => {
      try {
        await api.generateMonthlyFixedCostPayments(selectedMonth);
        // Re-fetch data after generation
        await fetchData();
      } catch (err) {
        // Silent fail - payments might already exist
        console.log('Auto-generate payments:', err);
      }
    };
    autoGenerate();
  }, [selectedMonth]);

  // Fetch trend data when trend modal opens
  useEffect(() => {
    if (showTrendModal && selectedMonth) {
      fetchTrendData();
    }
  }, [showTrendModal, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate previous month
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const [fixedCostsData, paymentsData, categoriesData, currentSummary, prevSummary] = await Promise.all([
        api.getFixedCosts({ is_active: true, year_month: selectedMonth }),
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

  // Get payment for a fixed cost
  const getPaymentForCost = (fixedCostId: number): FixedCostPayment | undefined => {
    return payments.find(p => p.fixedCostId === fixedCostId);
  };

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

  // Open payment modal
  const openPaymentModal = (payment: FixedCostPayment, fixedCost: FixedCost) => {
    setProcessingPayment({ payment, cost: fixedCost });
    setPaymentFormData({
      actualAmount: payment.scheduledAmount.toString(),
      paymentDate: getLocalDateString(),
      memo: fixedCost.memo || '',
    });
    setShowPaymentModal(true);
  };

  // Process payment and create expense
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!processingPayment) return;

    const { payment, cost } = processingPayment;

    // Check if already linked to an expense
    if (payment.expenseId) {
      setError('이 고정비는 이미 지출 내역과 연동되어 있습니다.');
      return;
    }

    try {
      const actualAmount = Number(paymentFormData.actualAmount);
      const paymentDate = paymentFormData.paymentDate;

      // Create expense record first
      const expense = await api.createExpense({
        categoryId: cost.categoryId,
        date: paymentDate,
        amount: actualAmount,
        memo: `[고정비] ${cost.name}${paymentFormData.memo ? ` - ${paymentFormData.memo}` : ''}`,
      });

      // Update payment with expense link
      await api.updateFixedCostPayment(payment.id, {
        status: 'paid',
        actualAmount,
        paymentDate,
        memo: paymentFormData.memo || null,
        expenseId: expense.id,
      });

      setShowPaymentModal(false);
      setProcessingPayment(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '지불 처리에 실패했습니다.');
    }
  };

  // Handle form submission for add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        name: formData.name,
        categoryId: Number(formData.categoryId),
        amount: Number(formData.amount),
        paymentDay: Number(formData.paymentDay),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        isActive: formData.isActive,
        memo: formData.memo || null,
      };

      if (editingCost) {
        await api.updateFixedCost(editingCost.id, data);
      } else {
        await api.createFixedCost(data);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingCost(null);
      resetForm();
      await fetchData();
      await generatePayments(); // Auto-generate payment for new cost
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: 0,
      amount: '',
      paymentDay: 1,
      startDate: '',
      endDate: '',
      isActive: true,
      memo: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingCost(null);
    setShowAddModal(true);
  };

  const openEditModal = (cost: FixedCost) => {
    setFormData({
      name: cost.name,
      categoryId: cost.categoryId,
      amount: cost.amount.toString(),
      paymentDay: cost.paymentDay,
      startDate: cost.startDate,
      endDate: cost.endDate || '',
      isActive: cost.isActive,
      memo: cost.memo || '',
    });
    setEditingCost(cost);
    setShowEditModal(true);
  };

  const handleDelete = async (costId: number) => {
    if (!confirm('이 고정비를 삭제하시겠습니까?')) return;

    try {
      await api.deleteFixedCost(costId);
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
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">상태</th>
              <th className="text-left py-3 px-4">항목명</th>
              <th className="text-left py-3 px-4">카테고리</th>
              <th className="text-left py-3 px-4">결제일</th>
              <th className="text-right py-3 px-4">예정금액</th>
              <th className="text-right py-3 px-4">실제금액</th>
              <th className="text-center py-3 px-4">작업</th>
            </tr>
          </thead>
          <tbody>
            {fixedCosts.map((cost) => {
              const payment = getPaymentForCost(cost.id);
              const daysUntil = getDaysUntilPayment(cost.paymentDay);
              const isPaid = payment?.status === 'paid';

              return (
                <tr key={cost.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <span className="text-2xl">
                      {isPaid ? '✅' : '⏳'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{cost.name}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {cost.category?.name || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div>{cost.paymentDay}일</div>
                      {!isPaid && (
                        <div className="text-xs text-gray-500">
                          {daysUntil > 0 ? `D-${daysUntil}` : daysUntil === 0 ? '오늘' : `${Math.abs(daysUntil)}일 지남`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(payment?.scheduledAmount || cost.amount, currency, exchangeRate)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isPaid && payment ? (
                      <div>
                        <div className="text-green-400">
                          {formatCurrency(payment.actualAmount || 0, currency, exchangeRate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.paymentDate}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {!isPaid && payment && (
                        <button
                          onClick={() => openPaymentModal(payment, cost)}
                          disabled={!!payment.expenseId}
                          className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                            payment.expenseId
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {payment.expenseId ? '연동됨' : '지불완료'}
                        </button>
                      )}
                      {isPaid && payment?.expenseId && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded">
                          ✓ 지출연동
                        </span>
                      )}
                      <button
                        onClick={() => openEditModal(cost)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
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

        {fixedCosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 고정비가 없습니다.
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {fixedCosts.map((cost) => {
          const payment = getPaymentForCost(cost.id);
          const daysUntil = getDaysUntilPayment(cost.paymentDay);
          const isPaid = payment?.status === 'paid';

          return (
            <Card key={cost.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{isPaid ? '✅' : '⏳'}</span>
                  <div>
                    <h3 className="font-semibold">{cost.name}</h3>
                    <p className="text-sm text-gray-400">{cost.category?.name || '-'}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{cost.paymentDay}일</span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">예정:</span>
                  <span className="font-medium">
                    {formatCurrency(payment?.scheduledAmount || cost.amount, currency, exchangeRate)}
                  </span>
                </div>

                {isPaid && payment ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">실제:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(payment.actualAmount || 0, currency, exchangeRate)}
                      <span className="text-xs text-gray-500 ml-2">
                        ({payment.paymentDate})
                      </span>
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

              <div className="flex gap-2">
                {!isPaid && payment && (
                  <button
                    onClick={() => openPaymentModal(payment, cost)}
                    disabled={!!payment.expenseId}
                    className={`flex-1 px-3 py-2 text-white text-sm rounded transition-colors ${
                      payment.expenseId
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {payment.expenseId ? '연동됨' : '지불완료'}
                  </button>
                )}
                {isPaid && payment?.expenseId && (
                  <div className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded text-center">
                    ✓ 지출연동
                  </div>
                )}
                <button
                  onClick={() => openEditModal(cost)}
                  className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(cost.id)}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  삭제
                </button>
              </div>
            </Card>
          );
        })}

        {fixedCosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 고정비가 없습니다.
          </div>
        )}
      </div>

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
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">항목명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Netflix 구독료"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">카테고리 *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>선택하세요</option>
                    {categories
                      .filter(c => c.type === 'expense')
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    }
                  </select>
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="14500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">매월 결제일 *</label>
                  <select
                    required
                    value={formData.paymentDay}
                    onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}일</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">시작일 *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">종료일 (선택)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">비워두면 무기한</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">메모 (선택)</label>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="연간 구독, 카드 자동결제"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm">활성 상태</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingCost(null);
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
                  예정 금액: {formatCurrency(processingPayment.payment.scheduledAmount, currency, exchangeRate)}
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">메모 (선택)</label>
                  <textarea
                    value={paymentFormData.memo}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, memo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="추가 메모 사항"
                  />
                </div>

                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    ℹ️ 지불 완료 시 지출 내역에 자동으로 등록됩니다.
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
    </div>
  );
};

export default FixedCosts;
