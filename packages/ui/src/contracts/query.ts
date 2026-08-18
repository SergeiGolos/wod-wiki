import type {
  QueryResult,
  FindQueryResult,
  RowsQueryResult,
  RowsRun,
  ParsedQuery,
  ParsedFindQuery,
  ParsedRowsQuery,
  QueryOptions,
  FindOptions,
} from '@wod-wiki/engine';

export interface QueryExecutor {
  runQuery(query: string, options?: QueryOptions): Promise<QueryResult>;
  runFind(parsed: ParsedFindQuery, options?: FindOptions): Promise<FindQueryResult>;
  runRows(parsed: ParsedRowsQuery, options?: { anchorNow?: number }): Promise<RowsQueryResult>;
  run?(parsed: ParsedQuery, options?: QueryOptions): Promise<QueryResult>;
}

export type {
  QueryResult,
  FindQueryResult,
  RowsQueryResult,
  RowsRun,
  QueryOptions,
  FindOptions,
  ParsedQuery,
  ParsedFindQuery,
  ParsedRowsQuery,
};
