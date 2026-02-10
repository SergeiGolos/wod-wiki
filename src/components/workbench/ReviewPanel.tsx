import React from 'react';
import { AnalyticsIndexPanel } from '../layout/AnalyticsIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { Segment, AnalyticsGroup } from '../../core/models/AnalyticsModels';
import { AnalyticsDataPoint } from '../../services/AnalyticsTransformer';

export interface ReviewPanelProps {
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  onSelectSegment: (id: number) => void;
  groups: AnalyticsGroup[];
  rawData: AnalyticsDataPoint[];
}

export const ReviewPanelIndex: React.FC<Pick<ReviewPanelProps, 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
  segments,
  selectedSegmentIds,
  onSelectSegment,
  groups
}) => (
  <AnalyticsIndexPanel
    segments={segments}
    selectedSegmentIds={selectedSegmentIds}
    onSelectSegment={onSelectSegment}
    groups={groups}
  />
);

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
