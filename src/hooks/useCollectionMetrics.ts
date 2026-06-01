import { useMemo } from 'react';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { type Segment } from '@/core/models/AnalyticsModels';
import { MetricContainer } from '@/core/models/MetricContainer';
import type { WhiteboardScript } from '@/parser/WhiteboardScript';
import { ChoiceGroupMetric } from '@/runtime/compiler/metrics/ChoiceGroupMetric';
import { writeChoiceSelection } from '@/runtime/compiler/metrics/ChoiceResolution';

/** A hinted metric that requires a free-text/numeric value from the user. */
export interface ValueCollectionItem {
  kind: 'value';
  blockKey: string;
  exerciseLabel: string;
  metricType: MetricType;
  hint: string;
  existingValue?: unknown;
  origin: 'hinted';
  statementIndex: number;
  setIndex?: number;
  roundIndex?: number;
}

/**
 * A Choice Group metric that presents the user with mutually-exclusive
 * alternatives (emitted by Fusion for homogeneous slash expressions).
 * First alternative is pre-selected; user-plan resolution written on confirm.
 */
export interface ChoiceCollectionItem {
  kind: 'choice';
  blockKey: string;
  exerciseLabel: string;
  alternatives: IMetric[];
  selectedIndex: number;  // always 0 initially
  statementIndex: number;
  setIndex?: number;
  roundIndex?: number;
}

export type CollectionItem = ValueCollectionItem | ChoiceCollectionItem;
type CollectionScript = Pick<WhiteboardScript, 'statements'>;

/**
 * Facade: collapse a {@link ChoiceCollectionItem}'s selection into the script
 * before the WOD compiles, delegating to the ChoiceResolution owner.
 *
 * Lives in the hooks layer so component files resolve choices without importing
 * `@/runtime/*` directly (components-layer boundary, WOD-225).
 */
export function resolveChoiceSelection(
  script: CollectionScript | null | undefined,
  item: ChoiceCollectionItem,
  selectedIndex: number,
): void {
  const stmt = script?.statements[item.statementIndex];
  if (!stmt) return;
  writeChoiceSelection(stmt, item.alternatives, selectedIndex);
}

export function useCollectionMetrics(
  segments: Segment[],
  userOverrides: Map<string, MetricContainer>,
  script?: CollectionScript | null
) {
  const collectionItems = useMemo(() => {
    const items: CollectionItem[] = [];

    // Mode A: Pre-run planning (from script statements)
    if (segments.length === 0 && script) {
      for (let i = 0; i < script.statements.length; i++) {
        const stmt = script.statements[i];
        const blockKey = `stmt-${stmt.id}`;
        const overrides = userOverrides.get(blockKey);
        const effortMetric = stmt.metrics.find(m => m.type === MetricType.Effort || m.type === MetricType.Label);
        const exerciseLabel = effortMetric?.value?.toString() || effortMetric?.image || 'Exercise';

        for (const metric of stmt.metrics) {
          // Choice Group: slash-separated OR expression needing pre-run resolution
          if (metric.type === MetricType.Choice) {
            const choice = metric as ChoiceGroupMetric;
            items.push({
              kind: 'choice',
              blockKey,
              exerciseLabel,
              alternatives: choice.alternatives,
              selectedIndex: 0,
              statementIndex: i,
            } satisfies ChoiceCollectionItem);
            continue;
          }

          // Hinted value: free-text/numeric collection
          if (metric.origin === 'hinted' || metric.image === '?') {
            const hasOverride = overrides?.some(o => o.type === metric.type && o.origin === 'user');
            if (!hasOverride) {
              items.push({
                kind: 'value',
                blockKey,
                exerciseLabel,
                metricType: metric.type as MetricType,
                hint: metric.image || '?',
                origin: 'hinted',
                statementIndex: i,
              } satisfies ValueCollectionItem);
            }
          }
        }
      }
      return items;
    }

    // Mode B: Post-run review (from segments)
    for (const seg of segments) {
      if (!seg.metrics) continue;

      const blockKey = seg.name || `segment-${seg.id}`;
      const overrides = userOverrides.get(blockKey);

      // Find all hinted metrics in this segment
      for (const metric of seg.metrics) {
        if (metric.origin === 'hinted' || metric.image === '?') {
          // Check if there is already a user override for this type on this block
          const hasOverride = overrides?.some(o => o.type === metric.type && o.origin === 'user');
          
          if (!hasOverride) {
            // Find exercise label in the same segment
            const effortMetric = seg.metrics.find(m => m.type === MetricType.Effort || m.type === MetricType.Label);
            const exerciseLabel = effortMetric?.value?.toString() || effortMetric?.image || 'Exercise';

            // Try to extract round/set info from block key or context
            // blockKey format often: "pushups[0][1]" -> round 1, set 2
            const roundMatch = blockKey.match(/\[(\d+)\]/);
            const setMatch = blockKey.match(/\[\d+\]\[(\d+)\]/);

            items.push({
              kind: 'value',
              blockKey,
              exerciseLabel,
              metricType: metric.type as MetricType,
              hint: metric.image || '?',
              origin: 'hinted',
              statementIndex: (seg as any).context?.sourceStatementId ?? 0,
              roundIndex: roundMatch ? parseInt(roundMatch[1]) + 1 : undefined,
              setIndex: setMatch ? parseInt(setMatch[1]) + 1 : undefined,
            } satisfies ValueCollectionItem);
          }
        }
      }
    }

    return items;
  }, [segments, userOverrides, script]);

  return {
    collectionItems,
    totalCount: collectionItems.length,
    isComplete: collectionItems.length === 0,
  };
}
