import { ParsedCodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';
import { ActionMetric } from '../runtime/compiler/metrics/ActionMetric';
import { DistanceMetric } from '../runtime/compiler/metrics/DistanceMetric';
import { DurationMetric } from '../runtime/compiler/metrics/DurationMetric';
import { EffortMetric } from '../runtime/compiler/metrics/EffortMetric';
import { GroupMetric } from '../runtime/compiler/metrics/GroupMetric';
import { PropertyMetric } from '../runtime/compiler/metrics/PropertyMetric';
import { RepMetric } from '../runtime/compiler/metrics/RepMetric';
import { ResistanceMetric } from '../runtime/compiler/metrics/ResistanceMetric';
import { RoundsMetric } from '../runtime/compiler/metrics/RoundsMetric';
import { TextMetric } from '../runtime/compiler/metrics/TextMetric';
import { hintMetric } from '../core/metrics/hints';
import { SyntaxFacts, SyntaxMeta, SyntaxPrimitive } from './syntax-facts';

type MetricPair = { metrics: any; meta: SyntaxMeta };

const PROPERTY_KEY_TO_METRIC_TYPE: Record<string, MetricType> = {
  rpe: MetricType.SessionRPE,
  rir: MetricType.RIR,
  intensity: MetricType.Intensity,
  load: MetricType.Load,
  volume: MetricType.Volume,
  work: MetricType.Work,
};

export function classifyStatements(facts: SyntaxFacts): ParsedCodeStatement[] {
  return facts.statements.map((fact) => {
    const statement = new ParsedCodeStatement();
    const metricPairs: MetricPair[] = [];

    for (const primitive of fact.primitives) {
      metricPairs.push(...classifyPrimitive(primitive));
    }

    const mergedPairs = mergeFragments(metricPairs);
    statement.metrics = mergedPairs.map((pair) => pair.metrics);
    statement.metricMeta = new Map(mergedPairs.map((pair) => [pair.metrics, pair.meta]));

    statement.id = fact.id;
    statement.meta = fact.meta;
    statement.parent = fact.parentId;
    statement.children = fact.children;
    statement.isLeaf = fact.isLeaf;

    return statement;
  });
}

function classifyPrimitive(primitive: SyntaxPrimitive): MetricPair[] {
  switch (primitive.kind) {
    case 'lap':
      return [{ metrics: new GroupMetric(primitive.lapType, primitive.raw), meta: primitive.meta }];

    case 'duration': {
      const pairs: MetricPair[] = [];
      if (primitive.timerRaw) {
        pairs.push({ metrics: new DurationMetric(primitive.timerRaw, primitive.hasTrend, primitive.isRequired), meta: primitive.meta });
      }
      if (primitive.isRequired) {
        pairs.push({ metrics: hintMetric('behavior.required_timer', 'parser'), meta: primitive.meta });
      }
      return pairs;
    }

    case 'rounds': {
      if (primitive.sequence) {
        if (primitive.sequence.length === 1) {
          return [{ metrics: new RoundsMetric(primitive.sequence[0]), meta: primitive.meta }];
        }

        return [
          { metrics: new RoundsMetric(primitive.sequence.length), meta: primitive.meta },
          ...primitive.sequence.map((value) => ({ metrics: new RepMetric(value), meta: primitive.meta })),
        ];
      }

      return primitive.label
        ? [{ metrics: new RoundsMetric(primitive.label), meta: primitive.meta }]
        : [];
    }

    case 'action': {
      const actionText = primitive.hasColonPrefix
        ? primitive.raw.substring(2, primitive.raw.length - 1).trim()
        : primitive.raw.substring(1, primitive.raw.length - 1).trim();
      return [{ metrics: new ActionMetric(actionText, { raw: actionText }), meta: primitive.meta }];
    }

    case 'text': {
      const content = primitive.raw.substring(2).trim();
      return [{ metrics: new TextMetric(content, undefined), meta: primitive.meta }];
    }

    case 'quantity': {
      // Units are no longer a parser concept: a bare number is a Rep, and the
      // `@` marker denotes a load (Resistance with an as-yet-empty unit). The
      // base Units Dialect later fuses any following unit word (e.g. "kg") into
      // a dimensioned metric (see dialects/units/fuseUnits).
      if (primitive.hasAtSign) {
        return [{ metrics: new ResistanceMetric(primitive.value, ''), meta: primitive.meta }];
      }

      return [{ metrics: new RepMetric(primitive.value), meta: primitive.meta }];
    }

    case 'effort':
      return [{ metrics: new EffortMetric(primitive.raw), meta: primitive.meta }];

    case 'property': {
      const metricType = PROPERTY_KEY_TO_METRIC_TYPE[primitive.key.toLowerCase()] ?? MetricType.Custom;
      return [{
        metrics: new PropertyMetric(primitive.key, primitive.value, {
          type: metricType,
          image: primitive.raw,
        }),
        meta: primitive.meta,
      }];
    }

    case 'metric_object': {
      const pairs = primitive.pairs;
      return pairs.map((pair) => {
        const metricType = PROPERTY_KEY_TO_METRIC_TYPE[pair.key.toLowerCase()] ?? MetricType.Custom;
        return {
          metrics: new PropertyMetric(pair.key, pair.value, {
            type: metricType,
            image: `${pair.key}: ${pair.value}`,
          }),
          meta: primitive.meta,
        };
      });
    }
  }
}

/**
 * Merges adjacent metrics that should have been parsed as a single metrics.
 * Handles overlaps like Rep + ResistanceUnit -> Resistance.
 */
function mergeFragments(pairs: MetricPair[]): MetricPair[] {
  if (pairs.length < 2) return pairs;

  const result: MetricPair[] = [];
  let current = pairs[0];

  for (let index = 1; index < pairs.length; index++) {
    const next = pairs[index];

    if (current.metrics instanceof EffortMetric && next.metrics instanceof EffortMetric) {
      const gap = next.meta.startOffset - current.meta.endOffset;
      if (gap <= 1) {
        const mergedMeta: SyntaxMeta = {
          ...current.meta,
          endOffset: next.meta.endOffset,
          columnEnd: next.meta.columnEnd,
          length: next.meta.endOffset - current.meta.startOffset,
          raw: current.meta.raw + (gap === 1 ? ' ' : '') + next.meta.raw,
        };
        current = {
          metrics: new EffortMetric(current.metrics.effort + (gap === 1 ? ' ' : '') + next.metrics.effort),
          meta: mergedMeta,
        };
        continue;
      }
    }

    if (current.metrics instanceof RepMetric && (next.metrics instanceof ResistanceMetric || next.metrics instanceof DistanceMetric)) {
      const gap = next.meta.startOffset - current.meta.endOffset;
      if (gap <= 1) {
        const mergedMeta: SyntaxMeta = {
          ...current.meta,
          endOffset: next.meta.endOffset,
          columnEnd: next.meta.columnEnd,
          length: next.meta.endOffset - current.meta.startOffset,
          raw: current.meta.raw + (gap === 1 ? ' ' : '') + next.meta.raw,
        };
        if (next.metrics instanceof ResistanceMetric && next.metrics.value.amount === undefined) {
          current = {
            metrics: new ResistanceMetric(current.metrics.reps, next.metrics.unit),
            meta: mergedMeta,
          };
          continue;
        }
        if (next.metrics instanceof DistanceMetric && next.metrics.value.amount === undefined) {
          current = {
            metrics: new DistanceMetric(current.metrics.reps, next.metrics.unit),
            meta: mergedMeta,
          };
          continue;
        }
      }
    }

    result.push(current);
    current = next;
  }

  result.push(current);
  return result;
}
