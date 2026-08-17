/**
 * @wod-wiki/wql
 * Whiteboard Query Language (WQL) parser, AST, and QueryService.
 */

import type { StoredOutputStatement, WorkoutResult } from '@wod-wiki/core';

export const WQL_KEYWORDS = [
  'find',
  'rows',
  'where',
  'group',
  'by',
  'order',
  'limit',
  'sum',
  'avg',
  'min',
  'max',
  'count',
] as const;

export const WQL_CALC_TARGETS = [
  'volume',
  'density',
  'intensity',
  'workload',
  'wellness',
  'tonnage',
] as const;

export type WqlKeyword = (typeof WQL_KEYWORDS)[number];
export type WqlCalcTarget = (typeof WQL_CALC_TARGETS)[number];

export interface QueryAST {
  type: 'find' | 'rows';
  target: string;
  filters: Record<string, string | number>;
  limit?: number;
  raw: string;
}

export function parseQuery(query: string): QueryAST {
  const trimmed = query.trim();
  const isRows = trimmed.startsWith('rows');
  const type = isRows ? 'rows' : 'find';
  const tokens = trimmed.split(/\s+/);
  const target = tokens[1] || 'all';

  return {
    type,
    target,
    filters: {},
    raw: query,
  };
}

export function isFindQuery(ast: QueryAST): boolean {
  return ast.type === 'find';
}

export function isRowsQuery(ast: QueryAST): boolean {
  return ast.type === 'rows';
}

export interface FactQueryStore {
  getFacts(filter?: Record<string, unknown>): Promise<StoredOutputStatement[]>;
}

export interface ResultLogStore {
  getResults(filter?: Record<string, unknown>): Promise<WorkoutResult[]>;
}

export interface QueryServiceStores {
  factStore?: FactQueryStore;
  resultStore?: ResultLogStore;
}

export interface QueryResult<T = unknown> {
  query: string;
  data: T[];
  count: number;
}

export class QueryService {
  constructor(private readonly stores: QueryServiceStores = {}) {}

  async executeQuery(query: string): Promise<QueryResult> {
    const ast = parseQuery(query);
    if (this.stores.factStore) {
      const facts = await this.stores.factStore.getFacts(ast.filters);
      return {
        query,
        data: facts,
        count: facts.length,
      };
    }
    return {
      query,
      data: [],
      count: 0,
    };
  }
}
