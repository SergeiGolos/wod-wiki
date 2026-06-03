import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * ChoiceGroupMetric — a pipe-separated OR expression preserved for pre-run resolution.
 *
 * Emitted by Fusion (`fuseUnits`) when a slash/pipe separates two or more homogeneous
 * alternatives of the **same** MetricType (e.g. `185/125 lb` → two Resistance options;
 * `Run | Walk` → two Effort options). Separator between *different* MetricTypes is
 * silently dropped — no ChoiceGroupMetric is emitted.
 *
 * ## Lifecycle
 * 1. `fuseUnits` emits one ChoiceGroupMetric per homogeneous slash/pipe group, at origin `parser`.
 * 2. The Pre-Run Wizard finds it via `useCollectionMetrics` (scans for `MetricType.Choice`).
 * 3. The first alternative is pre-selected; the user may change it.
 * 4. On "Start Workout", the selected alternative replaces this Choice group in
 *    the same Statement's MetricContainer at origin `user-plan`.
 * 5. The runtime/compiler must not consume `MetricType.Choice`; any non-wizard
 *    entry point defaults unresolved choices before runtime creation.
 */
export class ChoiceGroupMetric implements IMetric {
  readonly type = MetricType.Choice;
  readonly origin: MetricOrigin = 'parser';
  readonly value: { alternatives: IMetric[] };
  readonly image: string;

  constructor(public readonly alternatives: IMetric[]) {
    this.value = { alternatives };
    this.image = alternatives.map(m => m.image ?? String(m.value ?? '')).join(' | ');
  }
}
