import { supabase, handleSupabaseError } from './supabase';
import { toCamelCase, toSnakeCase } from './database';

// Error handling wrapper
async function handleRequest<T>(
  request: Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  const { data, error } = await request;
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
  return data;
}

const ISSUE_WITH_LABELS_SELECT = `
  *,
  issue_labels:issue_labels (
    label_id,
    label:labels (
      id,
      name,
      color
    )
  )
`;

const normalizeIssue = (rawIssue: any) => {
  if (!rawIssue) {
    return rawIssue;
  }

  const camelIssue = toCamelCase(rawIssue);
  const relationships = Array.isArray(camelIssue.issueLabels) ? camelIssue.issueLabels : [];

  const labels = relationships
    .map((relation: any) => relation.label)
    .filter(Boolean)
    .map((label: any) => toCamelCase(label));

  const normalized = { ...camelIssue, labels };
  delete (normalized as any).issueLabels;
  return normalized;
};

const fetchIssueWithLabels = async (issueId: number) => {
  const issue = await handleRequest(
    supabase
      .from('issues')
      .select(ISSUE_WITH_LABELS_SELECT)
      .eq('id', issueId)
      .single()
  );

  if (!issue) {
    throw new Error('Issue not found');
  }

  return normalizeIssue(issue);
};

export const api = {
  // ============================================
  // Categories
  // ============================================
  getCategories: async () => {
    const data = await handleRequest(
      supabase.from('categories').select('*').order('id')
    );
    return toCamelCase(data);
  },

  getCategory: async (id: number) => {
    const data = await handleRequest(
      supabase.from('categories').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createCategory: async (categoryData: any) => {
    const snakeData = toSnakeCase(categoryData);
    const data = await handleRequest(
      supabase.from('categories').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateCategory: async (id: number, categoryData: any) => {
    const snakeData = toSnakeCase(categoryData);
    const data = await handleRequest(
      supabase.from('categories').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteCategory: async (id: number) => {
    await handleRequest(supabase.from('categories').delete().eq('id', id));
  },

  // ============================================
  // Expenses
  // ============================================
  getExpenses: async (params?: {
    from_date?: string;
    to_date?: string;
    category_id?: number;
  }) => {
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });

    if (params?.from_date) {
      query = query.gte('date', params.from_date);
    }
    if (params?.to_date) {
      query = query.lte('date', params.to_date);
    }
    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }

    const data = await handleRequest(query);
    return toCamelCase(data);
  },

  getExpense: async (id: number) => {
    const data = await handleRequest(
      supabase.from('expenses').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createExpense: async (expenseData: any) => {
    const snakeData = toSnakeCase(expenseData);

    // Set created_by if not already provided
    if (!snakeData.created_by) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        snakeData.created_by = user.id;
      } else {
        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
      }
    }

    const data = await handleRequest(
      supabase.from('expenses').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateExpense: async (id: number, expenseData: any) => {
    const snakeData = toSnakeCase(expenseData);
    const data = await handleRequest(
      supabase.from('expenses').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteExpense: async (id: number) => {
    await handleRequest(supabase.from('expenses').delete().eq('id', id));
  },

  deleteExpenses: async (ids: number[]) => {
    if (ids.length === 0) return;
    await handleRequest(supabase.from('expenses').delete().in('id', ids));
  },

  // ============================================
  // Investments - Holdings
  // ============================================
  getHoldings: async () => {
    const data = await handleRequest(
      supabase.from('holdings').select('*').order('id')
    );
    return toCamelCase(data);
  },

  getHolding: async (id: number) => {
    const data = await handleRequest(
      supabase.from('holdings').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createHolding: async (holdingData: any) => {
    const snakeData = toSnakeCase(holdingData);
    const data = await handleRequest(
      supabase.from('holdings').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateHolding: async (id: number, holdingData: any) => {
    const snakeData = toSnakeCase(holdingData);
    const data = await handleRequest(
      supabase.from('holdings').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteHolding: async (id: number) => {
    await handleRequest(supabase.from('holdings').delete().eq('id', id));
  },

  // ============================================
  // Investments - Accounts
  // ============================================
  getInvestmentAccounts: async () => {
    const data = await handleRequest(
      supabase.from('investment_accounts').select('*').order('id')
    );
    return toCamelCase(data);
  },

  getInvestmentAccount: async (id: number) => {
    const data = await handleRequest(
      supabase.from('investment_accounts').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createInvestmentAccount: async (accountData: any) => {
    const snakeData = toSnakeCase(accountData);
    const data = await handleRequest(
      supabase.from('investment_accounts').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateInvestmentAccount: async (id: number, accountData: any) => {
    const snakeData = toSnakeCase(accountData);
    const data = await handleRequest(
      supabase.from('investment_accounts').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteInvestmentAccount: async (id: number) => {
    await handleRequest(supabase.from('investment_accounts').delete().eq('id', id));
  },

  // ============================================
  // Investments - Transactions
  // ============================================
  getInvestmentTransactions: async (params?: {
    account_id?: number;
    symbol?: string;
    type?: 'BUY' | 'SELL';
    start_date?: string;
    end_date?: string;
  }) => {
    let query = supabase
      .from('investment_transactions')
      .select('*')
      .order('trade_date', { ascending: false });

    if (params?.account_id) {
      query = query.eq('account_id', params.account_id);
    }
    if (params?.symbol) {
      query = query.eq('symbol', params.symbol);
    }
    if (params?.type) {
      query = query.eq('type', params.type);
    }
    if (params?.start_date) {
      query = query.gte('trade_date', params.start_date);
    }
    if (params?.end_date) {
      query = query.lte('trade_date', params.end_date);
    }

    const data = await handleRequest(query);
    return toCamelCase(data);
  },

  getInvestmentTransaction: async (id: number) => {
    const data = await handleRequest(
      supabase.from('investment_transactions').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createInvestmentTransaction: async (transactionData: any) => {
    const snakeData = toSnakeCase(transactionData);
    const data = await handleRequest(
      supabase.from('investment_transactions').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateInvestmentTransaction: async (id: number, transactionData: any) => {
    const snakeData = toSnakeCase(transactionData);
    const data = await handleRequest(
      supabase.from('investment_transactions').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteInvestmentTransaction: async (id: number) => {
    await handleRequest(supabase.from('investment_transactions').delete().eq('id', id));
  },

  // ============================================
  // Issues
  // ============================================
  getIssues: async (params?: { status?: string; assignee_id?: string }) => {
    let query = supabase
      .from('issues')
      .select(ISSUE_WITH_LABELS_SELECT)
      .order('id', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.assignee_id) {
      query = query.eq('assignee_id', params.assignee_id);
    }

    const data = await handleRequest(query);
    const issues = Array.isArray(data) ? data : [];
    return issues.map(normalizeIssue);
  },

  getIssue: async (id: number) => {
    return fetchIssueWithLabels(id);
  },

  createIssue: async (issueData: any) => {
    const { label_ids = [], ...issueFields } = issueData;
    const snakeData = toSnakeCase(issueFields);
    const createdIssue = await handleRequest(
      supabase.from('issues').insert(snakeData).select().single()
    );

    if (!createdIssue) {
      throw new Error('Failed to create issue');
    }

    if (Array.isArray(label_ids) && label_ids.length > 0) {
      const relations = label_ids.map((labelId: number) => ({
        issue_id: createdIssue.id,
        label_id: labelId,
      }));
      await handleRequest(
        supabase.from('issue_labels').insert(relations).select()
      );
    }

    return fetchIssueWithLabels(createdIssue.id);
  },

  updateIssue: async (id: number, issueData: any) => {
    const { label_ids, ...issueFields } = issueData;
    const snakeData = toSnakeCase(issueFields);
    await handleRequest(
      supabase.from('issues').update(snakeData).eq('id', id).select().single()
    );

    if (Array.isArray(label_ids)) {
      await handleRequest(
        supabase.from('issue_labels').delete().eq('issue_id', id).select()
      );

      if (label_ids.length > 0) {
        const relations = label_ids.map((labelId: number) => ({
          issue_id: id,
          label_id: labelId,
        }));
        await handleRequest(
          supabase.from('issue_labels').insert(relations).select()
        );
      }
    }

    return fetchIssueWithLabels(id);
  },

  deleteIssue: async (id: number) => {
    await handleRequest(supabase.from('issues').delete().eq('id', id));
  },

  // ============================================
  // Labels
  // ============================================
  getLabels: async () => {
    const data = await handleRequest(
      supabase.from('labels').select('*').order('name')
    );
    return toCamelCase(data);
  },

  createLabel: async (labelData: any) => {
    const snakeData = toSnakeCase(labelData);
    const data = await handleRequest(
      supabase.from('labels').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  // ============================================
  // Users
  // ============================================
  getUsers: async () => {
    const data = await handleRequest(
      supabase.from('users').select('*').order('name')
    );
    return toCamelCase(data);
  },

  getUser: async (id: string) => {
    const data = await handleRequest(
      supabase.from('users').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createUser: async (userData: any) => {
    const snakeData = toSnakeCase(userData);
    const data = await handleRequest(
      supabase.from('users').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateUser: async (id: string, userData: any) => {
    const snakeData = toSnakeCase(userData);
    const data = await handleRequest(
      supabase.from('users').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteUser: async (id: string) => {
    await handleRequest(supabase.from('users').delete().eq('id', id));
  },

  // ============================================
  // Budgets
  // ============================================
  getBudgets: async (params?: { month?: string; category_id?: number }) => {
    let query = supabase.from('budgets').select('*').order('month', { ascending: false });

    if (params?.month) {
      query = query.eq('month', params.month);
    }
    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }

    const data = await handleRequest(query);
    return toCamelCase(data);
  },

  getBudget: async (id: number) => {
    const data = await handleRequest(
      supabase.from('budgets').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createBudget: async (budgetData: any) => {
    const snakeData = toSnakeCase(budgetData);
    const data = await handleRequest(
      supabase.from('budgets').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateBudget: async (id: number, budgetData: any) => {
    const snakeData = toSnakeCase(budgetData);
    const data = await handleRequest(
      supabase.from('budgets').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteBudget: async (id: number) => {
    await handleRequest(supabase.from('budgets').delete().eq('id', id));
  },
};
