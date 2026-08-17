/**
 * @wod-wiki/ui
 * Interactive presentation, CodeMirror editor extensions, and WQL diagram widgets.
 */

import type { QueryResult } from '@wod-wiki/wql';

export * from './constants';

export interface QueryExecutor {
  runQuery(query: string): Promise<QueryResult>;
}

export interface WidgetProps {
  title?: string;
  data?: unknown[];
  className?: string;
}

export function formatMetricDisplay(name: string, value: number | string, unit?: string): string {
  return unit ? `${value} ${unit} (${name})` : `${value} ${name}`;
}
