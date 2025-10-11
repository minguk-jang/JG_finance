
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { USERS, USD_KRW_EXCHANGE_RATE } from '../constants';
import { api } from '../lib/api';

interface ExpensesProps {
  currency: Currency;
}

export interface ExpensesHandle {
  openAddModal: () => void;
}

const formatCurrency = (value: number, currency: Currency) => {
  const amount = currency === 'USD' ? value / USD_KRW_EXCHANGE_RATE : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const Expenses = forwardRef<ExpensesHandle, ExpensesProps>(({ currency }, ref) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    memo: ''
  });

  const fetchData = async () => {
    try {
      const [expensesData, categoriesData] = await Promise.all([
        api.getExpenses(),
        api.getCategories()
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load expenses. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || 'N/A';
  const getUserName = (id: number) => USERS.find(u => u.id === id)?.name || 'N/A';

  const handleOpenModal = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category_id: expense.category_id.toString(),
        date: expense.date,
        amount: expense.amount.toString(),
        memo: expense.memo
      });
    } else {
      setEditingExpense(null);
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
    setEditingExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        category_id: parseInt(formData.category_id),
        date: formData.date,
        amount: parseFloat(formData.amount),
        memo: formData.memo
      };

      if (editingExpense) {
        await api.updateExpense(editingExpense.id, data);
      } else {
        await api.createExpense(data);
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await api.deleteExpense(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card title="Expense Management">
        <div className="text-center text-gray-400 p-8">Loading...</div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Expense Management">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => handleOpenModal()}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
          >
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
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No expenses found. Click "Add Expense" to create one.
                  </td>
                </tr>
              ) : (
                expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                    <td className="p-3">{expense.date}</td>
                    <td className="p-3">{getCategoryName(expense.category_id)}</td>
                    <td className="p-3 font-semibold text-red-400">{formatCurrency(expense.amount, currency)}</td>
                    <td className="p-3">{expense.memo}</td>
                    <td className="p-3">{getUserName(expense.created_by)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleOpenModal(expense)}
                        className="text-sky-400 hover:text-sky-300 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Amount (KRW)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  placeholder="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Memo</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  placeholder="Enter description"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                >
                  {editingExpense ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

Expenses.displayName = 'Expenses';

export default Expenses;
