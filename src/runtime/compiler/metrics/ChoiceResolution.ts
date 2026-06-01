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
 * Collapsing means writing the chosen alternative back into the Statement's
 * `MetricContainer` at origin `user-plan`, where the ownership ledger shadows the
 * parser-tier `ChoiceGroupMetric` (user-plan rank 2 < parser rank 3). The
 * `ChoiceGroupMetric` itself is left in place — it is filtered from the JIT cache
 * key and ignored by every strategy.
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
 * Whether a Choice Group has already been collapsed in its statement — i.e. a
 * `user-plan` metric of the chosen alternative's type is present.
 *
 * Resolution is keyed by the *type* of the alternatives (all alternatives in a
 * homogeneous group share one type), so a group is "resolved" once any user-plan
 * metric of that type exists alongside it.
 */
export function isChoiceResolved(stmt: ICodeStatement, choice: ChoiceGroupMetric): boolean {
  const chosenType = choice.alternatives[0]?.type;
  if (!chosenType) return true; // empty group — nothing to collapse
  return stmt.metrics.some((m) => m.type === chosenType && m.origin === 'user-plan');
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
 * Collapse a Choice Group into a Statement by writing the selected alternative at
 * origin `user-plan`. Idempotent: any prior user-plan metric of the chosen type is
 * removed first, so re-selecting (default → user pick → different pick) never
 * accumulates duplicates.
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
  // Drop any prior user-plan pick of this type, then write the chosen one.
  stmt.metrics.remove((m) => m.type === chosen.type && m.origin === 'user-plan');
  stmt.metrics.add({ ...chosen, origin: 'user-plan' });
}

/**
 * Safety net: collapse every still-unresolved Choice Group to its **first**
 * alternative (the documented pre-selected default). Run inside the runtime
 * factory before the first WOD block compiles, so a `MetricType.Choice` can never
 * reach a compiled Block — even on entry points that never show the Pre-Run Wizard
 * (tests, cast proxy, programmatic creation, autoStart).
 *
 * Selections already written by the wizard (a user-plan metric of the chosen type)
 * are left untouched.
 *
 * @returns the number of Choice Groups that were defaulted.
 */
export function collapseUnresolvedChoices(statements: readonly ICodeStatement[]): number {
  const unresolved = findUnresolvedChoices(statements);
  for (const ref of unresolved) {
    writeChoiceSelection(statements[ref.statementIndex], ref.choice.alternatives, 0);
  }
  return unresolved.length;
}
