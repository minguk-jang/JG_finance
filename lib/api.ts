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
};
