import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { getLocalDateString } from '../dateUtils';

// ============================================
// Query Keys
// ============================================
export const queryKeys = {
  categories: ['categories'] as const,
  expenses: (params?: any) => ['expenses', params] as const,
  budgets: (month?: string) => ['budgets', month] as const,
  holdings: ['holdings'] as const,
  investmentTransactions: (params?: any) => ['investment-transactions', params] as const,
  notes: ['notes'] as const,
  issues: ['issues'] as const,
  fixedCosts: ['fixed-costs'] as const,
  fixedCostPayments: (month: string) => ['fixed-cost-payments', month] as const,
};

// ============================================
// Categories
// ============================================
export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.getCategories,
  });
};

// ============================================
// Expenses
// ============================================
export const useExpenses = (params?: {
  from_date?: string;
  to_date?: string;
  category_id?: number;
  created_by?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: () => api.getExpenses(params),
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      // Invalidate all expense queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

// ============================================
// Budgets
// ============================================
export const useBudgets = (month?: string) => {
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: api.getBudgets,
  });
};

// ============================================
// Holdings
// ============================================
export const useHoldings = () => {
  return useQuery({
    queryKey: queryKeys.holdings,
    queryFn: api.getHoldings,
  });
};

// ============================================
// Investment Transactions
// ============================================
export const useInvestmentTransactions = (params?: {
  account_id?: number;
  type?: 'BUY' | 'SELL';
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.investmentTransactions(params),
    queryFn: () => api.getInvestmentTransactions(params),
  });
};

// ============================================
// Notes
// ============================================
export const useNotes = () => {
  return useQuery({
    queryKey: queryKeys.notes,
    queryFn: api.getNotes,
  });
};

// ============================================
// Issues
// ============================================
export const useIssues = () => {
  return useQuery({
    queryKey: queryKeys.issues,
    queryFn: api.getIssues,
  });
};

// ============================================
// Fixed Costs
// ============================================
export const useFixedCosts = () => {
  return useQuery({
    queryKey: queryKeys.fixedCosts,
    queryFn: api.getFixedCosts,
  });
};

export const useFixedCostPayments = (month: string) => {
  return useQuery({
    queryKey: queryKeys.fixedCostPayments(month),
    queryFn: () => api.getFixedCostPayments(month),
    enabled: !!month, // Only fetch if month is provided
  });
};

// ============================================
// Dashboard Queries - Optimized for current month only
// ============================================
export const useDashboardData = (selectedMonth?: string) => {
  const currentMonth = selectedMonth || getLocalDateString().slice(0, 7); // YYYY-MM
  const [year, month] = currentMonth.split('-').map(Number);
  const startDate = `${currentMonth}-01`;
  const endDate = `${currentMonth}-${new Date(year, month, 0).getDate()}`; // Last day of month

  // Fetch only current month's expenses
  const expensesQuery = useExpenses({
    from_date: startDate,
    to_date: endDate,
  });

  const categoriesQuery = useCategories();
  const budgetsQuery = useBudgets(currentMonth);
  const holdingsQuery = useHoldings();

  // Fetch transactions up to the end of current month
  const transactionsQuery = useInvestmentTransactions({
    end_date: endDate,
  });

  const notesQuery = useNotes();
  const issuesQuery = useIssues();
  const fixedCostPaymentsQuery = useFixedCostPayments(currentMonth);

  const isLoading =
    expensesQuery.isLoading ||
    categoriesQuery.isLoading ||
    budgetsQuery.isLoading ||
    holdingsQuery.isLoading ||
    transactionsQuery.isLoading;

  const error =
    expensesQuery.error ||
    categoriesQuery.error ||
    budgetsQuery.error ||
    holdingsQuery.error ||
    transactionsQuery.error;

  return {
    expenses: expensesQuery.data || [],
    categories: categoriesQuery.data || [],
    budgets: budgetsQuery.data || [],
    holdings: holdingsQuery.data || [],
    transactions: transactionsQuery.data || [],
    notes: notesQuery.data || [],
    issues: issuesQuery.data || [],
    fixedCostPayments: fixedCostPaymentsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      expensesQuery.refetch();
      categoriesQuery.refetch();
      budgetsQuery.refetch();
      holdingsQuery.refetch();
      transactionsQuery.refetch();
      notesQuery.refetch();
      issuesQuery.refetch();
      fixedCostPaymentsQuery.refetch();
    },
  };
};
