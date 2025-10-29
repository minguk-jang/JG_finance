export type Currency = 'KRW' | 'USD';
export type Page = 'Dashboard' | 'Expenses' | 'Income' | 'Investments' | 'Issues' | 'Settings' | 'FixedCosts' | 'Notes';

// ============================================
// Supabase Database Types
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // UUID
          name: string;
          email: string;
          role: 'Admin' | 'Editor' | 'Viewer';
          status: 'pending' | 'approved' | 'rejected';
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: 'Admin' | 'Editor' | 'Viewer';
          status?: 'pending' | 'approved' | 'rejected';
          avatar?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          role?: 'Admin' | 'Editor' | 'Viewer';
          status?: 'pending' | 'approved' | 'rejected';
          avatar?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          type: 'income' | 'expense';
          created_at: string;
        };
        Insert: {
          name: string;
          type: 'income' | 'expense';
        };
        Update: {
          name?: string;
          type?: 'income' | 'expense';
        };
      };
      expenses: {
        Row: {
          id: string;
          category_id: string;
          date: string;
          amount: number;
          memo: string;
          created_by: string; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          date: string;
          amount: number;
          memo: string;
          created_by: string;
        };
        Update: {
          category_id?: string;
          date?: string;
          amount?: number;
          memo?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          category_id: string;
          month: string;
          limit_amount: number;
          created_at: string;
        };
        Insert: {
          category_id: string;
          month: string;
          limit_amount: number;
        };
        Update: {
          category_id?: string;
          month?: string;
          limit_amount?: number;
        };
      };
      investment_accounts: {
        Row: {
          id: string;
          name: string;
          broker: string;
          created_at: string;
        };
        Insert: {
          name: string;
          broker: string;
        };
        Update: {
          name?: string;
          broker?: string;
        };
      };
      holdings: {
        Row: {
          id: string;
          account_id: string;
          symbol: string;
          name: string;
          qty: number;
          avg_price: number;
          current_price: number;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          symbol: string;
          name: string;
          qty: number;
          avg_price: number;
          current_price: number;
        };
        Update: {
          account_id?: string;
          symbol?: string;
          name?: string;
          qty?: number;
          avg_price?: number;
          current_price?: number;
        };
      };
      investment_transactions: {
        Row: {
          id: string;
          account_id: string;
          symbol: string;
          name: string | null;
          type: 'BUY' | 'SELL';
          trade_date: string;
          quantity: number;
          price: number;
          fees: number;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          account_id: string;
          symbol: string;
          name?: string | null;
          type: 'BUY' | 'SELL';
          trade_date: string;
          quantity: number;
          price: number;
          fees?: number;
          memo?: string | null;
        };
        Update: {
          account_id?: string;
          symbol?: string;
          name?: string | null;
          type?: 'BUY' | 'SELL';
          trade_date?: string;
          quantity?: number;
          price?: number;
          fees?: number;
          memo?: string | null;
        };
      };
      issues: {
        Row: {
          id: string;
          title: string;
          status: 'Open' | 'In Progress' | 'Closed';
          priority: 'Low' | 'Medium' | 'High' | 'Critical';
          assignee_id: string; // UUID
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          status?: 'Open' | 'In Progress' | 'Closed';
          priority?: 'Low' | 'Medium' | 'High' | 'Critical';
          assignee_id: string;
          body: string;
        };
        Update: {
          title?: string;
          status?: 'Open' | 'In Progress' | 'Closed';
          priority?: 'Low' | 'Medium' | 'High' | 'Critical';
          assignee_id?: string;
          body?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          name: string;
          color: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
      };
      issue_labels: {
        Row: {
          issue_id: string;
          label_id: string;
        };
        Insert: {
          issue_id: string;
          label_id: string;
        };
        Update: never;
      };
      issue_comments: {
        Row: {
          id: string;
          issue_id: string;
          user_id: string; // UUID
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          issue_id: string;
          user_id: string;
          content: string;
        };
        Update: {
          content?: string;
        };
      };
      fixed_costs: {
        Row: {
          id: string;
          name: string;
          category_id: string;
          amount: number;
          payment_day: number; // 1-31
          start_date: string; // YYYY-MM-DD
          end_date: string | null; // YYYY-MM-DD
          is_active: boolean;
          is_fixed_amount: boolean;
          memo: string | null;
          created_by: string; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          category_id: string;
          amount: number;
          payment_day: number;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          is_fixed_amount?: boolean;
          memo?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          category_id?: string;
          amount?: number;
          payment_day?: number;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          is_fixed_amount?: boolean;
          memo?: string | null;
        };
      };
      fixed_cost_payments: {
        Row: {
          id: string;
          fixed_cost_id: string;
          year_month: string; // YYYY-MM
          scheduled_amount: number | null;
          actual_amount: number | null;
          payment_date: string | null; // YYYY-MM-DD
          status: 'scheduled' | 'paid' | 'skipped';
          memo: string | null;
          expense_id: string | null; // Link to expenses table
          created_by: string; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          fixed_cost_id: string;
          year_month: string;
          scheduled_amount?: number | null;
          actual_amount?: number | null;
          payment_date?: string | null;
          status?: 'scheduled' | 'paid' | 'skipped';
          memo?: string | null;
          expense_id?: string | null;
          created_by: string;
        };
        Update: {
          fixed_cost_id?: string;
          year_month?: string;
          scheduled_amount?: number | null;
          actual_amount?: number | null;
          payment_date?: string | null;
          status?: 'scheduled' | 'paid' | 'skipped';
          memo?: string | null;
          expense_id?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          content: string;
          is_completed: boolean;
          created_by: string; // UUID
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          content: string;
          is_completed?: boolean;
          created_by: string;
        };
        Update: {
          content?: string;
          is_completed?: boolean;
          completed_at?: string | null;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          topic: string;
          date: string;
          source: string | null;
          participants: string | null;
          tags: string[];
          highlights: string[];
          notes: string | null;
          created_by: string; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          topic: string;
          date: string;
          source?: string | null;
          participants?: string | null;
          tags?: string[];
          highlights?: string[];
          notes?: string | null;
          created_by: string;
        };
        Update: {
          topic?: string;
          date?: string;
          source?: string | null;
          participants?: string | null;
          tags?: string[];
          highlights?: string[];
          notes?: string | null;
        };
      };
      study_references: {
        Row: {
          id: string;
          study_session_id: string;
          title: string;
          url: string | null;
          created_at: string;
        };
        Insert: {
          study_session_id: string;
          title: string;
          url?: string | null;
        };
        Update: {
          title?: string;
          url?: string | null;
        };
      };
      study_followups: {
        Row: {
          id: string;
          study_session_id: string;
          task: string;
          owner: string | null;
          due: string | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          study_session_id: string;
          task: string;
          owner?: string | null;
          due?: string | null;
          completed?: boolean;
        };
        Update: {
          owner?: string | null;
          due?: string | null;
          completed?: boolean;
        };
      };
    };
  };
}

