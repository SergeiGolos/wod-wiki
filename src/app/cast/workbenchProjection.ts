import { formatTimeMMSS } from '@/lib/formatTime';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { DocumentItem } from '@/components/Editor/utils/documentStructure';
import type { WodBlock } from '@/components/Editor/types';
import type { RpcWorkbenchUpdate } from '@/hooks/useCastSignaling';

export function buildReviewProjection(
  analyticsSegments: Segment[],
): RpcWorkbenchUpdate {
  const totalSeconds = analyticsSegments.length > 0
    ? Math.max(...analyticsSegments.map((segment) => segment.endTime))
      - Math.min(...analyticsSegments.map((segment) => segment.startTime))
    : 0;
  const totalMs = Math.round(totalSeconds * 1000);

  const rows: Array<{ label: string; value: string }> = [];
  if (totalMs > 0) {
    rows.push({ label: 'Total Time', value: formatTimeMMSS(totalMs) });
  }
  rows.push({ label: 'Segments', value: String(analyticsSegments.length) });

  if (analyticsSegments.length > 0) {
    const maxDepth = Math.max(...analyticsSegments.map((segment) => segment.depth));
    analyticsSegments
      .filter((segment) => segment.depth === maxDepth)
      .slice(0, 4)
      .forEach((segment) => {
        rows.push({
          label: segment.name || 'Segment',
          value: formatTimeMMSS(Math.round(segment.elapsed * 1000)),
        });
      });
  }

  return {
    type: 'rpc-workbench-update',
    mode: 'review',
    reviewData: {
      totalDurationMs: totalMs,
      completedSegments: analyticsSegments.length,
      rows,
    },
  };
}

export function buildCompletedRuntimeProjection(options: {
  readonly totalDurationMs: number;
  readonly segmentCount: number;
}): RpcWorkbenchUpdate {
  return {
    type: 'rpc-workbench-update',
    mode: 'review',
    reviewData: {
      totalDurationMs: options.totalDurationMs,
      completedSegments: options.segmentCount,
      rows: [
        { label: 'Total Time', value: formatTimeMMSS(options.totalDurationMs) },
        { label: 'Segments', value: String(options.segmentCount) },
      ],
    },
  };
}

export function buildPreviewProjection(
  selectedBlock: WodBlock | null,
  documentItems: DocumentItem[],
): RpcWorkbenchUpdate {
  const wodItems = documentItems.filter((item) => item.type === 'wod');

  if (wodItems.length === 0 && !selectedBlock) {
    return { type: 'rpc-workbench-update', mode: 'idle' };
  }

  const titleSource = selectedBlock?.content ?? wodItems[0]?.content ?? '';
  const title = titleSource.split('\n')[0].trim().substring(0, 60) || 'Workout';

  const blocks = wodItems.slice(0, 8).map((item) => ({
    id: item.id,
    title: (item.wodBlock?.content ?? item.content).split('\n')[0].trim().substring(0, 50) || 'Workout',
    statementCount: item.wodBlock?.statements?.length ?? 0,
  }));

  return {
    type: 'rpc-workbench-update',
    mode: 'preview',
    previewData: { title, blocks },
  };
}
