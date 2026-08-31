import React, { useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TimerIndexPanel } from '../../organisms/layout/TimerIndexPanel';
import { TimelineView } from '../../../timeline/TimelineView';
import { Segment, AnalyticsGroup } from '@bitcobblers/wod-wiki-engine';
import type { ScriptRuntime } from '@/hooks/useRuntimeTimer';

export interface ReviewPanelProps {
  runtime: ScriptRuntime | null;
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  onSelectSegment: (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => void;
  groups: AnalyticsGroup[];
}

export const ReviewPanelIndex: React.FC<Pick<ReviewPanelProps, 'runtime' | 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
  runtime,
  segments,
  selectedSegmentIds,
  onSelectSegment,
}) => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const selectedIds = useMemo(
    () => new Set(Array.from(selectedSegmentIds).map(String)),
    [selectedSegmentIds]
  );

  const handleSelectionChange = useCallback((id: string | null, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => {
    if (id && id !== 'workout-end') {
      onSelectSegment(parseInt(id, 10), modifiers, segments.map(s => s.id));
    }
  }, [onSelectSegment, segments]);

  const handleDoubleClick = useCallback(() => {
    if (routeId) {
      navigate(`/note/${routeId}/plan`);
    }
  }, [navigate, routeId]);

  return (
    <TimerIndexPanel
      runtime={runtime}
      selectedIds={selectedIds}
      onSelectionChange={handleSelectionChange}
      onDoubleClick={handleDoubleClick}
      autoScroll={false}
      className="h-full"
    />
  );
};

export const ReviewPanelPrimary: React.FC<Pick<ReviewPanelProps, 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
  segments,
  selectedSegmentIds,
  onSelectSegment,
  groups
}) => (
  <TimelineView
    rawData={[]}
    segments={segments}
    selectedSegmentIds={selectedSegmentIds}
    onSelectSegment={onSelectSegment}
    groups={groups}
  />
);
