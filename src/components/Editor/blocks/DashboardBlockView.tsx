/**
 * DashboardBlockView — minimal layout container for a ```dashboard fenced
 * block (#801, #842). Each query entry in the block body (line query or YAML widget)
 * is rendered as an individually editable QueryBlockView backed by WqlComposer.
 */
import { extractBlockQueries } from '../utils/blockQueryPatcher';
import { QueryBlockView } from './QueryBlockView';

export interface DashboardBlockViewProps {
  /** Raw text between the ```dashboard fences. */
  body: string;
  /** Optional callback when a query in the dashboard is edited and saved. */
  onSaveQuery?: (newQuery: string, queryIndex: number) => void;
  /** Read-only mode flag. */
  readOnly?: boolean;
}

/** Split a dashboard body into its constituent WQL query strings. */
export function parseDashboardQueries(body: string): string[] {
  const extracted = extractBlockQueries(body);
  if (extracted.length > 0) {
    return extracted.map((e) => e.query);
  }
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function DashboardBlockView({
  body,
  onSaveQuery,
  readOnly = false,
}: DashboardBlockViewProps) {
  const extracted = extractBlockQueries(body);
  const queries =
    extracted.length > 0
      ? extracted
      : parseDashboardQueries(body).map((q, i) => ({ queryIndex: i, query: q }));

  if (queries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground my-1">
        Empty dashboard — add one WQL query per line.
      </div>
    );
  }

  return (
    <div className="space-y-3 my-1">
      {queries.map((item) => (
        <QueryBlockView
          key={`${item.queryIndex}-${item.query}`}
          query={item.query}
          queryIndex={item.queryIndex}
          onSaveQuery={
            onSaveQuery
              ? (newQuery, queryIndex) =>
                  onSaveQuery(newQuery, queryIndex ?? item.queryIndex)
              : undefined
          }
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
