import React, { useEffect, useImperativeHandle, useState, forwardRef, useRef } from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getLocalDateString, isValidDateFormat } from '../lib/dateUtils';

interface IncomeProps {
  currency: Currency;
  exchangeRate: number;
}

export interface IncomeHandle {
  openAddModal: () => void;
}

const formatCurrency = (value: number, currency: Currency, exchangeRate: number) => {
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_USD_KRW_EXCHANGE_RATE;
  const amount = currency === 'USD' ? value / rate : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

type SortKey = 'date' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';
type InlineField = 'amount' | 'memo';

const Income = forwardRef<IncomeHandle, IncomeProps>(({ currency, exchangeRate }, ref) => {
  const { user, profile } = useAuth();
  const getDesktopPreference = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 768px)').matches;
    }
    return false;
  };
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    categoryId: '',
    createdBy: ''
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const [formData, setFormData] = useState({
    category_id: '',
    date: getLocalDateString(),
    amount: '',
    memo: ''
  });

  // 선택된 항목들의 ID를 관리하는 state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ id: number; field: InlineField } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(getDesktopPreference);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const inlineInputClasses =
    'w-full rounded-lg border border-emerald-500/40 bg-gray-900/70 px-2 py-1 text-sm text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition shadow-[0_0_0_1px_rgba(52,211,153,0.35)] placeholder:text-gray-500';
  const categoryRingPalette = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#fb923c', '#a78bfa'];

  // 초기 데이터 로드 (categories, users는 한 번만)
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesData, usersData] = await Promise.all([
        api.getCategories(),
        api.getUsers()
      ]);
      const incomeCategories = (categoriesData as any[]).filter((category) => category.type === 'income');
      setCategories(incomeCategories);
      setUsers(usersData as any[]);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      alert('초기 데이터를 불러오는데 실패했습니다.');
    }
  };

  // incomes만 다시 불러오기 (필터 변경 시)
  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;
      if (filters.categoryId) params.category_id = parseInt(filters.categoryId, 10);
      if (filters.createdBy) params.created_by = filters.createdBy;

      const expensesData = await api.getExpenses(params);
      const incomeCategoryIds = new Set(categories.map((category) => category.id));
      const filteredIncomes = (expensesData as any[]).filter((expense) => incomeCategoryIds.has(expense.categoryId));
      setIncomes(filteredIncomes);
    } catch (error) {
      console.error('Failed to fetch incomes:', error);
      alert('수익 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 전체 데이터 다시 불러오기 (외부 호출용)
  const fetchData = async () => {
    await Promise.all([fetchInitialData(), fetchIncomes()]);
  };

  // 초기 로드
  useEffect(() => {
    const init = async () => {
      await fetchInitialData();
      await fetchIncomes();
      setLoading(false);
    };
    init();
  }, []);

  // 필터 변경 시 incomes만 다시 불러오기
  useEffect(() => {
    if (categories.length > 0) {
      fetchIncomes();
    }
  }, [filters]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopView(event.matches);
    };
    setIsDesktopView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    if (inlineEdit && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEdit]);

  const getCategoryName = (id: number) => categories.find((category) => category.id === id)?.name || 'N/A';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '알 수 없음';

  const calculateStatistics = () => {
    const totalAmount = incomes.reduce((sum, income) => sum + (income.amount ?? 0), 0);
    const count = incomes.length;
    const averageAmount = count > 0 ? totalAmount / count : 0;

    const byCategoryMap = new Map<number, { name: string; amount: number; count: number }>();
    incomes.forEach((income) => {
      const categoryId = income.categoryId;
      const categoryName = getCategoryName(categoryId);
      const current = byCategoryMap.get(categoryId) ?? { name: categoryName, amount: 0, count: 0 };
      current.amount += income.amount ?? 0;
      current.count += 1;
      byCategoryMap.set(categoryId, current);
    });

    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.amount - a.amount);
    const topCategory = byCategory.length > 0 ? byCategory[0] : null;
    const largestIncome = incomes.reduce((max, income) => {
      if (!max || (income.amount ?? 0) > (max.amount ?? 0)) {
        return income;
      }
      return max;
    }, null as any);

    return {
      totalAmount,
      count,
      averageAmount,
      byCategory,
      topCategory,
      largestIncome
    };
  };

  const stats = calculateStatistics();
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const renderCategoryCard = (category: { name: string; amount: number; count: number }, index: number, variant: 'scroll' | 'grid') => {
    const percentage = stats.totalAmount > 0 ? (category.amount / stats.totalAmount) * 100 : 0;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 999);
    const ringColor = categoryRingPalette[index % categoryRingPalette.length];

    const ring = (
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#374151"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeDasharray={`${Math.min(clampedPercentage, 100)}, 100`}
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-gray-100">
          {Math.round(clampedPercentage)}%
        </div>
      </div>
    );

    if (variant === 'grid') {
      return (
        <div
          key={`${category.name}-${index}`}
          className="bg-gray-700/40 border border-gray-600 rounded-xl p-4 flex flex-col items-center text-center hover:border-emerald-400/50 transition"
        >
          {ring}
          <p className="mt-3 text-sm font-semibold surface-text truncate w-full">{category.name}</p>
          <p className="text-xs text-gray-400">{category.count}개 항목</p>
          <p className="text-sm font-bold text-emerald-400 mt-1 truncate w-full">
            {formatCurrency(category.amount, currency, exchangeRate)}
          </p>
        </div>
      );
    }

    return (
      <div
        key={`${category.name}-${index}`}
        className="snap-start min-w-[180px] sm:min-w-[200px] md:min-w-[220px] flex-shrink-0 bg-gray-700/40 border border-gray-600 rounded-xl p-3 sm:p-4 hover:border-emerald-400/50 transition flex items-center gap-3"
      >
        {ring}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold surface-text truncate">{category.name}</p>
          <p className="text-xs text-gray-400">{category.count}개 항목</p>
          <p className="text-sm font-bold text-emerald-400 mt-1 truncate">
            {formatCurrency(category.amount, currency, exchangeRate)}
          </p>
        </div>
      </div>
    );
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedIncomes = () => {
    const sorted = [...incomes];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'category':
          aValue = getCategoryName(a.categoryId);
          bValue = getCategoryName(b.categoryId);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const startInlineEdit = (income: any, field: InlineField) => {
    setInlineEdit({ id: income.id, field });
    const baseValue =
      field === 'amount'
        ? (income.amount !== undefined && income.amount !== null ? String(income.amount) : '')
        : (income.memo ?? '');
    setInlineValue(baseValue);
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    setInlineValue('');
    setInlineSaving(false);
  };

  const commitInlineEdit = async () => {
    if (!inlineEdit || inlineSaving) {
      return;
    }
    const target = incomes.find((income) => income.id === inlineEdit.id);
    if (!target) {
      cancelInlineEdit();
      return;
    }

    const payload: Record<string, any> = {};

    if (inlineEdit.field === 'amount') {
      const numericValue = Number(inlineValue);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        alert('유효한 금액을 입력해주세요.');
        setTimeout(() => inlineInputRef.current?.focus(), 0);
        return;
      }
      if (numericValue === target.amount) {
        cancelInlineEdit();
        return;
      }
      payload.amount = numericValue;
    } else if (inlineEdit.field === 'memo') {
      const trimmed = inlineValue.trim();
      if ((target.memo ?? '') === trimmed) {
        cancelInlineEdit();
        return;
      }
      payload.memo = trimmed;
    }

    if (Object.keys(payload).length === 0) {
      cancelInlineEdit();
      return;
    }

    try {
      setInlineSaving(true);
      await api.updateExpense(inlineEdit.id, payload);
      await fetchIncomes();
      cancelInlineEdit();
    } catch (error) {
      console.error('Failed to save inline edit:', error);
      alert('값을 저장하지 못했습니다. 다시 시도해주세요.');
      setTimeout(() => inlineInputRef.current?.focus(), 0);
    } finally {
      setInlineSaving(false);
    }
  };

  const handleInlineKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitInlineEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineEdit();
    }
  };

  const handleOpenModal = (income?: any) => {
    if (income) {
      setEditingIncome(income);
      setFormData({
        category_id: income.categoryId.toString(),
        date: (income.date ?? '').slice(0, 10),
        amount: income.amount.toString(),
        memo: income.memo
      });
    } else {
      setEditingIncome(null);
      setFormData({
        category_id: '',
        date: getLocalDateString(),
        amount: '',
        memo: ''
      });
    }
    setShowModal(true);
  };

  useImperativeHandle(ref, () => ({
    openAddModal: () => handleOpenModal()
  }));

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncome(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 이미 제출 중이면 무시
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      const categoryId = Number.parseInt(formData.category_id, 10);
      if (!Number.isInteger(categoryId)) {
        alert('카테고리를 선택해주세요.');
        return;
      }

      const amountValue = Number.parseFloat(formData.amount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        alert('유효한 금액을 입력해주세요.');
        return;
      }

      if (!formData.date) {
        alert('날짜를 선택해주세요.');
        return;
      }

      // 날짜 형식 검증 (YYYY-MM-DD)
      if (!isValidDateFormat(formData.date)) {
        alert('유효한 날짜를 선택해주세요.');
        return;
      }

      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const data: Record<string, any> = {
        category_id: categoryId,
        date: formData.date, // 타임존 변환 없이 그대로 사용
        amount: amountValue,
        memo: formData.memo,
        created_by: user.id
      };

      if (editingIncome) {
        await api.updateExpense(editingIncome.id, data);
      } else {
        await api.createExpense(data);
      }

      await fetchIncomes();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save income:', error);
      alert('수익을 저장하는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 수익을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteExpense(id);
      await fetchIncomes();
    } catch (error) {
      console.error('Failed to delete income:', error);
      alert('수익을 삭제하는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 체크박스 관련 핸들러
  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = new Set(sortedIncomes.map((inc: any) => inc.id));
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await api.deleteExpenses(Array.from(selectedIds));
      setSelectedIds(new Set());
      await fetchIncomes();
      alert(`${selectedIds.size}개 항목이 삭제되었습니다.`);
    } catch (error) {
      console.error('Failed to delete incomes:', error);
      alert('수익을 삭제하는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleFilterReset = () => {
    setFilters({ fromDate: '', toDate: '', categoryId: '', createdBy: '' });
  };

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">수익 관리</h2>
        <Card title="">
          <div className="text-center text-gray-400 p-8">로딩중...</div>
        </Card>
      </div>
    );
  }

  const sortedIncomes = getSortedIncomes();

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 md:gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">수익 관리</h2>
        <div className="flex w-full sm:w-auto gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-lg border transition text-sm font-medium ${
              filtersOpen
                ? 'border-emerald-400/70 text-emerald-300 bg-emerald-400/10'
                : 'border-gray-600 text-gray-200 hover:border-emerald-400 hover:text-emerald-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
            </svg>
            <span>필터</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 text-[11px] font-semibold leading-4 px-1.5 rounded-full bg-emerald-500/20 text-emerald-200">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm sm:text-base font-medium"
          >
            수익 추가
          </button>
        </div>
      </div>

      {filtersOpen && (
        <Card title="필터">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-300">시작 날짜</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-300">종료 날짜</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-300">카테고리</label>
              <div className="relative">
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                >
                  <option value="" className="bg-gray-800">전체</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id} className="bg-gray-800">
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-400">
                  <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-300">작성자</label>
              <div className="relative">
                <select
                  value={filters.createdBy}
                  onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                >
                  <option value="" className="bg-gray-800">전체</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-gray-800">{u.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-400">
                  <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilterReset}
                className="w-full bg-gray-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg hover:bg-gray-700 transition text-xs sm:text-sm font-medium"
              >
                초기화
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden border border-gray-700/60">
        <button
          type="button"
          onClick={() => setStatsExpanded((prev) => !prev)}
          aria-expanded={statsExpanded}
          className="flex w-full items-center justify-between gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-800 hover:bg-gray-700 transition"
        >
          <div className="text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-1">요약</p>
            <div className="text-base sm:text-lg md:text-xl font-semibold surface-text">
              {formatCurrency(stats.totalAmount, currency, exchangeRate)}
              <span className="ml-2 text-xs sm:text-sm text-gray-400">· {incomes.length}개</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              평균 {formatCurrency(stats.averageAmount || 0, currency, exchangeRate)}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-full border border-gray-700 p-2 transition-all duration-200 ${
              statsExpanded ? 'bg-emerald-500/10 text-emerald-300 rotate-180' : 'text-gray-400'
            }`}
            aria-hidden="true"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div
          className={`px-3 sm:px-4 md:px-6 transition-all duration-300 ease-out overflow-hidden ${
            statsExpanded ? 'opacity-100 pb-4' : 'opacity-0'
          }`}
          style={{ maxHeight: statsExpanded ? 640 : 0 }}
        >
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-700/70 bg-gray-800/70 p-3 sm:p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">총 수익</p>
              <p className="text-lg sm:text-2xl font-bold surface-text mt-1">
                {formatCurrency(stats.totalAmount, currency, exchangeRate)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{incomes.length}개 항목</p>
            </div>
            <div className="rounded-xl border border-gray-700/70 bg-gray-800/70 p-3 sm:p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">평균</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1">
                {formatCurrency(stats.averageAmount || 0, currency, exchangeRate)}
              </p>
              <p className="text-xs text-gray-500 mt-1">건당 평균</p>
            </div>
            <div className="rounded-xl border border-gray-700/70 bg-gray-800/70 p-3 sm:p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">최대 건</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1">
                {stats.largestIncome
                  ? formatCurrency(stats.largestIncome.amount, currency, exchangeRate)
                  : formatCurrency(0, currency, exchangeRate)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.largestIncome ? getCategoryName(stats.largestIncome.categoryId) : '데이터 없음'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-700/70 bg-gray-800/70 p-3 sm:p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">최다 카테고리</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-300 mt-1">
                {stats.topCategory ? stats.topCategory.name : '데이터 없음'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.topCategory ? formatCurrency(stats.topCategory.amount, currency, exchangeRate) : ''}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {statsExpanded && stats.byCategory.length > 0 && (
        <Card title="카테고리별 통계">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 snap-x md:hidden">
            {stats.byCategory.map((category, index) => renderCategoryCard(category, index, 'scroll'))}
          </div>
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stats.byCategory.map((category, index) => renderCategoryCard(category, index, 'grid'))}
          </div>
        </Card>
      )}

      <Card title="수익 내역">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3 w-12 text-xs sm:text-sm md:text-base">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === sortedIncomes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAll();
                      } else {
                        handleDeselectAll();
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none text-xs sm:text-sm md:text-base"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    날짜
                    <SortIcon columnKey="date" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none text-xs sm:text-sm md:text-base"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    카테고리
                    <SortIcon columnKey="category" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none text-xs sm:text-sm md:text-base"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    금액
                    <SortIcon columnKey="amount" />
                  </div>
                </th>
                <th className="p-3 text-xs sm:text-sm md:text-base">메모</th>
                <th className="p-3 text-xs sm:text-sm md:text-base">작성자</th>
                <th className="p-3 text-xs sm:text-sm md:text-base">작업</th>
              </tr>
            </thead>
            <tbody>
              {sortedIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    수익 내역이 없습니다. "수익 추가"를 클릭하여 생성하세요.
                  </td>
                </tr>
              ) : (
                sortedIncomes.map((income) => (
                  <tr key={income.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(income.id)}
                        onChange={() => handleToggleSelect(income.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-sm">{income.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400">
                        {getCategoryName(income.categoryId)}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      {inlineEdit?.id === income.id && inlineEdit.field === 'amount' && isDesktopView ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={inlineInputRef}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="decimal"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => commitInlineEdit()}
                            onKeyDown={handleInlineKeyDown}
                            className={`${inlineInputClasses} text-right`}
                            disabled={inlineSaving}
                          />
                          <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                            Enter 저장
                          </span>
                        </div>
                      ) : (
                        <div
                          className="group font-semibold text-emerald-400 text-sm cursor-text select-none flex items-center gap-1"
                          onDoubleClick={() => startInlineEdit(income, 'amount')}
                          title="더블클릭하여 금액 수정"
                        >
                          {formatCurrency(income.amount, currency, exchangeRate)}
                          <svg
                            className="w-3.5 h-3.5 text-emerald-300 opacity-0 group-hover:opacity-100 transition"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5-4-4L4 16v4z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-sm">
                      {inlineEdit?.id === income.id && inlineEdit.field === 'memo' && isDesktopView ? (
                        <input
                          ref={inlineInputRef}
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => commitInlineEdit()}
                          onKeyDown={handleInlineKeyDown}
                          className={inlineInputClasses}
                          placeholder="메모 입력"
                          disabled={inlineSaving}
                        />
                      ) : (
                        <div
                          className="group cursor-text text-gray-200 flex items-center gap-1"
                          onDoubleClick={() => startInlineEdit(income, 'memo')}
                          title="더블클릭하여 메모 수정"
                        >
                          {income.memo ? (
                            <span>{income.memo}</span>
                          ) : (
                            <span className="text-gray-500">메모 없음 (더블클릭하여 추가)</span>
                          )}
                          <svg
                            className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5-4-4L4 16v4z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-600 text-gray-200">
                        {getUserName(income.createdBy)}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleOpenModal(income)}
                        className="text-sky-400 hover:text-sky-300 mr-2 text-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-2">
          {sortedIncomes.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              수익 내역이 없습니다. "수익 추가"를 클릭하여 생성하세요.
            </div>
          ) : (
            sortedIncomes.map((income) => (
              <div
                key={income.id}
                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
              >
                {/* Header: Checkbox, Date and Actions */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(income.id)}
                      onChange={() => handleToggleSelect(income.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs sm:text-sm text-gray-400">{income.date}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(income)}
                      className="text-sky-400 hover:text-sky-300 transition p-1"
                      title="수정"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="text-red-400 hover:text-red-300 transition p-1"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="mb-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 inline-block">
                    {getCategoryName(income.categoryId)}
                  </span>
                </div>

                {/* Amount - Large Font */}
                <div className="mb-2">
                  {inlineEdit?.id === income.id && inlineEdit.field === 'amount' && !isDesktopView ? (
                    <input
                      ref={inlineInputRef}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => commitInlineEdit()}
                      onKeyDown={handleInlineKeyDown}
                      className={`${inlineInputClasses} text-right text-base`}
                      disabled={inlineSaving}
                    />
                  ) : (
                    <div
                      className="group text-lg sm:text-xl font-bold text-emerald-400 cursor-text flex items-center gap-1"
                      onDoubleClick={() => startInlineEdit(income, 'amount')}
                      title="더블클릭하여 금액 수정"
                    >
                      {formatCurrency(income.amount, currency, exchangeRate)}
                      <svg
                        className="w-3.5 h-3.5 text-emerald-300 opacity-0 group-hover:opacity-100 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Memo - Small Text */}
                <div className="mb-1 text-xs sm:text-sm text-gray-400">
                  {inlineEdit?.id === income.id && inlineEdit.field === 'memo' && !isDesktopView ? (
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => commitInlineEdit()}
                      onKeyDown={handleInlineKeyDown}
                      className={`${inlineInputClasses} text-xs sm:text-sm`}
                      placeholder="메모 입력"
                      disabled={inlineSaving}
                    />
                  ) : income.memo ? (
                    <div
                      className="group cursor-text flex items-center gap-1"
                      onDoubleClick={() => startInlineEdit(income, 'memo')}
                      title="더블클릭하여 메모 수정"
                    >
                      <span>메모: {income.memo}</span>
                      <svg
                        className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="group cursor-text flex items-center gap-1 text-gray-500"
                      onDoubleClick={() => startInlineEdit(income, 'memo')}
                      title="더블클릭하여 메모 추가"
                    >
                      <span>메모 없음 (더블클릭하여 추가)</span>
                      <svg
                        className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Created By */}
                <div className="mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs text-gray-400">
                    {getUserName(income.createdBy)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 일괄 삭제 버튼 영역 */}
        {sortedIncomes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-600 flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs sm:text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition"
              >
                전체 선택
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs sm:text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition"
              >
                선택 해제
              </button>
            </div>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className={`px-4 py-1.5 text-xs sm:text-sm rounded transition ${
                selectedIds.size === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              선택 삭제 ({selectedIds.size}개)
            </button>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-lg sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingIncome ? '수익 수정' : '수익 추가'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">카테고리</label>
                <div className="relative">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="" className="bg-gray-800">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id} className="bg-gray-800">
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-400">
                    <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">날짜</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">금액 (원)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">메모 (선택사항)</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="설명 입력 (선택사항)"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4 -mb-4 sm:-mb-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>저장중...</span>
                    </>
                  ) : (
                    <span>{editingIncome ? '수정' : '생성'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

Income.displayName = 'Income';

export default Income;
