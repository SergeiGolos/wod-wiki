import React from 'react';
import { AnalyticsIndexPanel } from '../layout/AnalyticsIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { Segment, AnalyticsGroup } from '../../core/models/AnalyticsModels';

export interface AnalyzePanelProps {
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  onSelectSegment: (id: number) => void;
  mobile: boolean;
  groups: AnalyticsGroup[];
  rawData: any[];
}

export const AnalyzePanelIndex: React.FC<Pick<AnalyzePanelProps, 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'mobile' | 'groups'>> = ({
  segments,
  selectedSegmentIds,
  onSelectSegment,
  mobile,
  groups
}) => (
  <AnalyticsIndexPanel
    segments={segments}
    selectedSegmentIds={selectedSegmentIds}
    onSelectSegment={onSelectSegment}
    mobile={mobile}
    groups={groups}
  />
);

export const AnalyzePanelPrimary: React.FC<Pick<AnalyzePanelProps, 'rawData' | 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>> = ({
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
