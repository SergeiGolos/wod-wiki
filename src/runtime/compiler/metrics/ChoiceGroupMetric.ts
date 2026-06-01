import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * ChoiceGroupMetric — a slash-separated OR expression preserved for pre-run resolution.
 *
 * Emitted by Fusion (`fuseUnits`) when a slash separates two or more homogeneous
 * alternatives of the **same** MetricType (e.g. `185/125 lb` → two Resistance options;
 * `Run/Walk` → two Effort options). Slash between *different* MetricTypes is silently
 * dropped — no ChoiceGroupMetric is emitted.
 *
 * ## Lifecycle
 * 1. `fuseUnits` emits one ChoiceGroupMetric per homogeneous slash group, at origin `parser`.
 * 2. The Pre-Run Wizard finds it via `useCollectionMetrics` (scans for `MetricType.Choice`).
 * 3. The first alternative is pre-selected; the user may change it.
 * 4. On "Start Workout", the chosen alternative is written into the same Statement's
 *    MetricContainer at origin `user-plan`, shadowing this group via ownership-layer
 *    precedence (`user-plan` tier 2 > `parser` tier 3).
 * 5. The JIT compiler filters `MetricType.Choice` from its cache key (same as Hint)
 *    and strategies ignore it naturally — no strategy handles `MetricType.Choice`.
 * 6. Post-run, the group is never shown in display output (suppressed by the ownership
 *    ledger once the user-plan metric is present).
 */
export class ChoiceGroupMetric implements IMetric {
  readonly type = MetricType.Choice;
  readonly origin: MetricOrigin = 'parser';
  readonly value: { alternatives: IMetric[] };
  readonly image: string;

  constructor(public readonly alternatives: IMetric[]) {
    this.value = { alternatives };
    this.image = alternatives.map(m => m.image ?? String(m.value ?? '')).join('/');
  }
}
