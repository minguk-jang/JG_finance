import { supabase } from './supabase';
import type { Database } from '../types';

// Type aliases for convenience
type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

// Generic query builder for common operations
export class TableQuery<T extends TableName> {
  constructor(private tableName: T) {}

  // Get all records
  async getAll() {
    const { data, error } = await supabase.from(this.tableName).select('*');

    if (error) throw error;
    return data;
  }

  // Get record by ID
  async getById(id: number | string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Create record
  async create(record: any) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update record
  async update(id: number | string, updates: any) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete record
  async delete(id: number | string) {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) throw error;
  }

  // Custom query with filters
  query() {
    return supabase.from(this.tableName).select('*');
  }
}

// Convenience instances for each table
export const db = {
  users: new TableQuery('users'),
  categories: new TableQuery('categories'),
  expenses: new TableQuery('expenses'),
  budgets: new TableQuery('budgets'),
  investmentAccounts: new TableQuery('investment_accounts'),
  holdings: new TableQuery('holdings'),
  investmentTransactions: new TableQuery('investment_transactions'),
  issues: new TableQuery('issues'),
  labels: new TableQuery('labels'),
};

// Helper function to convert snake_case to camelCase
export function toCamelCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}

// Helper function to convert camelCase to snake_case
export function toSnakeCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}
