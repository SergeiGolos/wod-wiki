import React, { useState, useMemo } from "react";
import { ReviewGrid } from "@/components/review-grid/ReviewGrid";
import { useGridData } from "@/components/review-grid/useGridData";
import { useUserOverrides } from "@/components/review-grid/useUserOverrides";
import { AnalyticsScorecard } from "@/components/review/AnalyticsScorecard";
import { DebugTraceViewer } from "@/components/review/DebugTraceViewer";
import { CollectionWizard } from "@/components/review/CollectionWizard";
import { useCollectionMetrics, type CollectionItem } from "@/hooks/useCollectionMetrics";
import { useDebugMode } from "@/components/layout/DebugModeContext";
import type { Segment } from "@/core/models/AnalyticsModels";
import { FocusedDialog } from "./FocusedDialog";
import { CastButtonRpc } from "@/components/cast/CastButtonRpc";
import { AudioToggle } from "@/components/audio/AudioToggle";
import { MetricType } from "@/core/models/Metric";
import { type ProjectionResult } from "@/core/analytics/ProjectionResult";
import { cn } from "@/lib/utils";

export interface FullscreenReviewProps {
  segments: Segment[];
  onClose: () => void;
  title?: string;
}

export const FullscreenReview: React.FC<FullscreenReviewProps> = ({
  segments,
  onClose,
  title = "Workout Review",
}) => {
  const { isDebugMode } = useDebugMode();
  const { overrides, setOverride } = useUserOverrides(true);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  // ── Grid Data ────────────────────────────────────────────────
  const { rows } = useGridData({
    segments,
    userOutputOverrides: overrides,
    presetId: isDebugMode ? 'debug' : 'default',
    isDebugMode,
    sortConfigs: [],
  });

  // ── Collection Metrics ──────────────────────────────────────
  const { collectionItems } = useCollectionMetrics(segments, overrides);

  // ── Analytics Projections ───────────────────────────────────
  const projections = useMemo(() => extractProjections(segments), [segments]);

  // ── Callbacks ───────────────────────────────────────────────
  const handleSelectSegment = (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (modifiers?.shiftKey && visibleIds) {
        const lastId = Array.from(prev).pop();
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId);
          const endIdx = visibleIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) {
              next.add(visibleIds[i]);
            }
          } else {
            next.add(id);
          }
        } else {
          next.add(id);
        }
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleCollectionSave = (item: CollectionItem, value: any) => {
    setOverride(item.blockKey, item.metricType, value);
  };

  const handleCollectionSkip = (item: CollectionItem) => {
    // For now, skip just moves to next item (handled by wizard internal state)
    console.log("Skipping collection for", item.blockKey);
  };

  return (
    <FocusedDialog 
      title={title} 
      onClose={onClose} 
      variant="minimal" 
      actions={<><CastButtonRpc /><AudioToggle /></>}
      className="p-0 flex flex-col h-full bg-background"
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Panel 4: Collection Banner */}
        {collectionItems.length > 0 && (
          <div className="px-6 py-4 border-b border-border bg-warning/5">
            <CollectionWizard
              items={collectionItems}
              onSave={handleCollectionSave}
              onSkip={handleCollectionSkip}
              mode="post-run"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Panel 2: Analytics Scorecard */}
            {projections.length > 0 && (
              <section>
                <AnalyticsScorecard projections={projections} />
              </section>
            )}

            {/* Panel 1: Workout Log */}
            <section className="flex flex-col min-h-[500px]">
              <h3 className="text-[11px] font-bold tracking-label text-muted-foreground uppercase mb-4">
                📋 Workout Log
              </h3>
              <div className="flex-1 border border-border rounded-2xl overflow-hidden bg-card">
                <ReviewGrid
                  runtime={null}
                  segments={segments}
                  selectedSegmentIds={selectedSegmentIds}
                  onSelectSegment={handleSelectSegment}
                  groups={[]}
                  userOutputOverrides={overrides}
                />
              </div>
            </section>
          </div>
        </div>

        {/* Panel 3: Debug Trace (Sticky at bottom) */}
        {isDebugMode && (
          <DebugTraceViewer rows={rows} className="shrink-0" />
        )}
      </div>
    </FocusedDialog>
  );
};

function extractProjections(segments: Segment[]): ProjectionResult[] {
  return segments
    .filter(s => (s as any).context?.outputType === 'analytics')
    .map(s => {
      // Find the label and the value metrics
      const metrics = s.metrics?.toArray() || [];
      const labelMetric = metrics.find(m => m.type === MetricType.Label);
      const valueMetric = metrics.find(m => m.type !== MetricType.Label);
      
      return {
        name: labelMetric?.value?.toString() || labelMetric?.image || 'Stat',
        value: (valueMetric?.value as number) || 0,
        unit: valueMetric?.unit || '',
        metricType: valueMetric?.type,
        origin: valueMetric?.origin || 'analyzed',
        timeSpan: { started: s.startTime, ended: s.endTime }
      } as ProjectionResult;
    });
}
