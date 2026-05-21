import { useMemo } from 'react';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { type Segment } from '@/core/models/AnalyticsModels';
import { MetricContainer } from '@/core/models/MetricContainer';
import { WhiteboardScript } from '@/parser/WhiteboardScript';

export interface CollectionItem {
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

export function useCollectionMetrics(
  segments: Segment[],
  userOverrides: Map<string, MetricContainer>,
  script?: WhiteboardScript | null
) {
  const collectionItems = useMemo(() => {
    const items: CollectionItem[] = [];

    // Mode A: Pre-run planning (from script statements)
    if (segments.length === 0 && script) {
      for (let i = 0; i < script.statements.length; i++) {
        const stmt = script.statements[i];
        const blockKey = `stmt-${stmt.id}`;
        const overrides = userOverrides.get(blockKey);

        for (const metric of stmt.metrics) {
          if (metric.origin === 'hinted' || metric.image === '?') {
            const hasOverride = overrides?.some(o => o.type === metric.type && o.origin === 'user');
            if (!hasOverride) {
              const effortMetric = stmt.metrics.find(m => m.type === MetricType.Effort || m.type === MetricType.Label);
              const exerciseLabel = effortMetric?.value?.toString() || effortMetric?.image || 'Exercise';

              items.push({
                blockKey,
                exerciseLabel,
                metricType: metric.type as MetricType,
                hint: metric.image || '?',
                origin: 'hinted',
                statementIndex: i,
              });
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
              blockKey,
              exerciseLabel,
              metricType: metric.type as MetricType,
              hint: metric.image || '?',
              origin: 'hinted',
              statementIndex: (seg as any).context?.sourceStatementId ?? 0,
              roundIndex: roundMatch ? parseInt(roundMatch[1]) + 1 : undefined,
              setIndex: setMatch ? parseInt(setMatch[1]) + 1 : undefined,
            });
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
