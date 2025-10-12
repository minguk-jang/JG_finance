const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, data: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(path: string, data: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(response);
}

// API endpoints
export const api = {
  // Categories
  getCategories: () => apiGet<any[]>('/categories'),
  getCategory: (id: number) => apiGet<any>(`/categories/${id}`),
  createCategory: (data: any) => apiPost<any>('/categories', data),
  updateCategory: (id: number, data: any) => apiPut<any>(`/categories/${id}`, data),
  deleteCategory: (id: number) => apiDelete(`/categories/${id}`),

  // Expenses
  getExpenses: (params?: { from_date?: string; to_date?: string; category_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.from_date) query.append('from_date', params.from_date);
    if (params?.to_date) query.append('to_date', params.to_date);
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    const queryString = query.toString();
    return apiGet<any[]>(`/expenses${queryString ? `?${queryString}` : ''}`);
  },
  getExpense: (id: number) => apiGet<any>(`/expenses/${id}`),
  createExpense: (data: any) => apiPost<any>('/expenses', data),
  updateExpense: (id: number, data: any) => apiPut<any>(`/expenses/${id}`, data),
  deleteExpense: (id: number) => apiDelete(`/expenses/${id}`),

  // Investments - Holdings
  getHoldings: () => apiGet<any[]>('/investments/holdings'),
  getHolding: (id: number) => apiGet<any>(`/investments/holdings/${id}`),
  createHolding: (data: any) => apiPost<any>('/investments/holdings', data),
  updateHolding: (id: number, data: any) => apiPut<any>(`/investments/holdings/${id}`, data),
  deleteHolding: (id: number) => apiDelete(`/investments/holdings/${id}`),

  // Investments - Accounts
  getInvestmentAccounts: () => apiGet<any[]>('/investments/accounts'),
  getInvestmentAccount: (id: number) => apiGet<any>(`/investments/accounts/${id}`),
  createInvestmentAccount: (data: any) => apiPost<any>('/investments/accounts', data),
  updateInvestmentAccount: (id: number, data: any) => apiPut<any>(`/investments/accounts/${id}`, data),
  deleteInvestmentAccount: (id: number) => apiDelete(`/investments/accounts/${id}`),

  // Investments - Transactions
  getInvestmentTransactions: (params?: {
    account_id?: number;
    symbol?: string;
    type?: 'BUY' | 'SELL';
    start_date?: string;
    end_date?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.account_id) query.append('account_id', params.account_id.toString());
    if (params?.symbol) query.append('symbol', params.symbol);
    if (params?.type) query.append('transaction_type', params.type);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const queryString = query.toString();
    return apiGet<any[]>(`/investments/transactions${queryString ? `?${queryString}` : ''}`);
  },
  getInvestmentTransaction: (id: number) => apiGet<any>(`/investments/transactions/${id}`),
  createInvestmentTransaction: (data: any) => apiPost<any>('/investments/transactions', data),
  updateInvestmentTransaction: (id: number, data: any) => apiPut<any>(`/investments/transactions/${id}`, data),
  deleteInvestmentTransaction: (id: number) => apiDelete(`/investments/transactions/${id}`),

  // Issues
  getIssues: (params?: { status?: string; assignee_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.assignee_id) query.append('assignee_id', params.assignee_id.toString());
    const queryString = query.toString();
    return apiGet<any[]>(`/issues${queryString ? `?${queryString}` : ''}`);
  },
  getIssue: (id: number) => apiGet<any>(`/issues/${id}`),
  createIssue: (data: any) => apiPost<any>('/issues', data),
  updateIssue: (id: number, data: any) => apiPut<any>(`/issues/${id}`, data),
  deleteIssue: (id: number) => apiDelete(`/issues/${id}`),

  // Labels
  getLabels: () => apiGet<any[]>('/issues/labels'),
  createLabel: (data: any) => apiPost<any>('/issues/labels', data),

  // Users
  getUsers: () => apiGet<any[]>('/users'),
  getUser: (id: number) => apiGet<any>(`/users/${id}`),
  createUser: (data: any) => apiPost<any>('/users', data),
  updateUser: (id: number, data: any) => apiPut<any>(`/users/${id}`, data),
  deleteUser: (id: number) => apiDelete(`/users/${id}`),

  // Budgets
  getBudgets: (params?: { month?: string; category_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.month) query.append('month', params.month);
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    const queryString = query.toString();
    return apiGet<any[]>(`/budgets${queryString ? `?${queryString}` : ''}`);
  },
  getBudget: (id: number) => apiGet<any>(`/budgets/${id}`),
  createBudget: (data: any) => apiPost<any>('/budgets', data),
  updateBudget: (id: number, data: any) => apiPut<any>(`/budgets/${id}`, data),
  deleteBudget: (id: number) => apiDelete(`/budgets/${id}`),
};
