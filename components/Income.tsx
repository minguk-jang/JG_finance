import React, { useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { Currency, User } from '../types';
import Card from './ui/Card';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';

interface IncomeProps {
  currency: Currency;
  exchangeRate: number;
  activeMemberId: string;
  members: User[];
  activeMemberValid: boolean;
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

const Income = forwardRef<IncomeHandle, IncomeProps>(({ currency, exchangeRate, activeMemberId, members, activeMemberValid }, ref) => {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    categoryId: ''
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const [formData, setFormData] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    memo: ''
  });

  // 선택된 항목들의 ID를 관리하는 state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;
      if (filters.categoryId) params.category_id = parseInt(filters.categoryId, 10);

      const [expensesData, categoriesData] = await Promise.all([
        api.getExpenses(params),
        api.getCategories()
      ]);

      const incomeCategories = (categoriesData as any[]).filter((category) => category.type === 'income');
      const incomeCategoryIds = new Set(incomeCategories.map((category) => category.id));
      const filteredIncomes = (expensesData as any[]).filter((expense) => incomeCategoryIds.has(expense.categoryId));

      setIncomes(filteredIncomes);
      setCategories(incomeCategories);
    } catch (error) {
      console.error('Failed to fetch income data:', error);
      alert('수익 내역을 불러오는데 실패했습니다. 백엔드가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const getCategoryName = (id: number) => categories.find((category) => category.id === id)?.name || 'N/A';
  const getUserName = (id: string) => members.find((user) => user.id === id)?.name || 'N/A';

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
        date: new Date().toISOString().split('T')[0],
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
    try {
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

      const normalizedDate = new Date(`${formData.date}T00:00:00`);
      if (Number.isNaN(normalizedDate.getTime())) {
        alert('유효한 날짜를 선택해주세요.');
        return;
      }

      const isoDate = normalizedDate.toISOString().split('T')[0];

      const data: Record<string, any> = {
        category_id: categoryId,
        date: isoDate,
        amount: amountValue,
        memo: formData.memo
      };

      const creatorId = activeMemberValid && activeMemberId.length > 0
        ? activeMemberId
        : editingIncome?.createdBy;

      if (editingIncome) {
        if (!creatorId || creatorId.length === 0) {
          alert('유효한 작업자를 찾을 수 없습니다. 구성원 목록을 다시 확인해주세요.');
          return;
        }
        data.created_by = creatorId;
      } else {
        if (!creatorId || creatorId.length === 0) {
          alert('먼저 작업자를 선택해주세요.');
          return;
        }
        data.created_by = creatorId;
      }

      if (editingIncome) {
        await api.updateExpense(editingIncome.id, data);
      } else {
        await api.createExpense(data);
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save income:', error);
      alert('수익을 저장하는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 수익을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteExpense(id);
      await fetchData();
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
      await fetchData();
      alert(`${selectedIds.size}개 항목이 삭제되었습니다.`);
    } catch (error) {
      console.error('Failed to delete incomes:', error);
      alert('수익을 삭제하는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleFilterReset = () => {
    setFilters({ fromDate: '', toDate: '', categoryId: '' });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 md:gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">수익 관리</h2>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm sm:text-base font-medium"
        >
          수익 추가
        </button>
      </div>

      <Card title="필터">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card title="총 수익액" className="!p-2 sm:!p-3 md:!p-4">
          <div className="text-base sm:text-2xl md:text-3xl font-bold surface-text">
            {formatCurrency(stats.totalAmount, currency, exchangeRate)}
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">{incomes.length}개 항목</div>
        </Card>
        <Card title="평균 수익" className="!p-2 sm:!p-3 md:!p-4">
          <div className="text-base sm:text-2xl md:text-3xl font-bold text-emerald-400">
            {formatCurrency(stats.averageAmount || 0, currency, exchangeRate)}
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">건당 평균</div>
        </Card>
        <Card title="최대 수익" className="!p-2 sm:!p-3 md:!p-4">
          <div className="text-base sm:text-2xl md:text-3xl font-bold text-emerald-400">
            {stats.largestIncome ? formatCurrency(stats.largestIncome.amount, currency, exchangeRate) : formatCurrency(0, currency, exchangeRate)}
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">
            {stats.largestIncome ? `${getCategoryName(stats.largestIncome.categoryId)}` : '데이터 없음'}
          </div>
        </Card>
        <Card title="최다 수익 카테고리" className="!p-2 sm:!p-3 md:!p-4">
          <div className="text-base sm:text-xl md:text-2xl font-bold text-emerald-300">
            {stats.topCategory ? stats.topCategory.name : '데이터 없음'}
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">
            {stats.topCategory ? formatCurrency(stats.topCategory.amount, currency, exchangeRate) : ''}
          </div>
        </Card>
      </div>

      {stats.byCategory.length > 0 && (
        <Card title="카테고리별 통계">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3 text-xs sm:text-sm md:text-base">카테고리</th>
                  <th className="p-3 text-xs sm:text-sm md:text-base">항목 수</th>
                  <th className="p-3 text-xs sm:text-sm md:text-base">금액</th>
                  <th className="p-3 text-xs sm:text-sm md:text-base">비율</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((category, index) => {
                  const percentage = stats.totalAmount > 0 ? ((category.amount / stats.totalAmount) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-600/20">
                      <td className="p-3 font-medium text-sm">{category.name}</td>
                      <td className="p-3 text-gray-400 text-sm">{category.count}개</td>
                      <td className="p-3 font-semibold text-emerald-400 text-sm">
                        {formatCurrency(category.amount, currency, exchangeRate)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-xs sm:text-sm text-gray-400 w-12">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-2">
            {stats.byCategory.map((category, index) => {
              const percentage = stats.totalAmount > 0 ? ((category.amount / stats.totalAmount) * 100).toFixed(1) : '0.0';
              return (
                <div key={index} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm sm:text-base font-semibold text-emerald-300">{category.name}</h4>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 bg-gray-600 px-2 py-1 rounded">
                      {percentage}%
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-400">항목:</span>
                      <span className="ml-2 font-medium text-gray-200">{category.count}개</span>
                    </div>
                    <div className="font-semibold text-emerald-400">
                      {formatCurrency(category.amount, currency, exchangeRate)}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    <td className="p-3 font-semibold text-emerald-400 text-sm">
                      {formatCurrency(income.amount, currency, exchangeRate)}
                    </td>
                    <td className="p-3 text-sm">{income.memo}</td>
                    <td className="p-3 text-sm">{getUserName(income.createdBy)}</td>
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
                  <div className="text-lg sm:text-xl font-bold text-emerald-400">
                    {formatCurrency(income.amount, currency, exchangeRate)}
                  </div>
                </div>

                {/* Memo and Author - Small Text */}
                {income.memo && (
                  <div className="mb-1 text-xs sm:text-sm text-gray-400">
                    메모: {income.memo}
                  </div>
                )}
                <div className="text-xs sm:text-sm text-gray-500">
                  작성자: {getUserName(income.createdBy)}
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
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full theme-field bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="설명 입력"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4 -mb-4 sm:-mb-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-emerald-700 transition"
                >
                  {editingIncome ? '수정' : '생성'}
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
