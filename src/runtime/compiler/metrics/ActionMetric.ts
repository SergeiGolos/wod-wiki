import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

export interface ActionMetricOptions {
  /** Original text inside the action fence (after the colon) */
  raw?: string;
  /** Normalized action name (without leading ! pin marker) */
  name?: string;
  /** Whether the action is pinned ([:!action]) */
  isPinned?: boolean;
}

export class ActionMetric implements IMetric {
  readonly value: string;
  readonly image: string;
  readonly raw: string;
  readonly name: string;
  readonly isPinned: boolean;
  readonly origin: MetricOrigin = 'parser';

  constructor(action: string, options: ActionMetricOptions = {}) {
    // Preserve backward compatibility: "action" arg is the normalized name when options not provided
    this.raw = options.raw ?? action;
    this.isPinned = options.isPinned ?? this.raw.trim().startsWith('!');
    this.name = options.name ?? (this.raw.trim().replace(/^!/, '') || action);

    this.value = this.name;
    this.image = this.raw;
  }

  readonly type = MetricType.Action;
}

