
import { User, UserRole, Category, Expense, Budget, InvestmentAccount, Holding, Issue, IssueStatus } from './types';

export const USD_KRW_EXCHANGE_RATE = 1350;

export const USERS: User[] = [
  { id: 1, name: 'Kim Jjoogguk', email: 'jjoogguk@family.com', role: UserRole.Admin, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Lee Hana', email: 'hana@family.com', role: UserRole.Editor, avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'Park Minjun', email: 'minjun@family.com', role: UserRole.Viewer, avatar: 'https://i.pravatar.cc/150?u=3' },
];

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Salary', type: 'income' },
  { id: 2, name: 'Groceries', type: 'expense' },
  { id: 3, name: 'Housing', type: 'expense' },
  { id: 4, name: 'Transportation', type: 'expense' },
  { id: 5, name: 'Entertainment', type: 'expense' },
  { id: 6, name: 'Utilities', type: 'expense' },
  { id: 7, name: 'Other Income', type: 'income'},
  { id: 8, name: 'Health', type: 'expense' },
];

export const EXPENSES: Expense[] = [
  { id: 1, categoryId: 1, date: '2024-07-01', amount: 5000000, memo: 'July Salary', createdBy: 1 },
  { id: 2, categoryId: 2, date: '2024-07-03', amount: 150000, memo: 'Weekly groceries', createdBy: 2 },
  { id: 3, categoryId: 3, date: '2024-07-05', amount: 1200000, memo: 'Monthly rent', createdBy: 1 },
  { id: 4, categoryId: 4, date: '2024-07-10', amount: 80000, memo: 'Gas', createdBy: 1 },
  { id: 5, categoryId: 5, date: '2024-07-12', amount: 50000, memo: 'Movie night', createdBy: 2 },
  { id: 6, categoryId: 6, date: '2024-07-15', amount: 120000, memo: 'Electricity and water', createdBy: 1 },
  { id: 7, categoryId: 2, date: '2024-07-17', amount: 130000, memo: 'More groceries', createdBy: 2 },
  { id: 8, categoryId: 8, date: '2024-07-20', amount: 75000, memo: 'Pharmacy', createdBy: 2 },
  { id: 9, categoryId: 7, date: '2024-07-22', amount: 300000, memo: 'Freelance project', createdBy: 1 },
];

export const BUDGETS: Budget[] = [
  { id: 1, categoryId: 2, month: '2024-07', limitAmount: 600000 },
  { id: 2, categoryId: 3, month: '2024-07', limitAmount: 1200000 },
  { id: 3, categoryId: 4, month: '2024-07', limitAmount: 150000 },
  { id: 4, categoryId: 5, month: '2024-07', limitAmount: 200000 },
  { id: 5, categoryId: 6, month: '2024-07', limitAmount: 150000 },
  { id: 6, categoryId: 8, month: '2024-07', limitAmount: 100000 },
];

export const INVESTMENT_ACCOUNTS: InvestmentAccount[] = [
  { id: 1, name: 'Domestic Stocks', broker: 'Kiwoom' },
  { id: 2, name: 'US Stocks', broker: 'Mirae Asset' },
];

export const HOLDINGS: Holding[] = [
  { id: 1, accountId: 1, symbol: '005930.KS', name: 'Samsung Electronics', qty: 10, avgPrice: 80000, currentPrice: 83000 },
  { id: 2, accountId: 1, symbol: '035420.KS', name: 'NAVER', qty: 20, avgPrice: 170000, currentPrice: 165000 },
  { id: 3, accountId: 2, symbol: 'AAPL', name: 'Apple Inc.', qty: 15, avgPrice: 180 * USD_KRW_EXCHANGE_RATE, currentPrice: 210 * USD_KRW_EXCHANGE_RATE },
  { id: 4, accountId: 2, symbol: 'TSLA', name: 'Tesla Inc.', qty: 5, avgPrice: 175 * USD_KRW_EXCHANGE_RATE, currentPrice: 185 * USD_KRW_EXCHANGE_RATE },
];

export const ISSUES: Issue[] = [
  { id: 1, title: 'Plan summer vacation budget', status: IssueStatus.InProgress, assigneeId: 2, labels: [{name: 'Budgeting', color: 'bg-blue-500'}], body: 'Need to finalize the budget for the upcoming trip to Jeju Island.' },
  { id: 2, title: 'Review investment portfolio', status: IssueStatus.Open, assigneeId: 1, labels: [{name: 'Investing', color: 'bg-green-500'}], body: 'Re-evaluate asset allocation for Q3.' },
  { id: 3, title: 'Pay credit card bills', status: IssueStatus.Closed, assigneeId: 1, labels: [{name: 'Bills', color: 'bg-red-500'}], body: 'All credit card bills for June have been paid.' },
  { id: 4, title: 'Research new savings account', status: IssueStatus.Open, assigneeId: 2, labels: [{name: 'Savings', color: 'bg-yellow-500'}], body: 'Look for high-yield savings account options.' },
];
