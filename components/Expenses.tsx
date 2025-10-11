
import React, { useState } from 'react';
import { Currency, Expense } from '../types';
import Card from './ui/Card';
import { EXPENSES, CATEGORIES, USERS, USD_KRW_EXCHANGE_RATE } from '../constants';

interface ExpensesProps {
  currency: Currency;
}

const formatCurrency = (value: number, currency: Currency) => {
  const amount = currency === 'USD' ? value / USD_KRW_EXCHANGE_RATE : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const Expenses: React.FC<ExpensesProps> = ({ currency }) => {
  const [expenses, setExpenses] = useState<Expense[]>(EXPENSES);

  const getCategoryName = (id: number) => CATEGORIES.find(c => c.id === id)?.name || 'N/A';
  const getUserName = (id: number) => USERS.find(u => u.id === id)?.name || 'N/A';

  return (
    <Card title="Expense Management">
      <div className="mb-4 flex justify-end">
        <button className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition">
          Add Expense
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Memo</th>
              <th className="p-3">Member</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
              <tr key={expense.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                <td className="p-3">{expense.date}</td>
                <td className="p-3">{getCategoryName(expense.categoryId)}</td>
                <td className="p-3 font-semibold text-red-400">{formatCurrency(expense.amount, currency)}</td>
                <td className="p-3">{expense.memo}</td>
                <td className="p-3">{getUserName(expense.createdBy)}</td>
                <td className="p-3">
                  <button className="text-sky-400 hover:text-sky-300 mr-2">Edit</button>
                  <button className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default Expenses;