// ============================================
// Application Types (camelCase for frontend)
// ============================================

export type UserProfile = Database['public']['Tables']['users']['Row'];

export enum UserRole {
  Admin = 'Admin',
  Editor = 'Editor',
  Viewer = 'Viewer'
}

export interface User {
  id: string; // UUID from Supabase auth.users
  name: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  avatar: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export interface Expense {
  id: string;
  categoryId: string;
  date: string;
  amount: number;
  memo: string;
  createdBy: string; // UUID from users.id
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  limitAmount: number;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  broker: string;
}

export interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
}

export type InvestmentTransactionType = 'BUY' | 'SELL';

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  symbol: string;
  name?: string;
  type: InvestmentTransactionType;
  tradeDate: string;
  quantity: number;
  price: number;
  fees: number;
  memo?: string;
  account?: InvestmentAccount;
}

export enum IssueStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Closed = 'Closed'
}

export enum IssuePriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface IssueLabel {
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string; // UUID from users.id
  labels: IssueLabel[];
  body: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  userId: string; // UUID from users.id
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User; // Optional joined user data
}

export type FixedCostPaymentStatus = 'scheduled' | 'paid' | 'skipped';

export interface FixedCost {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  paymentDay: number; // 1-31
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  isActive: boolean;
  isFixedAmount: boolean;
  memo?: string;
  createdBy: string; // UUID from users.id
  category?: Category; // Optional joined data
}

export interface FixedCostPayment {
  id: string;
  fixedCostId: string;
  yearMonth: string; // YYYY-MM
  scheduledAmount: number | null;
  actualAmount: number | null;
  paymentDate: string | null; // YYYY-MM-DD
  status: FixedCostPaymentStatus;
  memo?: string;
  expenseId: string | null; // Link to expenses table
  createdBy: string; // UUID from users.id
  fixedCost?: FixedCost; // Optional joined data
}

export interface Note {
  id: string;
  content: string;
  isCompleted: boolean;
  createdBy: string; // UUID from users.id
  createdAt: string;
  completedAt: string | null;
}

export interface StudySession {
  id: string;
  topic: string;
  date: string; // YYYY-MM-DD
  source: string | null;
  participants: string | null;
  tags: string[];
  highlights: string[];
  notes: string | null;
  createdBy: string; // UUID from users.id
  createdAt: string;
  updatedAt: string;
  references?: StudyReference[]; // Optional joined data
  followUps?: StudyFollowUp[]; // Optional joined data
}

export interface StudyReference {
  id: string;
  studySessionId: string;
  title: string;
  url: string | null;
  createdAt: string;
}

export interface StudyFollowUp {
  id: string;
  studySessionId: string;
  task: string;
  owner: string | null;
  due: string | null; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
}
