import type { ColumnDef } from './column-definition-language';

const COLUMN_MIN_WIDTHS: Record<string, string> = {
  '#': '40px',
  exercise: '180px',
  text: '160px',
  notes: '160px',
  completionReason: '160px',
  rep: '72px',
  rounds: '72px',
  'current-round': '72px',
  duration: '96px',
  distance: '96px',
  resistance: '96px',
  load: '96px',
  volume: '96px',
  intensity: '96px',
  metric: '96px',
  work: '96px',
  elapsedTotal: '96px',
  action: '96px',
  increment: '96px',
  timestamp: '96px',
  spans: '96px',
  blockKey: '180px',
  outputType: '96px',
  stackLevel: '72px',
  elapsed: '96px',
};

const ADD_COLUMN_MIN_WIDTH = '48px';

export function getGridColumnMinWidth(column: ColumnDef): string {
  return column.meta?.width ?? COLUMN_MIN_WIDTHS[column.id] ?? '96px';
}

export function getGridAddColumnMinWidth(): string {
  return ADD_COLUMN_MIN_WIDTH;
}
