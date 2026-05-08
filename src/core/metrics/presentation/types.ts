import { type IMetric, MetricType } from '@/core/models/Metric';

export type { IMetric, MetricType };

/**
 * Named display surface — each has distinct visibility and formatting rules.
 */
export type MetricPresentationSurface =
  | 'runtime-badge'       // MetricVisualizer, MetricSourceRow, Chromecast badge panels
  | 'timer-subtitle'      // timer-panel subLabel construction
  | 'history-label'       // RuntimeHistoryLog entry label strings
  | 'review-grid-cell'    // MetricPill in the review grid
  | 'review-grid-column'  // column visibility and column label in useGridData / GridHeader
  | 'label-composer'      // LabelComposer block label (no React, no Tailwind)
  | 'debug';              // Show everything including structural and system metrics

export type MetricRenderKind =
  | 'badge'               // Pill-style badge with background, border, icon
  | 'comment'             // Muted italic text, no badge chrome
  | 'plain-text'          // Bare text, no styling, for label concatenation
  | 'column-heading'      // Grid column header
  | 'hidden';             // Do not render

export type MetricTone =
  | 'time' | 'rep' | 'effort' | 'distance' | 'rounds' | 'action'
  | 'resistance' | 'rest' | 'muted' | 'system' | 'unknown';

export interface MetricPresentationToken {
  readonly metric: IMetric;
  /** Computed display text (e.g., "3 Rounds", "1:30", "Pushups") */
  readonly label: string;
  /** Hover tooltip text */
  readonly tooltip: string;
  readonly renderKind: MetricRenderKind;
  readonly tone: MetricTone;
  /** Icon key (maps to getMetricIcon — null if no icon) */
  readonly iconKey: string | null;
  readonly visible: boolean;
  /** True for group(+/-) and lap structural markers */
  readonly structural: boolean;
  /** True for effort metrics whose value is "Rest" */
  readonly rest: boolean;
  /** True for parser-origin text metrics (coach annotations) */
  readonly comment: boolean;
  /** True for user-origin metrics (user override in review grid) */
  readonly userEntered: boolean;
  /** Column label for review-grid-column surface */
  readonly columnLabel?: string;
}

export interface IMetricPresentationPolicy {
  present(metric: IMetric, surface: MetricPresentationSurface): MetricPresentationToken;
  presentGroup(
    metrics: readonly IMetric[],
    surface: MetricPresentationSurface,
  ): MetricPresentationToken[];
  columnLabel(type: MetricType | string): string;
  isStructural(metric: IMetric): boolean;
  isHidden(metric: IMetric, surface: MetricPresentationSurface): boolean;
}
