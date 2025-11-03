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

const fetchIssueWithLabels = async (issueId: string) => {
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
      supabase.from('categories').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at').order('id')
    );
    return toCamelCase(data);
  },

  getCategory: async (id: string) => {
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

  updateCategory: async (id: string, categoryData: any) => {
    const snakeData = toSnakeCase(categoryData);
    const data = await handleRequest(
      supabase.from('categories').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteCategory: async (id: string) => {
    await handleRequest(supabase.from('categories').delete().eq('id', id));
  },

  updateCategoriesOrder: async (orderedCategories: Array<{ id: string; sortOrder: number }>) => {
    // Update each category's sort_order in a batch
    const updates = orderedCategories.map(({ id, sortOrder }) =>
      supabase
        .from('categories')
        .update({ sort_order: sortOrder })
        .eq('id', id)
    );

    // Execute all updates
    await Promise.all(updates.map(update => handleRequest(update)));
  },

  // ============================================
  // Expenses
  // ============================================
  getExpenses: async (params?: {
    from_date?: string;
    to_date?: string;
    category_id?: string;
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

  getExpense: async (id: string) => {
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

  updateExpense: async (id: string, expenseData: any) => {
    const snakeData = toSnakeCase(expenseData);
    const data = await handleRequest(
      supabase.from('expenses').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteExpense: async (id: string) => {
    await handleRequest(supabase.from('expenses').delete().eq('id', id));
  },

  deleteExpenses: async (ids: string[]) => {
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

  getHolding: async (id: string) => {
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

  updateHolding: async (id: string, holdingData: any) => {
    const snakeData = toSnakeCase(holdingData);
    const data = await handleRequest(
      supabase.from('holdings').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteHolding: async (id: string) => {
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

  getInvestmentAccount: async (id: string) => {
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

  updateInvestmentAccount: async (id: string, accountData: any) => {
    const snakeData = toSnakeCase(accountData);
    const data = await handleRequest(
      supabase.from('investment_accounts').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteInvestmentAccount: async (id: string) => {
    await handleRequest(supabase.from('investment_accounts').delete().eq('id', id));
  },

  // ============================================
  // Investments - Transactions
  // ============================================
  getInvestmentTransactions: async (params?: {
    account_id?: string;
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

  getInvestmentTransaction: async (id: string) => {
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

  updateInvestmentTransaction: async (id: string, transactionData: any) => {
    const snakeData = toSnakeCase(transactionData);
    const data = await handleRequest(
      supabase.from('investment_transactions').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteInvestmentTransaction: async (id: string) => {
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

  getIssue: async (id: string) => {
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
      const relations = label_ids.map((labelId: string) => ({
        issue_id: createdIssue.id,
        label_id: labelId,
      }));
      await handleRequest(
        supabase.from('issue_labels').insert(relations).select()
      );
    }

    return fetchIssueWithLabels(createdIssue.id);
  },

  updateIssue: async (id: string, issueData: any) => {
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
        const relations = label_ids.map((labelId: string) => ({
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

  deleteIssue: async (id: string) => {
    await handleRequest(supabase.from('issues').delete().eq('id', id));
  },

  // ============================================
  // Issue Comments
  // ============================================
  getIssueComments: async (issueId: string) => {
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

  getIssueComment: async (id: string) => {
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

  updateIssueComment: async (id: string, commentData: any) => {
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

  deleteIssueComment: async (id: string) => {
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
   * Approve a pending user (Admin only)
   * @param userId - User ID to approve
   */
  approveUser: async (userId: string) => {
    const data = await handleRequest(
      supabase.from('users').update({ status: 'approved' }).eq('id', userId).select().single()
    );
    return toCamelCase(data);
  },

  /**
   * Reject and delete a user account completely (Admin only)
   * This deletes the user from both auth.users and public.users
   * @param userId - User ID to delete
   */
  deleteUserAccount: async (userId: string) => {
    // Call the database function to delete user from auth.users
    // This will cascade delete from public.users as well
    await handleRequest(
      supabase.rpc('delete_user_account', { user_id: userId })
    );
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
  getBudgets: async (params?: { month?: string; category_id?: string }) => {
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

  getBudget: async (id: string) => {
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

  updateBudget: async (id: string, budgetData: any) => {
    const snakeData = toSnakeCase(budgetData);
    const data = await handleRequest(
      supabase.from('budgets').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteBudget: async (id: string) => {
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

  getFixedCost: async (id: string) => {
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

  updateFixedCost: async (id: string, fixedCostData: any) => {
    const snakeData = toSnakeCase(fixedCostData);
    const data = await handleRequest(
      supabase.from('fixed_costs').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteFixedCost: async (id: string) => {
    // 스마트 삭제 로직: 납부 내역이 있으면 soft delete, 없으면 hard delete
    const payments = await handleRequest(
      supabase.from('fixed_cost_payments').select('id').eq('fixed_cost_id', id).limit(1)
    );

    if (payments && payments.length > 0) {
      // 납부 내역이 있음 → Soft Delete (과거 기록 보존)
      const today = new Date().toISOString().split('T')[0];
      await handleRequest(
        supabase
          .from('fixed_costs')
          .update({ is_active: false, end_date: today })
          .eq('id', id)
      );
    } else {
      // 납부 내역이 없음 → Hard Delete (완전 삭제)
      await handleRequest(supabase.from('fixed_costs').delete().eq('id', id));
    }
  },

  // ============================================
  // Fixed Cost Payments
  // ============================================
  getFixedCostPayments: async (params?: { year_month?: string; fixed_cost_id?: string; status?: string }) => {
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

  getFixedCostPayment: async (id: string) => {
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

  updateFixedCostPayment: async (id: string, paymentData: any) => {
    const snakeData = toSnakeCase(paymentData);
    const data = await handleRequest(
      supabase
        .from('fixed_cost_payments')
        .update(snakeData)
        .eq('id', id)
        .select()
    );

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('고정비 납부 내역을 찾을 수 없거나 업데이트할 수 없습니다.');
    }

    return toCamelCase(data[0]);
  },

  deleteFixedCostPayment: async (id: string) => {
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

  // ============================================
  // Notes
  // ============================================
  getNotes: async () => {
    const data = await handleRequest(
      supabase
        .from('notes')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false })
    );
    return toCamelCase(data);
  },

  getNote: async (id: string) => {
    const data = await handleRequest(
      supabase.from('notes').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createNote: async (noteData: any) => {
    const snakeData = toSnakeCase(noteData);
    const data = await handleRequest(
      supabase.from('notes').insert(snakeData).select()
    );
    // Return first item from array instead of using .single()
    return toCamelCase(data?.[0]);
  },

  updateNote: async (id: string, noteData: any) => {
    const snakeData = toSnakeCase(noteData);
    const data = await handleRequest(
      supabase.from('notes').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteNote: async (id: string) => {
    await handleRequest(supabase.from('notes').delete().eq('id', id));
  },

  // Delete notes older than 7 days
  deleteOldNotes: async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    await handleRequest(
      supabase
        .from('notes')
        .delete()
        .eq('is_completed', true)
        .lt('completed_at', cutoffDate)
    );
  },

  // ============================================
  // Study Sessions
  // ============================================

  getStudySessions: async () => {
    const data = await handleRequest(
      supabase
        .from('study_sessions')
        .select('*')
        .order('date', { ascending: false })
    );
    return toCamelCase(data);
  },

  getStudySession: async (id: string) => {
    const data = await handleRequest(
      supabase.from('study_sessions').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createStudySession: async (sessionData: any) => {
    const snakeData = toSnakeCase(sessionData);
    const data = await handleRequest(
      supabase.from('study_sessions').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateStudySession: async (id: string, sessionData: any) => {
    const snakeData = toSnakeCase(sessionData);
    const data = await handleRequest(
      supabase.from('study_sessions').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteStudySession: async (id: string) => {
    await handleRequest(supabase.from('study_sessions').delete().eq('id', id));
  },

  // ============================================
  // Study References
  // ============================================

  getStudyReferences: async (sessionId: string) => {
    const data = await handleRequest(
      supabase
        .from('study_references')
        .select('*')
        .eq('study_session_id', sessionId)
        .order('created_at', { ascending: true })
    );
    return toCamelCase(data);
  },

  createStudyReference: async (referenceData: any) => {
    const snakeData = toSnakeCase(referenceData);
    const data = await handleRequest(
      supabase.from('study_references').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateStudyReference: async (id: string, referenceData: any) => {
    const snakeData = toSnakeCase(referenceData);
    const data = await handleRequest(
      supabase.from('study_references').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteStudyReference: async (id: string) => {
    await handleRequest(supabase.from('study_references').delete().eq('id', id));
  },

  // ============================================
  // Study Follow-ups
  // ============================================

  getStudyFollowUps: async (sessionId: string) => {
    const data = await handleRequest(
      supabase
        .from('study_followups')
        .select('*')
        .eq('study_session_id', sessionId)
        .order('due', { ascending: true })
    );
    return toCamelCase(data);
  },

  createStudyFollowUp: async (followUpData: any) => {
    const snakeData = toSnakeCase(followUpData);
    const data = await handleRequest(
      supabase.from('study_followups').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateStudyFollowUp: async (id: string, followUpData: any) => {
    const snakeData = toSnakeCase(followUpData);
    const data = await handleRequest(
      supabase.from('study_followups').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteStudyFollowUp: async (id: string) => {
    await handleRequest(supabase.from('study_followups').delete().eq('id', id));
  },

  // ============================================
  // Calendar Events
  // ============================================

  getCalendarEvents: async (params?: {
    from_date?: string; // ISO 8601
    to_date?: string; // ISO 8601
    is_shared?: boolean;
    created_by?: string;
  }) => {
    let query = supabase.from('calendar_events').select('*');

    if (params?.from_date) {
      query = query.gte('start_at', params.from_date);
    }

    if (params?.to_date) {
      query = query.lte('end_at', params.to_date);
    }

    if (params?.is_shared !== undefined) {
      query = query.eq('is_shared', params.is_shared);
    }

    if (params?.created_by) {
      query = query.eq('created_by', params.created_by);
    }

    const data = await handleRequest(
      query.order('start_at', { ascending: true })
    );
    return toCamelCase(data);
  },

  getCalendarEvent: async (id: string) => {
    const data = await handleRequest(
      supabase.from('calendar_events').select('*').eq('id', id).single()
    );
    return toCamelCase(data);
  },

  createCalendarEvent: async (eventData: any) => {
    const snakeData = toSnakeCase(eventData);

    // Add current user as creator if not specified
    if (!snakeData.created_by) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      snakeData.created_by = user.id;
    }

    const data = await handleRequest(
      supabase.from('calendar_events').insert(snakeData).select().single()
    );
    return toCamelCase(data);
  },

  updateCalendarEvent: async (id: string, eventData: any) => {
    const snakeData = toSnakeCase(eventData);
    const data = await handleRequest(
      supabase.from('calendar_events').update(snakeData).eq('id', id).select().single()
    );
    return toCamelCase(data);
  },

  deleteCalendarEvent: async (id: string) => {
    await handleRequest(supabase.from('calendar_events').delete().eq('id', id));
  },

  deleteCalendarEvents: async (ids: string[]) => {
    // Delete multiple events in batch
    for (const id of ids) {
      await handleRequest(supabase.from('calendar_events').delete().eq('id', id));
    }
  },

  // ============================================
  // User Calendar Preferences
  // ============================================

  getUserCalendarPreferences: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let data = await handleRequest(
      supabase
        .from('user_calendar_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()  // Returns null if no data instead of throwing error
    );

    // If no preferences exist, create default ones
    if (!data) {
      data = await api.createDefaultCalendarPreferences(user.id);
    }

    return toCamelCase(data);
  },

  getUserCalendarPreferencesForUser: async (userId: string) => {
    let data = await handleRequest(
      supabase
        .from('user_calendar_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()  // Returns null if no data instead of throwing error
    );

    // If no preferences exist, create default ones
    if (!data) {
      data = await api.createDefaultCalendarPreferences(userId);
    }

    return toCamelCase(data);
  },

  updateUserCalendarPreferences: async (preferences: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const snakeData = toSnakeCase(preferences);

    const data = await handleRequest(
      supabase
        .from('user_calendar_preferences')
        .update(snakeData)
        .eq('user_id', user.id)
        .select()
        .single()
    );
    return toCamelCase(data);
  },

  // Admin: Create or get default preferences for a user
  createDefaultCalendarPreferences: async (userId: string) => {
    const snakeData = {
      user_id: userId,
      color_hex: '#0ea5e9',
      palette_key: 'sky',
      reminders_default: [{ type: 'notification', minutes_before: 15, method: 'in_app' }],
      timezone: 'Asia/Seoul',
      week_starts_on: 1,
    };

    const data = await handleRequest(
      supabase
        .from('user_calendar_preferences')
        .upsert(snakeData, { onConflict: 'user_id' })
        .select()
        .single()
    );
    return toCamelCase(data);
  },

  // ============================================
  // User Color Preferences
  // ============================================

  getUserColorPreferences: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    );

    // If no preferences exist, create default ones
    if (!data) {
      data = await api.createDefaultColorPreferences(user.id);
    }

    return toCamelCase(data);
  },

  createDefaultColorPreferences: async (userId: string) => {
    const snakeData = {
      user_id: userId,
      personal_color: '#0ea5e9',
      personal_palette_key: 'sky',
      shared_color: '#ec4899',
      shared_palette_key: 'pink',
    };

    const data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .upsert(snakeData, { onConflict: 'user_id' })
        .select()
        .single()
    );
    return toCamelCase(data);
  },

  updateUserColorPreferences: async (preferences: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const snakeData = toSnakeCase({
      userId: user.id,
      ...preferences
    });

    const data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .upsert(snakeData, { onConflict: 'user_id' })
        .select()
        .single()
    );
    return toCamelCase(data);
  },

  // ============================================
  // Admin Color Management
  // ============================================

  getAllUserColorPreferences: async () => {
    const data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .select('*')
        .order('created_at', { ascending: true })
    );
    return toCamelCase(data);
  },

  getUserColorPreferencesForUser: async (userId: string) => {
    let data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    );

    // If no preferences exist, create default ones
    if (!data) {
      data = await api.createDefaultColorPreferences(userId);
    }

    return toCamelCase(data);
  },

  updateUserColorPreferencesAdmin: async (userId: string, preferences: any) => {
    const snakeData = toSnakeCase({
      userId,
      ...preferences
    });

    const data = await handleRequest(
      supabase
        .from('user_color_preferences')
        .upsert(snakeData, { onConflict: 'user_id' })
        .select()
        .single()
    );
    return toCamelCase(data);
  },
};
