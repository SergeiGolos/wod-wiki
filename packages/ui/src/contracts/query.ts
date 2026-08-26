import type { QueryResult, FindQueryResult, RowsQueryResult, RowsRun, ParsedAggregateQuery, ParsedFindQuery, ParsedRowsQuery, QueryOptions, FindOptions } from '@bitcobblers/wod-wiki-wql';

export interface QueryExecutor {
  runQuery(query: string, options?: QueryOptions): Promise<QueryResult>;
  runFind(parsed: ParsedFindQuery, options?: FindOptions): Promise<FindQueryResult>;
  runRows(parsed: ParsedRowsQuery, options?: { anchorNow?: number }): Promise<RowsQueryResult>;
  run?(parsed: ParsedAggregateQuery, options?: QueryOptions): Promise<QueryResult>;
}

export type {
  QueryResult,
  FindQueryResult,
  RowsQueryResult,
  RowsRun,
  QueryOptions,
  FindOptions,
  ParsedAggregateQuery,
  ParsedFindQuery,
  ParsedRowsQuery,
};
