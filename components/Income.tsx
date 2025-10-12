import React, { useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { USERS, DEFAULT_USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';

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

const Income = forwardRef<IncomeHandle, IncomeProps>(({ currency, exchangeRate }, ref) => {
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
      const filteredIncomes = (expensesData as any[]).filter((expense) => incomeCategoryIds.has(expense.category_id));

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
  const getUserName = (id: number) => USERS.find((user) => user.id === id)?.name || 'N/A';

  const calculateStatistics = () => {
    const totalAmount = incomes.reduce((sum, income) => sum + (income.amount ?? 0), 0);
    const count = incomes.length;
    const averageAmount = count > 0 ? totalAmount / count : 0;

    const byCategoryMap = new Map<number, { name: string; amount: number; count: number }>();
    incomes.forEach((income) => {
      const categoryId = income.category_id;
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
          aValue = getCategoryName(a.category_id);
          bValue = getCategoryName(b.category_id);
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
        category_id: income.category_id.toString(),
        date: income.date,
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
      const data = {
        category_id: parseInt(formData.category_id, 10),
        date: formData.date,
        amount: parseFloat(formData.amount),
        memo: formData.memo
      };

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

  const handleFilterReset = () => {
    setFilters({ fromDate: '', toDate: '', categoryId: '' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">수익 관리</h2>
        <Card title="">
          <div className="text-center text-gray-400 p-8">로딩중...</div>
        </Card>
      </div>
    );
  }

  const sortedIncomes = getSortedIncomes();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">수익 관리</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          수익 추가
        </button>
      </div>

      <Card title="필터">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">시작 날짜</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">종료 날짜</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">카테고리</label>
            <div className="relative">
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              >
                <option value="" className="bg-gray-800">전체</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-gray-800">
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilterReset}
              className="w-full bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition"
            >
              초기화
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="총 수익액" className="!p-4">
          <div className="text-3xl font-bold text-white">
            {formatCurrency(stats.totalAmount, currency, exchangeRate)}
          </div>
          <div className="text-sm text-gray-400 mt-1">{incomes.length}개 항목</div>
        </Card>
        <Card title="평균 수익" className="!p-4">
          <div className="text-3xl font-bold text-emerald-400">
            {formatCurrency(stats.averageAmount || 0, currency, exchangeRate)}
          </div>
          <div className="text-sm text-gray-400 mt-1">건당 평균</div>
        </Card>
        <Card title="최대 수익" className="!p-4">
          <div className="text-3xl font-bold text-emerald-400">
            {stats.largestIncome ? formatCurrency(stats.largestIncome.amount, currency, exchangeRate) : formatCurrency(0, currency, exchangeRate)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {stats.largestIncome ? `${getCategoryName(stats.largestIncome.category_id)} · ${stats.largestIncome.memo}` : '데이터 없음'}
          </div>
        </Card>
        <Card title="최다 수익 카테고리" className="!p-4">
          <div className="text-3xl font-bold text-emerald-300">
            {stats.topCategory ? stats.topCategory.name : '데이터 없음'}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {stats.topCategory ? formatCurrency(stats.topCategory.amount, currency, exchangeRate) : ''}
          </div>
        </Card>
      </div>

      {stats.byCategory.length > 0 && (
        <Card title="카테고리별 통계">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3">카테고리</th>
                  <th className="p-3">항목 수</th>
                  <th className="p-3">금액</th>
                  <th className="p-3">비율</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((category, index) => {
                  const percentage = stats.totalAmount > 0 ? ((category.amount / stats.totalAmount) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-600/20">
                      <td className="p-3 font-medium">{category.name}</td>
                      <td className="p-3 text-gray-400">{category.count}개</td>
                      <td className="p-3 font-semibold text-emerald-400">
                        {formatCurrency(category.amount, currency, exchangeRate)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm text-gray-400 w-12">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="수익 내역">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    날짜
                    <SortIcon columnKey="date" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    카테고리
                    <SortIcon columnKey="category" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-600 transition select-none"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    금액
                    <SortIcon columnKey="amount" />
                  </div>
                </th>
                <th className="p-3">메모</th>
                <th className="p-3">작성자</th>
                <th className="p-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {sortedIncomes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    수익 내역이 없습니다. "수익 추가"를 클릭하여 생성하세요.
                  </td>
                </tr>
              ) : (
                sortedIncomes.map((income) => (
                  <tr key={income.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                    <td className="p-3">{income.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400">
                        {getCategoryName(income.category_id)}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-emerald-400">
                      {formatCurrency(income.amount, currency, exchangeRate)}
                    </td>
                    <td className="p-3">{income.memo}</td>
                    <td className="p-3">{getUserName(income.created_by)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleOpenModal(income)}
                        className="text-sky-400 hover:text-sky-300 mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="text-red-400 hover:text-red-300"
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
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingIncome ? '수익 수정' : '수익 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">카테고리</label>
                <div className="relative">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="" className="bg-gray-800">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id} className="bg-gray-800">
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">날짜</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">금액 (원)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="설명 입력"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
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
