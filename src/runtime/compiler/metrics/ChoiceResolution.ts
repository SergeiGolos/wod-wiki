import { IMetric, MetricType } from '../../../core/models/Metric';
import type { ICodeStatement } from '../../../core/models/CodeStatement';
import { ChoiceGroupMetric } from './ChoiceGroupMetric';

/**
 * ChoiceResolution — the single owner of "collapse a Choice Group into a Statement".
 *
 * A `ChoiceGroupMetric` (`MetricType.Choice`) is a slash-separated OR expression
 * emitted by Fusion. The runtime never understands a Choice; it must be collapsed
 * into a concrete alternative **before the JIT compiles the first WOD block**.
 *
 * Collapsing means replacing the `ChoiceGroupMetric` with the selected concrete
 * alternative at origin `user-plan`. After collapse, the statement no longer
 * contains `MetricType.Choice`; the runtime/compiler must only ever see the
 * concrete selected metric.
 *
 * Two seams use this module:
 *  - The Pre-Run Wizard, when the user picks an alternative ({@link writeChoiceSelection}).
 *  - {@link RuntimeFactory.createRuntime}, as the enforced safety net that defaults
 *    any still-unresolved Choice before the runtime spins up ({@link collapseUnresolvedChoices}).
 *
 * This replaces the previously duplicated, inlined resolution logic that lived in
 * both `track-panel.tsx` and `RuntimeTimerPanel.tsx`.
 */

/** A located, still-unresolved Choice Group awaiting a selection. */
export interface ChoiceGroupRef {
  /** Index into the statements array. */
  statementIndex: number;
  /** The owning statement's id. */
  statementId: number | string;
  /** The Choice Group metric carrying the alternatives. */
  choice: ChoiceGroupMetric;
}

/**
 * Whether a Choice Group has already been structurally collapsed out of its
 * statement. A present `ChoiceGroupMetric` is still unresolved, even if older
 * code also wrote a same-type `user-plan` metric beside it.
 */
export function isChoiceResolved(stmt: ICodeStatement, choice: ChoiceGroupMetric): boolean {
  return !stmt.metrics.some((m) => m === choice);
}

/** Find every Choice Group across the statements that has not yet been collapsed. */
export function findUnresolvedChoices(statements: readonly ICodeStatement[]): ChoiceGroupRef[] {
  const refs: ChoiceGroupRef[] = [];
  statements.forEach((stmt, statementIndex) => {
    for (const metric of stmt.metrics) {
      if (metric.type === MetricType.Choice) {
        const choice = metric as ChoiceGroupMetric;
        if (!isChoiceResolved(stmt, choice)) {
          refs.push({ statementIndex, statementId: stmt.id, choice });
        }
      }
    }
  });
  return refs;
}

/**
 * Collapse a Choice Group into a Statement by removing that group and writing
 * the selected alternative at origin `user-plan`. Idempotent: any prior
 * user-plan metric of the chosen type is removed first, so re-selecting
 * (default → user pick → different pick) never accumulates duplicates.
 *
 * @param stmt          the statement owning the Choice Group
 * @param alternatives  the Choice Group's alternatives
 * @param selectedIndex index of the chosen alternative (out-of-range falls back to 0)
 */
export function writeChoiceSelection(
  stmt: ICodeStatement,
  alternatives: readonly IMetric[],
  selectedIndex: number,
): void {
  const chosen = alternatives[selectedIndex] ?? alternatives[0];
  if (!chosen) return;
  // Drop any prior user-plan pick of this type and remove the corresponding
  // ChoiceGroupMetric, then write the concrete selected metric.
  stmt.metrics.remove((m) => m.type === chosen.type && m.origin === 'user-plan');
  stmt.metrics.remove((m) => m.type === MetricType.Choice && (m as ChoiceGroupMetric).alternatives === alternatives);
  stmt.metrics.add({ ...chosen, origin: 'user-plan' });
}

/**
 * Safety net: collapse every still-unresolved Choice Group to its **first**
 * alternative (the documented pre-selected default). Run inside the runtime
 * factory before the first WOD block compiles, so a `MetricType.Choice` can never
 * reach a compiled Block. Selections already written by the wizard (a user-plan
 * metric of the chosen alternative type) are preserved while the stale Choice
 * group is removed.
 *
 * @returns the number of Choice Groups that were collapsed.
 */
export function collapseUnresolvedChoices(statements: readonly ICodeStatement[]): number {
  const unresolved = findUnresolvedChoices(statements);
  for (const ref of unresolved) {
    const stmt = statements[ref.statementIndex];
    const chosenType = ref.choice.alternatives[0]?.type;
    const hasExistingSelection = chosenType
      ? stmt.metrics.some((m) => m.type === chosenType && m.origin === 'user-plan')
      : false;
    if (hasExistingSelection) {
      stmt.metrics.remove((m) => m === ref.choice);
    } else {
      writeChoiceSelection(stmt, ref.choice.alternatives, 0);
    }
  }
  return unresolved.length;
}
