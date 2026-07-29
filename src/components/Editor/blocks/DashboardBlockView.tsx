/**
 * DashboardBlockView — minimal layout container for a ```dashboard fenced
 * block (#801). Each non-empty, non-comment line in the block body is a WQL
 * query; their results are stacked vertically.
 *
 * This is the thin v1 grouping wrapper. A richer schema (widget types, range,
 * layout, nested ```query fences) is owned by issue #746 and intentionally not
 * re-invented here.
 */
import { QueryBlockView } from './QueryBlockView';

export interface DashboardBlockViewProps {
  /** Raw text between the ```dashboard fences. */
  body: string;
}

/** Split a dashboard body into its constituent WQL query strings. */
export function parseDashboardQueries(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function DashboardBlockView({ body }: DashboardBlockViewProps) {
  const queries = parseDashboardQueries(body);
  if (queries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground my-1">
        Empty dashboard — add one WQL query per line.
      </div>
    );
  }
  return (
    <div className="space-y-3 my-1">
      {queries.map((query, i) => (
        <QueryBlockView key={`${i}-${query}`} query={query} />
      ))}
    </div>
  );
}
