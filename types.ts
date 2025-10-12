
export type Currency = 'KRW' | 'USD';
export type Page = 'Dashboard' | 'Expenses' | 'Income' | 'Investments' | 'Issues' | 'Settings';

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
