export type Currency = 'KRW' | 'USD';
export type Page = 'Dashboard' | 'Expenses' | 'Income' | 'Investments' | 'Issues' | 'Settings';

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
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: 'Admin' | 'Editor' | 'Viewer';
          avatar?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          role?: 'Admin' | 'Editor' | 'Viewer';
          avatar?: string | null;
        };
      };
      categories: {
        Row: {
          id: number;
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
          id: number;
          category_id: number;
          date: string;
          amount: number;
          memo: string;
          created_by: string; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_id: number;
          date: string;
          amount: number;
          memo: string;
          created_by: string;
        };
        Update: {
          category_id?: number;
          date?: string;
          amount?: number;
          memo?: string;
        };
      };
      budgets: {
        Row: {
          id: number;
          category_id: number;
          month: string;
          limit_amount: number;
          created_at: string;
        };
        Insert: {
          category_id: number;
          month: string;
          limit_amount: number;
        };
        Update: {
          category_id?: number;
          month?: string;
          limit_amount?: number;
        };
      };
      investment_accounts: {
        Row: {
          id: number;
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
          id: number;
          account_id: number;
          symbol: string;
          name: string;
          qty: number;
          avg_price: number;
          current_price: number;
          updated_at: string;
        };
        Insert: {
          account_id: number;
          symbol: string;
          name: string;
          qty: number;
          avg_price: number;
          current_price: number;
        };
        Update: {
          account_id?: number;
          symbol?: string;
          name?: string;
          qty?: number;
          avg_price?: number;
          current_price?: number;
        };
      };
      investment_transactions: {
        Row: {
          id: number;
          account_id: number;
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
          account_id: number;
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
          account_id?: number;
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
          id: number;
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
          id: number;
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
          issue_id: number;
          label_id: number;
        };
        Insert: {
          issue_id: number;
          label_id: number;
        };
        Update: never;
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
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export interface Expense {
  id: number;
  categoryId: number;
  date: string;
  amount: number;
  memo: string;
  createdBy: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  month: string; // YYYY-MM
  limitAmount: number;
}

export interface InvestmentAccount {
  id: number;
  name: string;
  broker: string;
}

export interface Holding {
  id: number;
  accountId: number;
  symbol: string;
  name: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
}

export type InvestmentTransactionType = 'BUY' | 'SELL';

export interface InvestmentTransaction {
  id: number;
  accountId: number;
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
  id: number;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: number;
  labels: IssueLabel[];
  body: string;
}
