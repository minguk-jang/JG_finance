
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Currency } from '../types';
import Card from './ui/Card';
import { EXPENSES, CATEGORIES, BUDGETS, HOLDINGS, USD_KRW_EXCHANGE_RATE } from '../constants';

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
  const currentMonth = '2024-07';

  const monthlyExpenses = EXPENSES.filter(e => e.date.startsWith(currentMonth) && CATEGORIES.find(c => c.id === e.categoryId)?.type === 'expense');
  const monthlyIncomes = EXPENSES.filter(e => e.date.startsWith(currentMonth) && CATEGORIES.find(c => c.id === e.categoryId)?.type === 'income');

  const totalExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = monthlyIncomes.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const budgetData = BUDGETS.filter(b => b.month === currentMonth).map(budget => {
    const category = CATEGORIES.find(c => c.id === budget.categoryId);
    const spent = monthlyExpenses
      .filter(e => e.categoryId === budget.categoryId)
      .reduce((sum, e) => sum + e.amount, 0);
    const percentage = Math.min(((spent / budget.limitAmount) * 100), 100);
    return {
      name: category?.name || 'Unknown',
      spent,
      limit: budget.limitAmount,
      percentage
    };
  });
  
  const netWorthData = [
    { name: 'Jan', value: 350000000 }, { name: 'Feb', value: 355000000 }, { name: 'Mar', value: 365000000 },
    { name: 'Apr', value: 360000000 }, { name: 'May', value: 375000000 }, { name: 'Jun', value: 380000000 },
    { name: 'Jul', value: (380000000 + HOLDINGS.reduce((acc, h) => acc + (h.currentPrice - h.avgPrice) * h.qty, 0)) },
  ];

  const expenseByCategory = CATEGORIES
    .filter(c => c.type === 'expense')
    .map(category => ({
      name: category.name,
      amount: monthlyExpenses
        .filter(e => e.categoryId === category.id)
        .reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter(d => d.amount > 0);

  const PIE_COLORS = ['#0EA5E9', '#0284C7', '#38BDF8', '#7DD3FC', '#A5D5F8', '#C4E4F9'];


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="This Month Summary" className="lg:col-span-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-400">Total Income</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome, currency)}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense, currency)}</p>
          </div>
          <div>
            <p className="text-gray-400">Net Income</p>
            <p className="text-2xl font-bold text-sky-400">{formatCurrency(netIncome, currency)}</p>
          </div>
        </div>
      </Card>

      <Card title="Budget vs. Spending" className="lg:col-span-4">
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {budgetData.map(item => (
            <div key={item.name} className="flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeDasharray={`${item.percentage}, 100`} />
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold">{`${Math.round(item.percentage)}%`}</div>
              </div>
              <p className="mt-2 text-sm text-gray-400">{item.name}</p>
              <p className="text-xs">{formatCurrency(item.spent, currency)}</p>
            </div>
          ))}
        </div>
      </Card>
      
      <Card title="Net Worth Trend" className="lg:col-span-2 h-80">
        <ResponsiveContainer>
          <LineChart data={netWorthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value as number, currency)} domain={['dataMin - 10000000', 'dataMax + 10000000']}/>
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} formatter={(value) => formatCurrency(value as number, currency)}/>
            <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Expenses by Category" className="lg:col-span-2 h-80">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
              {expenseByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} formatter={(value) => formatCurrency(value as number, currency)}/>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Dashboard;
