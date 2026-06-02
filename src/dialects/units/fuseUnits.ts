import { IMetric, MetricType } from "../../core/models/Metric";
import { ICodeStatement } from "../../core/models/CodeStatement";
import { UnitSet, Dimension } from "../../core/metrics/units";
import { DistanceMetric } from "../../runtime/compiler/metrics/DistanceMetric";
import { ResistanceMetric } from "../../runtime/compiler/metrics/ResistanceMetric";
import { EffortMetric } from "../../runtime/compiler/metrics/EffortMetric";
import { MeasuredMetric } from "../../runtime/compiler/metrics/MeasuredMetric";
import { SlashMetric } from "../../runtime/compiler/metrics/SlashMetric";
import { ChoiceGroupMetric } from "../../runtime/compiler/metrics/ChoiceGroupMetric";

/** Source location carried alongside a metric (the parser's SyntaxMeta, which
 *  includes `raw`). Optional because the pure helper is used meta-less in tests. */
type Meta = {
  line?: number;
  startOffset?: number;
  endOffset?: number;
  columnStart?: number;
  columnEnd?: number;
  length?: number;
  raw?: string;
} | undefined;

interface MetaPair {
  metric: IMetric;
  meta: Meta;
}

/**
 * Build the dimensioned metric for a fused number + unit. Length and mass map to
 * their dedicated classes (analytics depends on them); every other dimension
 * uses the generic {@link MeasuredMetric}. The stored unit is the token *as
 * written* (`miles`), not the canonical spelling, to preserve display fidelity.
 */
function metricForUnit(amount: number | undefined, token: string, dimension: Dimension): IMetric {
  switch (dimension) {
    case 'length':
      return new DistanceMetric(amount, token);
    case 'mass':
      return new ResistanceMetric(amount, token);
    default:
      return new MeasuredMetric(amount, token, dimension);
  }
}

function isBareNumber(m: IMetric): boolean {
  // RepMetric carries a number, or `undefined` for a collectible `?` quantity.
  return m.type === MetricType.Rep && (typeof m.value === 'number' || m.value === undefined);
}

/** Whether a metric is a dedicated SlashMetric (grammar separator, never an effort). */
function isSlashSeparator(m: IMetric): boolean {
  return m.type === MetricType.Slash;
}

function effortText(m: IMetric): string | null {
  if (m.type !== MetricType.Effort && m.type !== MetricType.Text) return null;
  if (typeof m.value === 'string') return m.value;
  return typeof m.image === 'string' ? m.image : null;
}

/** Whether a metric is a Distance/Resistance whose unit slot is still empty. */
function hasEmptyUnit(m: IMetric): boolean {
  if (m.type !== MetricType.Distance && m.type !== MetricType.Resistance) return false;
  const v = m.value as { amount?: number; unit?: string } | undefined;
  return !!v && v.amount !== undefined && (!v.unit || v.unit === '');
}

/** Meta spanning the number metric through the consumed unit token. */
function fusedMeta(numberMeta: Meta, effortMeta: Meta, token: string): Meta {
  if (!numberMeta || !effortMeta) return numberMeta ?? effortMeta;
  const startOffset = numberMeta.startOffset;
  const tokenEnd = (effortMeta.startOffset ?? 0) + token.length;
  const gap = (effortMeta.startOffset ?? 0) - (numberMeta.endOffset ?? 0);
  const raw =
    numberMeta.raw !== undefined
      ? numberMeta.raw + ' '.repeat(Math.max(0, gap)) + token
      : undefined;
  const length = startOffset !== undefined ? tokenEnd - startOffset : undefined;
  return {
    line: numberMeta.line,
    startOffset,
    endOffset: tokenEnd,
    columnStart: numberMeta.columnStart,
    columnEnd: numberMeta.columnStart !== undefined && length !== undefined
      ? numberMeta.columnStart + length
      : numberMeta.columnEnd,
    length,
    raw,
  };
}

/** Meta for the residual effort text left after the unit token is peeled. */
function residualMeta(effortMeta: Meta, rest: string): Meta {
  if (!effortMeta || effortMeta.raw === undefined) {
    return effortMeta ? { ...effortMeta, raw: rest } : effortMeta;
  }
  const restStart = effortMeta.raw.indexOf(rest);
  const offset = restStart >= 0 ? restStart : 0;
  const startOffset = (effortMeta.startOffset ?? 0) + offset;
  return {
    line: effortMeta.line,
    startOffset,
    endOffset: effortMeta.endOffset,
    columnStart: (effortMeta.columnStart ?? 0) + offset,
    columnEnd: effortMeta.columnEnd,
    length: rest.length,
    raw: rest,
  };
}

/**
 * Core fusion over metric+meta pairs. See {@link fuseUnits} for semantics.
 * Idempotent: once a unit word is consumed there is no bare Number+unit pair
 * left, so re-running is a no-op.
 */
