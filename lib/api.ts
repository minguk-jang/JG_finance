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
    created_by?: string;
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
    if (params?.created_by) {
      query = query.eq('created_by', params.created_by);
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
  // Issue Comments
  // ============================================
  getIssueComments: async (issueId: number) => {
    const data = await handleRequest(
      supabase
        .from('issue_comments')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })
    );

    // Manually fetch user data for each comment
    const comments = toCamelCase(data) || [];
    const users = await api.getUsers();

    return comments.map((comment: any) => ({
      ...comment,
      user: users?.find((u: any) => u.id === comment.userId)
    }));
  },

  getIssueComment: async (id: number) => {
    const data = await handleRequest(
      supabase
        .from('issue_comments')
        .select('*')
        .eq('id', id)
        .single()
    );

    const comment = toCamelCase(data);
    if (comment) {
      const users = await api.getUsers();
      comment.user = users?.find((u: any) => u.id === comment.userId);
    }

    return comment;
  },

  createIssueComment: async (commentData: any) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`인증 오류: ${authError.message}`);
      }

      if (!user?.id) {
        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
      }

      console.log('Authenticated user ID:', user.id);
      console.log('Comment data:', commentData);

      const snakeData = toSnakeCase({
        ...commentData,
        userId: user.id,
      });

      console.log('Snake case data:', snakeData);

      const data = await handleRequest(
        supabase
          .from('issue_comments')
          .insert(snakeData)
          .select()
          .single()
      );

      const comment = toCamelCase(data);

      // Manually fetch user data
      if (comment) {
        const users = await api.getUsers();
        comment.user = users?.find((u: any) => u.id === comment.userId);
      }

      return comment;
    } catch (error: any) {
      console.error('Error in createIssueComment:', error);
      throw error;
    }
  },

  updateIssueComment: async (id: number, commentData: any) => {
    const snakeData = toSnakeCase(commentData);
    const data = await handleRequest(
      supabase
        .from('issue_comments')
        .update(snakeData)
        .eq('id', id)
        .select()
        .single()
    );

    const comment = toCamelCase(data);

    // Manually fetch user data
    if (comment) {
      const users = await api.getUsers();
      comment.user = users?.find((u: any) => u.id === comment.userId);
    }

    return comment;
  },

  deleteIssueComment: async (id: number) => {
    await handleRequest(supabase.from('issue_comments').delete().eq('id', id));
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
    // Use maybeSingle() instead of single() to avoid multiple row issues with RLS policies
    const data = await handleRequest(
      supabase.from('users').update(snakeData).eq('id', id).select().maybeSingle()
    );
    return toCamelCase(data);
  },

  deleteUser: async (id: string) => {
    await handleRequest(supabase.from('users').delete().eq('id', id));
  },

  /**
   * Upload avatar image to Supabase Storage
   * @param file - Image file to upload
   * @param userId - User ID (used for folder organization)
   * @returns Public URL of the uploaded image
   */
  uploadAvatar: async (file: File, userId: string): Promise<string> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 업로드할 수 있습니다.');
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error('파일 크기는 2MB 이하여야 합니다.');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);

      // Provide user-friendly error messages
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        throw new Error(
          '❌ Storage가 설정되지 않았습니다.\n\n' +
          '📋 해결 방법:\n' +
          '1. QUICK_FIX_STORAGE.md 파일을 열어주세요\n' +
          '2. Supabase에서 avatars 버킷을 생성해주세요\n' +
          '3. 약 5분 소요됩니다\n\n' +
          '자세한 가이드: 프로젝트 루트의 QUICK_FIX_STORAGE.md'
        );
      }

      throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  /**
   * Delete avatar image from Supabase Storage
   * @param avatarUrl - Full URL of the avatar to delete
   */
  deleteAvatar: async (avatarUrl: string): Promise<void> => {
    // Extract file path from URL
    const url = new URL(avatarUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === 'avatars');

    if (bucketIndex === -1) {
      return; // Not a storage URL, skip deletion
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      // Don't throw error - deletion is not critical
    }
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

  // ============================================
  // Fixed Costs
  // ============================================
  getFixedCosts: async (params?: { is_active?: boolean; year_month?: string }) => {
    let query = supabase
      .from('fixed_costs')
      .select('*, category:categories(*)')
      .order('payment_day', { ascending: true });

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }

    // Filter by year_month: include only fixed costs where start_date <= month <= end_date
    if (params?.year_month) {
      const yearMonth = params.year_month;
      const [year, month] = yearMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
      const startOfMonth = `${yearMonth}-01`;

      query = query.lte('start_date', endOfMonth);
      query = query.or(`end_date.is.null,end_date.gte.${startOfMonth}`);
    }

    const data = await handleRequest(query);
    return toCamelCase(data);
  },

  getFixedCost: async (id: number) => {
    const data = await handleRequest(
      supabase
        .from('fixed_costs')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single()
    );
    return toCamelCase(data);
  },

  createFixedCost: async (fixedCostData: any) => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    const user = authData.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const snakeData = toSnakeCase({
      ...fixedCostData,
      createdBy: user.id,
    });

    const data = await handleRequest(
      supabase.from('fixed_costs').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateFixedCost: async (id: number, fixedCostData: any) => {
    const snakeData = toSnakeCase(fixedCostData);
    const data = await handleRequest(
      supabase.from('fixed_costs').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteFixedCost: async (id: number) => {
    await handleRequest(supabase.from('fixed_costs').delete().eq('id', id));
  },

  // ============================================
  // Fixed Cost Payments
  // ============================================
  getFixedCostPayments: async (params?: { year_month?: string; fixed_cost_id?: number; status?: string }) => {
    let query = supabase
      .from('fixed_cost_payments')
      .select('*, fixed_cost:fixed_costs(*, category:categories(*))')
      .order('year_month', { ascending: false });

    if (params?.year_month) {
      query = query.eq('year_month', params.year_month);
    }
    if (params?.fixed_cost_id) {
      query = query.eq('fixed_cost_id', params.fixed_cost_id);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const data = await handleRequest(query);
    return toCamelCase(data);
  },

  getFixedCostPayment: async (id: number) => {
    const data = await handleRequest(
      supabase
        .from('fixed_cost_payments')
        .select('*, fixed_cost:fixed_costs(*, category:categories(*))')
        .eq('id', id)
        .single()
    );
    return toCamelCase(data);
  },

  createFixedCostPayment: async (paymentData: any) => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    const user = authData.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const snakeData = toSnakeCase({
      ...paymentData,
      createdBy: user.id,
    });

    const data = await handleRequest(
      supabase.from('fixed_cost_payments').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateFixedCostPayment: async (id: number, paymentData: any) => {
    const snakeData = toSnakeCase(paymentData);
    const data = await handleRequest(
      supabase
        .from('fixed_cost_payments')
        .update(snakeData)
        .eq('id', id)
        .select()
        .single()
    );
    return toCamelCase(data);
  },

  deleteFixedCostPayment: async (id: number) => {
    await handleRequest(supabase.from('fixed_cost_payments').delete().eq('id', id));
  },

  /**
   * Generate fixed cost payments for a specific month
   * This will create payment records for all active fixed costs in the given month
   * Only includes fixed costs where start_date <= month <= end_date
   */
  generateMonthlyFixedCostPayments: async (yearMonth: string) => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    const user = authData.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Get all active fixed costs for the specific month (filtered by date range)
    const fixedCosts = await api.getFixedCosts({ is_active: true, year_month: yearMonth });
    if (!fixedCosts) return [];

    const payments = [];
    for (const fixedCost of fixedCosts) {
      // Check if payment already exists for this month
      const existing = await handleRequest(
        supabase
          .from('fixed_cost_payments')
          .select('*')
          .eq('fixed_cost_id', fixedCost.id)
          .eq('year_month', yearMonth)
          .maybeSingle()
      );

      if (existing) {
        continue; // Skip if already exists
      }

      const isFixedAmount = fixedCost.isFixedAmount ?? true;
      const scheduledAmount = isFixedAmount ? fixedCost.amount : null;

      // Create new payment
      const payment = await api.createFixedCostPayment({
        fixedCostId: fixedCost.id,
        yearMonth,
        scheduledAmount,
        status: 'scheduled',
      });

      if (payment) {
        payments.push(payment);
      }
    }

    return payments;
  },

  /**
   * Get monthly summary statistics for fixed costs
   * Returns aggregated data including total scheduled, paid, remaining amounts
   */
  getFixedCostMonthlySummary: async (yearMonth: string) => {
    const { data, error } = await supabase.rpc('get_fixed_cost_monthly_summary', {
      target_year_month: yearMonth,
    });

    if (error) {
      throw new Error(handleSupabaseError(error));
    }

    // Return first row (should only be one)
    return data && data.length > 0 ? toCamelCase(data[0]) : null;
  },
};
