import React, { useEffect, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Currency } from '../types';
import Card from './ui/Card';
import { USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';

interface DashboardProps {
  currency: Currency;
}

const formatCurrency = (value: number, currency: Currency) => {
  const amount = currency === 'USD' ? value / USD_KRW_EXCHANGE_RATE : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const Dashboard: React.FC<DashboardProps> = ({ currency }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesData, categoriesData, budgetsData, holdingsData] = await Promise.all([
          api.getExpenses(),
          api.getCategories(),
          api.getBudgets(),
          api.getHoldings(),
        ]);

        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        const normalizedBudgets = (Array.isArray(budgetsData) ? budgetsData : []).map((budget: any) => ({
          id: budget.id,
          categoryId: budget.categoryId ?? budget.category_id,
          month: budget.month,
          limitAmount: budget.limitAmount ?? budget.limit_amount,
        }));
        setBudgets(normalizedBudgets);

        setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('대시보드 데이터를 불러오지 못했습니다. 서버 상태를 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-400 p-8">로딩중...</div>;
  }

  if (error) {
    return (
      <Card title="대시보드">
        <p className="text-red-400 text-sm">{error}</p>
      </Card>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const categoriesById = new Map<number, any>(categories.map((category) => [category.id, category]));

  const monthlyExpenses = expenses.filter(
    (expense) =>
      typeof expense.date === 'string' &&
      expense.date.startsWith(currentMonth) &&
      categoriesById.get(expense.category_id)?.type === 'expense',
  );
  const monthlyIncomes = expenses.filter(
    (expense) =>
      typeof expense.date === 'string' &&
      expense.date.startsWith(currentMonth) &&
      categoriesById.get(expense.category_id)?.type === 'income',
  );

  const totalExpense = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
  const totalIncome = monthlyIncomes.reduce((sum, income) => sum + (income.amount ?? 0), 0);
  const netIncome = totalIncome - totalExpense;

  const totalHoldingsValue = holdings.reduce((sum, holding) => {
    const qty = holding.qty ?? 0;
    const price = holding.current_price ?? holding.currentPrice ?? 0;
    return sum + price * qty;
  }, 0);

  const budgetData = budgets
    .filter((budget) => budget.month === currentMonth)
    .map((budget) => {
      const categoryId = budget.categoryId ?? budget.category_id;
      const category = categoriesById.get(categoryId);
      const limit = budget.limitAmount || 0;
      const spent = monthlyExpenses
        .filter((expense) => expense.category_id === categoryId)
        .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return {
        name: category?.name || '미지정',
        spent,
        limit,
        percentage,
      };
    });

  const monthlyAggregates: Record<string, { income: number; expense: number }> = {};
  expenses.forEach((expense) => {
    if (!expense?.date) {
      return;
    }
    const monthKey = expense.date.slice(0, 7);
    if (!monthlyAggregates[monthKey]) {
      monthlyAggregates[monthKey] = { income: 0, expense: 0 };
    }
    const category = categoriesById.get(expense.category_id);
    if (category?.type === 'income') {
      monthlyAggregates[monthKey].income += expense.amount ?? 0;
    } else {
      monthlyAggregates[monthKey].expense += expense.amount ?? 0;
    }
  });

  const sortedMonths = Object.keys(monthlyAggregates).sort();
  const netIncomeTrend =
    sortedMonths.length > 0
      ? sortedMonths.map((month) => {
          const { income, expense } = monthlyAggregates[month];
          return {
            name: month,
            value: income - expense,
          };
        })
      : [
          {
            name: currentMonth,
            value: netIncome,
          },
        ];

  const expenseByCategory = categories
    .filter((category) => category.type === 'expense')
    .map((category) => ({
      name: category.name,
      amount: monthlyExpenses
        .filter((expense) => expense.category_id === category.id)
        .reduce((sum, expense) => sum + (expense.amount ?? 0), 0),
    }))
    .filter((entry) => entry.amount > 0);

  const holdingsAllocation = holdings
    .map((holding) => ({
      name: holding.name ?? holding.symbol ?? `Asset ${holding.id}`,
      value: (holding.current_price ?? holding.currentPrice ?? 0) * (holding.qty ?? 0),
    }))
    .filter((entry) => entry.value > 0);

  const PIE_COLORS = ['#0EA5E9', '#0284C7', '#38BDF8', '#7DD3FC', '#A5D5F8', '#C4E4F9'];
  const HOLDINGS_COLORS = ['#2563EB', '#7C3AED', '#F97316', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="이번 달 요약" className="lg:col-span-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-gray-400">총 수입</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome, currency)}</p>
          </div>
          <div>
            <p className="text-gray-400">총 지출</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense, currency)}</p>
          </div>
          <div>
            <p className="text-gray-400">순수입</p>
            <p className="text-2xl font-bold text-sky-400">{formatCurrency(netIncome, currency)}</p>
          </div>
          <div>
            <p className="text-gray-400">투자 자산 가치</p>
            <p className="text-2xl font-bold text-indigo-400">{formatCurrency(totalHoldingsValue, currency)}</p>
          </div>
        </div>
      </Card>

      <Card title="예산 대비 지출" className="lg:col-span-4">
        {budgetData.length === 0 ? (
          <div className="text-center text-gray-400 py-6">이번 달에 설정된 예산이 없습니다. 설정 페이지에서 예산을 추가해보세요.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {budgetData.map((item) => (
              <div key={item.name} className="flex flex-col items-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth="3"
                      strokeDasharray={`${item.percentage}, 100`}
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold">{`${Math.round(
                    item.percentage,
                  )}%`}</div>
                </div>
                <p className="mt-2 text-sm text-gray-400">{item.name}</p>
                <p className="text-xs">{formatCurrency(item.spent, currency)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="월별 순수입" className="lg:col-span-2 h-80">
        <ResponsiveContainer>
          <LineChart data={netIncomeTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={(value) => formatCurrency(value as number, currency)}
              domain={['dataMin - 1000000', 'dataMax + 1000000']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              formatter={(value) => formatCurrency(value as number, currency)}
            />
            <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="카테고리별 지출" className="lg:col-span-2 h-80">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
              {expenseByCategory.map((entry, index) => (
                <Cell key={`expense-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              formatter={(value) => formatCurrency(value as number, currency)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="투자 자산 배분" className="lg:col-span-2 h-80">
        {holdingsAllocation.length === 0 ? (
          <div className="text-center text-gray-400 p-8">투자 자산이 없습니다. 투자 페이지에서 추가해보세요.</div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={holdingsAllocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {holdingsAllocation.map((entry, index) => (
                  <Cell key={`holding-cell-${index}`} fill={HOLDINGS_COLORS[index % HOLDINGS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                formatter={(value) => formatCurrency(value as number, currency)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
