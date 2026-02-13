import React, { useMemo, useCallback } from 'react';
import { TimerIndexPanel } from '../layout/TimerIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { Segment, AnalyticsGroup } from '../../core/models/AnalyticsModels';
import { AnalyticsDataPoint } from '../../services/AnalyticsTransformer';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';

export interface ReviewPanelProps {
  runtime: IScriptRuntime | null;
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  onSelectSegment: (id: number) => void;
  groups: AnalyticsGroup[];
  rawData: AnalyticsDataPoint[];
}

export const ReviewPanelIndex: React.FC<Pick<ReviewPanelProps, 'runtime' | 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
  runtime,
  selectedSegmentIds,
  onSelectSegment,
}) => {
  const selectedIds = useMemo(
    () => new Set(Array.from(selectedSegmentIds).map(String)),
    [selectedSegmentIds]
  );

  const handleSelectionChange = useCallback((id: string | null) => {
    if (id && id !== 'workout-end') {
      onSelectSegment(parseInt(id, 10));
    }
  }, [onSelectSegment]);

  return (
    <TimerIndexPanel
      runtime={runtime as any}
      selectedIds={selectedIds}
      onSelectionChange={handleSelectionChange}
      autoScroll={false}
      className="h-full"
    />
  );
};

export const ReviewPanelPrimary: React.FC<Pick<ReviewPanelProps, 'rawData' | 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
  rawData,
  segments,
  selectedSegmentIds,
  onSelectSegment,
  groups
}) => (
  <TimelineView
    rawData={rawData}
    segments={segments}
    selectedSegmentIds={selectedSegmentIds}
    onSelectSegment={onSelectSegment}
    groups={groups}
  />
);