function fusePairs(pairs: MetaPair[], units: UnitSet): MetaPair[] {
  const out: MetaPair[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const cur = pairs[i];
    const next = pairs[i + 1];

    // ── SlashMetric guard: a bare slash that no pattern consumed is silently dropped ──
    // This handles heterogeneous slash (e.g. "Run/5" — Effort + Rep) where no
    // ChoiceGroup is emitted. The slash token should never appear in output.
    if (cur.metric.type === MetricType.Slash) {
      continue;
    }

    // ── effort/effort choice: Effort(A) Slash Effort(B) → ChoiceGroupMetric ──────
    // Homogeneous: both sides are Effort → emit a single ChoiceGroupMetric.
    // Heterogeneous (e.g. Run/5): the slash guard above will drop the slash
    // when it becomes cur in the next iteration.
    if (next) {
      const curText = effortText(cur.metric);
      const thirdText = pairs[i + 2] ? effortText(pairs[i + 2].metric) : null;
      if (
        curText !== null &&
        isSlashSeparator(next.metric) &&
        thirdText !== null
      ) {
        // Collect all consecutive slash-separated efforts into one group.
        const alternatives: IMetric[] = [cur.metric];
        let j = i + 1; // points at the SlashMetric
        while (
          j + 1 < pairs.length &&
          isSlashSeparator(pairs[j].metric) &&
          effortText(pairs[j + 1].metric) !== null
        ) {
          alternatives.push(pairs[j + 1].metric);
          j += 2;
        }
        out.push({
          metric: new ChoiceGroupMetric(alternatives),
          meta: cur.meta,
        });
        i = j - 1; // consume all slash+effort pairs (for-loop does i++)
        continue;
      }
    }

    // ── {number}/{number} {unit} → ChoiceGroupMetric (homogeneous) ──────────────
    // Detect the 4-token sequence: bareNumber  Slash  bareNumber  unitText
    // Both numbers fuse to the same MetricType → ChoiceGroupMetric.
    // e.g. "185/125 lb" → ChoiceGroupMetric([Resistance(185,"lb"), Resistance(125,"lb")])
    if (next && pairs[i + 2] && pairs[i + 3]) {
      const second = pairs[i + 2];
      const fourth = pairs[i + 3];
      const fusable1 = isBareNumber(cur.metric) || hasEmptyUnit(cur.metric);
      const fusable2 = isBareNumber(second.metric) || hasEmptyUnit(second.metric);

      if (fusable1 && isSlashSeparator(next.metric) && fusable2) {
        const text = effortText(fourth.metric);
        const match = text !== null ? units.consumeLeading(text) : null;
        if (match) {
          const amount1 = isBareNumber(cur.metric)
            ? (cur.metric.value as number | undefined)
            : (cur.metric.value as { amount?: number }).amount;
          const amount2 = isBareNumber(second.metric)
            ? (second.metric.value as number | undefined)
            : (second.metric.value as { amount?: number }).amount;

          const alt1 = metricForUnit(amount1, match.token, match.unit.dimension);
          const alt2 = metricForUnit(amount2, match.token, match.unit.dimension);

          // Homogeneous check: both alternatives must resolve to the same MetricType.
          if (alt1.type === alt2.type) {
            const choiceMeta = fusedMeta(cur.meta, fourth.meta, match.token);
            out.push({
              metric: new ChoiceGroupMetric([alt1, alt2]),
              meta: choiceMeta,
            });
            if (match.rest) {
              out.push({
                metric: new EffortMetric(match.rest),
                meta: residualMeta(fourth.meta, match.rest),
              });
            }
            i += 3; // consume Slash, second number, unit text
            continue;
          }
        }
      }
    }

    if (next) {
      const fusable = isBareNumber(cur.metric) || hasEmptyUnit(cur.metric);
      if (fusable) {
        const text = effortText(next.metric);
        const match = text !== null ? units.consumeLeading(text) : null;
        if (match) {
          const amount = isBareNumber(cur.metric)
            ? (cur.metric.value as number | undefined)
            : (cur.metric.value as { amount?: number }).amount;
          out.push({
            metric: metricForUnit(amount, match.token, match.unit.dimension),
            meta: fusedMeta(cur.meta, next.meta, match.token),
          });
          if (match.rest) {
            out.push({
              metric: new EffortMetric(match.rest),
              meta: residualMeta(next.meta, match.rest),
            });
          }
          i++; // consume `next`
          continue;
        }
      }
    }

    out.push(cur);
  } // end for

  return out;
}

/**
 * Pure fusion over a metric array (no source metadata). Used by unit tests and
 * any caller that doesn't track `metricMeta`.
 *
 *   Rep(100) + Effort("m Run")  → Distance(100, "m") + Effort("Run")
 *   Rep(24)  + Effort("kg")     → Resistance(24, "kg")
 *   Rep(5)   + Effort("Burpees")→ unchanged (not a unit)
 */
export function fuseUnitsInMetrics(metrics: IMetric[], units: UnitSet): IMetric[] {
  return fusePairs(metrics.map((metric) => ({ metric, meta: undefined })), units).map((p) => p.metric);
}

/**
 * Rewrite a statement's metric list in place, fusing number + unit pairs and
 * keeping `metricMeta` source locations in sync (the fused metric spans the
 * number through the unit token; the residual effort keeps the remainder).
 * No-op when nothing fuses. Safe to call repeatedly (idempotent).
 */
export function fuseUnits(statement: ICodeStatement, units: UnitSet): void {
  const before = statement.metrics.toArray();
  const pairs: MetaPair[] = before.map((metric) => ({
    metric,
    meta: statement.metricMeta?.get(metric) as Meta,
  }));

  const after = fusePairs(pairs, units);

  const changed =
    after.length !== before.length || after.some((p, idx) => p.metric !== before[idx]);
  if (!changed) return;

  statement.metrics.clear().add(...after.map((p) => p.metric));

  if (statement.metricMeta) {
    const nextMeta = new Map(statement.metricMeta);
    // Drop stale entries for replaced metrics, add entries for new ones.
    for (const m of before) if (!after.some((p) => p.metric === m)) nextMeta.delete(m);
    for (const p of after) if (p.meta) nextMeta.set(p.metric, p.meta as any);
    statement.metricMeta = nextMeta;
  }
}
