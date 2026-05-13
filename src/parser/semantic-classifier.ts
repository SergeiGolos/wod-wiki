import { ParsedCodeStatement } from '../core/models/CodeStatement';
import { CodeMetadata } from '../core/models/CodeMetadata';
import { ActionMetric } from '../runtime/compiler/metrics/ActionMetric';
import { DistanceMetric } from '../runtime/compiler/metrics/DistanceMetric';
import { DurationMetric } from '../runtime/compiler/metrics/DurationMetric';
import { EffortMetric } from '../runtime/compiler/metrics/EffortMetric';
import { GroupMetric } from '../runtime/compiler/metrics/GroupMetric';
import { RepMetric } from '../runtime/compiler/metrics/RepMetric';
import { ResistanceMetric } from '../runtime/compiler/metrics/ResistanceMetric';
import { RoundsMetric } from '../runtime/compiler/metrics/RoundsMetric';
import { TextMetric } from '../runtime/compiler/metrics/TextMetric';
import { SyntaxFacts, SyntaxPrimitive } from './syntax-facts';

type MetricPair = { metrics: any; meta: CodeMetadata };

export function classifyStatements(facts: SyntaxFacts): ParsedCodeStatement[] {
  return facts.statements.map((fact) => {
    const statement = new ParsedCodeStatement();
    const metricPairs: MetricPair[] = [];

    for (const primitive of fact.primitives) {
      metricPairs.push(...classifyPrimitive(primitive, statement));
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

function classifyPrimitive(primitive: SyntaxPrimitive, statement: ParsedCodeStatement): MetricPair[] {
  switch (primitive.kind) {
    case 'lap':
      return [{ metrics: new GroupMetric(primitive.lapType, primitive.raw), meta: primitive.meta }];

    case 'duration': {
      if (primitive.isRequired) {
        if (!statement.hints) statement.hints = new Set();
        statement.hints.add('behavior.required_timer');
      }

      return primitive.timerRaw
        ? [{ metrics: new DurationMetric(primitive.timerRaw, primitive.hasTrend, primitive.isRequired), meta: primitive.meta }]
        : [];
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
      if (primitive.hasWeightUnit || primitive.hasAtSign) {
        return [{ metrics: new ResistanceMetric(primitive.value, primitive.unit), meta: primitive.meta }];
      }

      if (primitive.hasDistanceUnit) {
        return [{ metrics: new DistanceMetric(primitive.value, primitive.unit), meta: primitive.meta }];
      }

      return [{ metrics: new RepMetric(primitive.value), meta: primitive.meta }];
    }

    case 'effort':
      return [{ metrics: new EffortMetric(primitive.raw), meta: primitive.meta }];
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
        const mergedMeta: CodeMetadata = {
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
        const mergedMeta: CodeMetadata = {
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
