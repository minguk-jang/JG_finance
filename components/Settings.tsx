import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import { User, UserRole, Budget, Category } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getLocalDateString } from '../lib/dateUtils';

interface SettingsProps {
  exchangeRate: number;
  onExchangeRateChange: (value: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ exchangeRate, onExchangeRateChange }) => {
  const { signOut, user: currentUser, profile: currentProfile, isAdmin } = useAuth();
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Budget modal state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetFormData, setBudgetFormData] = useState({
    categoryId: '',
    month: getLocalDateString().slice(0, 7), // YYYY-MM
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

  // User invite state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const handleShowInviteGuide = () => {
    if (!isAdmin()) {
      alert('구성원 초대는 관리자만 가능합니다.');
      return;
    }
    setInviteLinkCopied(false);
    setIsInviteModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = window.location.origin;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 3000);
    });
  };

  const handleEditUser = (user: User) => {
    // Admin은 모든 사용자 수정 가능, 일반 사용자는 자신만 수정 가능
    if (!isAdmin() && user.id !== currentUser?.id) {
      alert('다른 구성원의 정보는 관리자만 수정할 수 있습니다.');
      return;
    }

    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || '',
      password: ''
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsUserModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('파일 크기는 2MB 이하여야 합니다.');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async () => {
    if (!editingUser) {
      alert('사용자 생성은 회원가입을 통해서만 가능합니다.');
      return;
    }

    // 일반 사용자는 자신의 정보만 수정 가능
    if (!isAdmin() && editingUser.id !== currentUser?.id) {
      alert('다른 구성원의 정보는 관리자만 수정할 수 있습니다.');
      return;
    }

    try {
      let avatarUrl = userFormData.avatar || editingUser.avatar;

      // Upload avatar if file is selected
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          avatarUrl = await api.uploadAvatar(avatarFile, editingUser.id);
        } catch (uploadError: any) {
          alert(uploadError.message || '이미지 업로드에 실패했습니다.');
          setIsUploadingAvatar(false);
          return;
        }
        setIsUploadingAvatar(false);
      }

      const payload: any = {
        name: userFormData.name,
        avatar: avatarUrl
      };

      // Admin만 역할 변경 가능
      if (isAdmin()) {
        payload.role = userFormData.role;
      }

      await api.updateUser(editingUser.id, payload);

      const isOwnProfile = editingUser.id === currentUser?.id;
      alert(isOwnProfile ? '내 정보가 수정되었습니다.' : '구성원 정보가 수정되었습니다.');

      setIsUserModalOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(error.message || '정보 저장에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // 본인 삭제 방지
    if (userId === currentUser?.id) {
      alert('자기 자신은 삭제할 수 없습니다.');
      return;
    }

    // Admin 권한 체크
    if (!isAdmin()) {
      alert('구성원 삭제는 관리자만 가능합니다.');
      return;
    }

    if (!confirm('정말로 이 구성원을 삭제하시겠습니까? 해당 구성원이 작성한 데이터도 함께 삭제될 수 있습니다.')) {
      return;
    }

    try {
      await api.deleteUser(userId);
      alert('구성원이 삭제되었습니다.');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.message || '구성원 삭제에 실패했습니다.');
    }
  };

  // User approval handlers
  const handleApproveUser = async (userId: string) => {
    if (!isAdmin()) {
      alert('사용자 승인은 관리자만 가능합니다.');
      return;
    }

    if (!confirm('이 사용자를 승인하시겠습니까?')) {
      return;
    }

    try {
      await api.approveUser(userId);
      alert('사용자가 승인되었습니다.');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      alert(error.message || '사용자 승인에 실패했습니다.');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!isAdmin()) {
      alert('사용자 거부는 관리자만 가능합니다.');
      return;
    }

    if (!confirm('이 사용자를 거부하고 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await api.deleteUserAccount(userId);
      alert('사용자 계정이 삭제되었습니다.');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to reject user:', error);
      alert(error.message || '사용자 거부에 실패했습니다.');
    }
  };

  // Budget CRUD handlers
  const handleCreateBudget = () => {
    setEditingBudget(null);
    setBudgetFormData({
      categoryId: categories.find(c => c.type === 'expense')?.id || '',
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

  const handleDeleteBudget = async (budgetId: string) => {
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

  const handleDeleteCategory = async (categoryId: string) => {
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

  const getCategoryName = (categoryId: string) => {
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
          {isAdmin() && (
            <button
              onClick={handleShowInviteGuide}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
            >
              구성원 초대 안내
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3">이름</th>
                <th className="p-3">이메일</th>
                <th className="p-3">
                  <div className="flex items-center gap-1">
                    역할
                    <div className="relative group">
                      <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-sm text-gray-200 rounded-lg shadow-lg -top-2 left-6 border border-gray-700">
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold text-red-400">Admin:</span> 모든 권한 (구성원 관리, 카테고리, 예산 설정)
                          </div>
                          <div>
                            <span className="font-semibold text-yellow-400">Editor:</span> 지출/수익/투자 생성, 수정, 삭제
                          </div>
                          <div>
                            <span className="font-semibold text-blue-400">Viewer:</span> 모든 데이터 조회만 가능
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="p-3">상태</th>
                <th className="p-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                  <td className="p-3 flex items-center">
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="text-xs bg-sky-600 px-2 py-0.5 rounded-full">나</span>
                      )}
                    </div>
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
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'approved' ? 'bg-green-500 text-white' :
                        user.status === 'pending' ? 'bg-yellow-500 text-gray-900' :
                        'bg-red-500 text-white'
                    }`}>
                      {user.status === 'approved' ? '승인됨' :
                       user.status === 'pending' ? '대기중' : '거부됨'}
                    </span>
                  </td>
                  <td className="p-3">
                    {isAdmin() && (
                      <>
                        {user.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="text-green-400 hover:text-green-300 mr-2"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectUser(user.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              거부
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-sky-400 hover:text-sky-300 mr-2"
                            >
                              수정
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                삭제
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {!isAdmin() && user.id === currentUser?.id && (
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        내 정보 수정
                      </button>
                    )}
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

      {/* Account & Logout */}
      <Card title="계정 관리">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">
              현재 로그인한 계정
            </p>
            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold">
                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{currentUser?.email || '로그인된 사용자'}</p>
                <p className="text-xs text-gray-400">Supabase 인증</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={async () => {
                if (confirm('정말 로그아웃하시겠습니까?')) {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Logout failed:', error);
                    alert('로그아웃에 실패했습니다.');
                  }
                }
              }}
              className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </div>
      </Card>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-xl border-t sm:border border-gray-700">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingCategory ? '카테고리 수정' : '카테고리 추가'}
              </h3>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">카테고리명</label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    placeholder="예: 식비, 교통비"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">유형</label>
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
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 border-t border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded-lg hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded-lg hover:bg-sky-700 transition"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Guide Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-xl border-t sm:border border-gray-700">
            <div className="flex-shrink-0 border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <h3 className="text-lg sm:text-xl font-bold">가족 구성원 초대하기</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-sky-900/40 to-sky-800/20 border border-sky-600/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-sky-300">초대 프로세스</h4>
                  </div>
                  <ol className="space-y-2.5 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                      <div>
                        <p className="font-medium text-white">아래 링크를 복사하여 공유</p>
                        <p className="text-xs text-gray-400 mt-0.5">카카오톡, 문자 등으로 가족에게 전송</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                      <div>
                        <p className="font-medium text-white">가족 구성원이 직접 회원가입</p>
                        <p className="text-xs text-gray-400 mt-0.5">링크 접속 → 우측 상단 "로그인/회원가입" 클릭 → 이메일로 가입</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                      <div>
                        <p className="font-medium text-white">Admin이 역할 변경</p>
                        <p className="text-xs text-gray-400 mt-0.5">가입 완료 후 이 화면에서 역할을 Editor 또는 Admin으로 변경</p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      회원가입 링크
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={window.location.origin}
                      readOnly
                      className="flex-1 bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white font-mono select-all"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        inviteLinkCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                    >
                      {inviteLinkCopied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          복사됨
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          복사
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3.5">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-xs text-amber-200">
                      <p className="font-semibold mb-1">중요 안내</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>새로 가입한 사용자의 기본 역할은 <strong>Viewer</strong> (조회만 가능)</li>
                        <li>데이터 입력이 필요한 경우 Admin이 <strong>Editor</strong> 역할로 변경 필요</li>
                        <li>역할 변경은 이 "가족 구성원" 섹션에서 "수정" 버튼으로 가능</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-full px-4 py-2 text-sm font-medium bg-gray-600 rounded-lg hover:bg-gray-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-xl border-t sm:border border-gray-700">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingUser?.id === currentUser?.id ? '내 정보 수정' : '구성원 정보 수정'}
              </h3>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-3 sm:space-y-4">
                {/* Avatar Upload Section */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-300">프로필 사진</label>
                  <div className="flex items-center gap-4">
                    {/* Current/Preview Avatar */}
                    <div className="flex-shrink-0">
                      <img
                        src={avatarPreview || userFormData.avatar || editingUser?.avatar || 'https://via.placeholder.com/80'}
                        alt="프로필 미리보기"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                      />
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-block px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm rounded-lg cursor-pointer transition"
                      >
                        {avatarFile ? '다른 이미지 선택' : '이미지 업로드'}
                      </label>
                      {avatarFile && (
                        <button
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                          className="ml-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm rounded-lg transition"
                        >
                          취소
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG, GIF (최대 2MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">이름</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">이메일</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    readOnly
                    disabled
                    className="w-full bg-gray-600 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">역할</label>
                  <div className="relative">
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                      disabled={!isAdmin()}
                      className={`w-full border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white appearance-none transition-all ${
                        isAdmin()
                          ? 'bg-gray-700 border-gray-600 cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none'
                          : 'bg-gray-600 border-gray-600 cursor-not-allowed opacity-60'
                      }`}
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
                  {!isAdmin() && (
                    <p className="text-xs text-gray-500 mt-1">역할 변경은 관리자만 가능합니다</p>
                  )}
                </div>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <p className="text-xs text-gray-400">
                    비밀번호는 각 사용자가 자신의 계정 설정에서 직접 변경할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 border-t border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  disabled={isUploadingAvatar}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={isUploadingAvatar}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploadingAvatar ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      업로드 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-xl border-t sm:border border-gray-700">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingBudget ? '예산 수정' : '예산 추가'}
              </h3>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">카테고리</label>
                  <div className="relative">
                    <select
                      value={budgetFormData.categoryId}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, categoryId: e.target.value })}
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
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">월 (YYYY-MM)</label>
                  <input
                    type="month"
                    value={budgetFormData.month}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, month: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">예산 한도 (₩)</label>
                  <input
                    type="number"
                    value={budgetFormData.limitAmount}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, limitAmount: Number(e.target.value) })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    placeholder="1000000"
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 border-t border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-600 rounded-lg hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveBudget}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-sky-600 rounded-lg hover:bg-sky-700 transition"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
