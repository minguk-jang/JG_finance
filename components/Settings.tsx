import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import { User, UserRole, Budget, Category } from '../types';
import { api } from '../lib/api';

interface SettingsProps {
  exchangeRate: number;
  onExchangeRateChange: (value: number) => void;
  onUsersRefresh?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ exchangeRate, onExchangeRateChange, onUsersRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(exchangeRate.toString());
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null);
  const [exchangeRateMessage, setExchangeRateMessage] = useState<string | null>(null);
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: UserRole.Viewer,
    avatar: '',
    password: ''
  });

  // Budget modal state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetFormData, setBudgetFormData] = useState({
    categoryId: 0,
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    limitAmount: 0
  });

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense'
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setExchangeRateInput(exchangeRate.toString());
  }, [exchangeRate]);

  const handleExchangeRateInputChange = (value: string) => {
    setExchangeRateInput(value);
    setExchangeRateError(null);
    setExchangeRateMessage(null);
  };

  const handleExchangeRateSave = () => {
    const parsed = parseFloat(exchangeRateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setExchangeRateError('유효한 환율을 입력해주세요.');
      setExchangeRateMessage(null);
      return;
    }

    const normalized = Number(parsed.toFixed(4));

    if (Math.abs(normalized - exchangeRate) < 0.0001) {
      setExchangeRateMessage('이미 해당 환율이 적용 중입니다.');
      setExchangeRateError(null);
      return;
    }

    setIsSavingExchangeRate(true);
    try {
      onExchangeRateChange(normalized);
      setExchangeRateMessage('환율이 업데이트되었습니다.');
      setExchangeRateError(null);
    } finally {
      setIsSavingExchangeRate(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, budgetsData, categoriesData] = await Promise.all([
        api.getUsers(),
        api.getBudgets(),
        api.getCategories()
      ]);
      setUsers(usersData);
      const normalizedBudgets = budgetsData.map((budget: any) => ({
        id: budget.id,
        categoryId: budget.categoryId ?? budget.category_id,
        month: budget.month,
        limitAmount: budget.limitAmount ?? budget.limit_amount
      }));
      setBudgets(normalizedBudgets);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // User CRUD handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      role: UserRole.Viewer,
      avatar: '',
      password: ''
    });
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || '',
      password: ''
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const payload: any = {
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
        avatar: userFormData.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`
      };

      if (editingUser) {
        // Update existing user
        if (userFormData.password) {
          payload.password = userFormData.password;
        }
        await api.updateUser(editingUser.id, payload);
        alert('구성원이 수정되었습니다.');
      } else {
        // Create new user
        if (!userFormData.password) {
          alert('비밀번호를 입력해주세요.');
          return;
        }
        payload.password = userFormData.password;
        await api.createUser(payload);
        alert('구성원이 초대되었습니다.');
      }

      setIsUserModalOpen(false);
      await fetchData();
      onUsersRefresh?.();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(error.message || '구성원 저장에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('정말로 이 구성원을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteUser(userId);
      alert('구성원이 삭제되었습니다.');
      await fetchData();
      onUsersRefresh?.();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.message || '구성원 삭제에 실패했습니다.');
    }
  };

  // Budget CRUD handlers
  const handleCreateBudget = () => {
    setEditingBudget(null);
    setBudgetFormData({
      categoryId: categories.find(c => c.type === 'expense')?.id || 0,
      month: new Date().toISOString().slice(0, 7),
      limitAmount: 0
    });
    setIsBudgetModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetFormData({
      categoryId: budget.categoryId,
      month: budget.month,
      limitAmount: budget.limitAmount
    });
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async () => {
    try {
      const payload = {
        category_id: budgetFormData.categoryId,
        month: budgetFormData.month,
        limit_amount: budgetFormData.limitAmount
      };

      if (editingBudget) {
        await api.updateBudget(editingBudget.id, payload);
        alert('예산이 수정되었습니다.');
      } else {
        await api.createBudget(payload);
        alert('예산이 추가되었습니다.');
      }

      setIsBudgetModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save budget:', error);
      alert(error.message || '예산 저장에 실패했습니다.');
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!confirm('정말로 이 예산을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteBudget(budgetId);
      alert('예산이 삭제되었습니다.');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete budget:', error);
      alert(error.message || '예산 삭제에 실패했습니다.');
    }
  };

  // Category CRUD handlers
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      type: 'expense'
    });
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      type: category.type
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        alert('카테고리명을 입력해주세요.');
        return;
      }

      const payload = {
        name: categoryFormData.name,
        type: categoryFormData.type
      };

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
        alert('카테고리가 수정되었습니다.');
      } else {
        await api.createCategory(payload);
        alert('카테고리가 추가되었습니다.');
      }

      setIsCategoryModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      alert(error.message || '카테고리 저장에 실패했습니다.');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('정말로 이 카테고리를 삭제하시겠습니까? 연관된 지출/예산도 영향을 받을 수 있습니다.')) {
      return;
    }

    try {
      await api.deleteCategory(categoryId);
      alert('카테고리가 삭제되었습니다.');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      alert(error.message || '카테고리 삭제에 실패했습니다.');
    }
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">설정</h2>

      {/* Category Management */}
      <Card title="카테고리 관리">
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleCreateCategory}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
          >
            카테고리 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3">카테고리명</th>
                <th className="p-3">유형</th>
                <th className="p-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">
                    카테고리가 없습니다. "카테고리 추가"를 클릭하여 생성하세요.
                  </td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                    <td className="p-3 font-medium">{category.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        category.type === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {category.type === 'income' ? '수입' : '지출'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-sky-400 hover:text-sky-300 mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
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

      {/* User Management */}
      <Card title="가족 구성원">
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleCreateUser}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
          >
            구성원 초대
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3">이름</th>
                <th className="p-3">이메일</th>
                <th className="p-3">역할</th>
                <th className="p-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                  <td className="p-3 flex items-center">
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                    {user.name}
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === UserRole.Admin ? 'bg-red-500 text-white' :
                        user.role === UserRole.Editor ? 'bg-yellow-500 text-gray-900' :
                        'bg-blue-500 text-white'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-sky-400 hover:text-sky-300 mr-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Budget Management */}
      <Card title="예산 설정">
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleCreateBudget}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
          >
            예산 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3">카테고리</th>
                <th className="p-3">월</th>
                <th className="p-3">예산 한도</th>
                <th className="p-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(budget => (
                <tr key={budget.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                  <td className="p-3">{getCategoryName(budget.categoryId)}</td>
                  <td className="p-3">{budget.month}</td>
                  <td className="p-3">₩{budget.limitAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="text-sky-400 hover:text-sky-300 mr-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Exchange Rate Settings */}
      <Card title="환율 설정">
        <p className="text-sm text-gray-400">
          USD ↔ KRW 통화 변환에 사용할 환율을 입력하세요. 상단 통화 토글 및 대시보드, 지출/수익, 투자 화면에 즉시 반영됩니다.
        </p>

        {exchangeRateError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {exchangeRateError}
          </div>
        )}
        {exchangeRateMessage && !exchangeRateError && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {exchangeRateMessage}
          </div>
        )}

        <div className="mt-4 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-gray-300">USD → KRW 환율</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={exchangeRateInput}
                onChange={(event) => handleExchangeRateInputChange(event.target.value)}
                className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                placeholder="예: 1350.25"
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">
                현재 적용값: {exchangeRate.toLocaleString()}₩
              </span>
            </div>
          </div>
          <button
            onClick={handleExchangeRateSave}
            disabled={isSavingExchangeRate}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
              isSavingExchangeRate
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSavingExchangeRate ? '저장 중...' : '환율 적용'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          예: 입력값이 1350이면 USD 1 = 1,350 KRW로 계산됩니다. 가장 최신 환율을 직접 입력하여 금액 계산을 정확히 유지하세요.
        </p>
      </Card>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-lg sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingCategory ? '카테고리 수정' : '카테고리 추가'}
              </h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">카테고리명</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: 식비, 교통비"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">유형</label>
                <div className="relative">
                  <select
                    value={categoryFormData.type}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value as 'income' | 'expense' })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  >
                    <option value="expense" className="bg-gray-800">지출</option>
                    <option value="income" className="bg-gray-800">수입</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-400">
                    <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4 -mb-4 sm:-mb-6">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded hover:bg-gray-700 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded hover:bg-sky-700 transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-lg sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingUser ? '구성원 수정' : '구성원 초대'}
              </h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">이름</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">이메일</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">역할</label>
                <div className="relative">
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  >
                    <option value={UserRole.Admin} className="bg-gray-800">Admin</option>
                    <option value={UserRole.Editor} className="bg-gray-800">Editor</option>
                    <option value={UserRole.Viewer} className="bg-gray-800">Viewer</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-400">
                    <svg className="h-4 sm:h-5 w-4 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">
                  {editingUser ? '비밀번호 (변경하려면 입력)' : '비밀번호'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder={editingUser ? '변경하지 않으려면 비워두세요' : '비밀번호를 입력하세요'}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4 -mb-4 sm:-mb-6">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded hover:bg-gray-700 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveUser}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded hover:bg-sky-700 transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-lg sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingBudget ? '예산 수정' : '예산 추가'}
              </h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">카테고리</label>
                <div className="relative">
                  <select
                    value={budgetFormData.categoryId}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, categoryId: Number(e.target.value) })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  >
                    <option value={0} className="bg-gray-800">카테고리 선택</option>
                    {categories
                      .filter(c => c.type === 'expense')
                      .map(category => (
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
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">월 (YYYY-MM)</label>
                <input
                  type="month"
                  value={budgetFormData.month}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, month: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-1 text-gray-300">예산 한도 (₩)</label>
                <input
                  type="number"
                  value={budgetFormData.limitAmount}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, limitAmount: Number(e.target.value) })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="1000000"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-inherit -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4 -mb-4 sm:-mb-6">
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded hover:bg-gray-700 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded hover:bg-sky-700 transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
