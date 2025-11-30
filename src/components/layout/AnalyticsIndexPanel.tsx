/**
 * AnalyticsIndexPanel - Segment selection for Analyze view
 * 
 * Renamed from AnalyticsHistoryPanel to follow the *IndexPanel naming convention.
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - Clickable segments for filtering analytics
 * - Fragment-based card visualization (consistent with EditorIndexPanel and TimerIndexPanel)
 * - Read-only historical data with power/HR metrics
 */

import React from 'react';
import { MetricsTreeView, MetricItem } from '../metrics/MetricsTreeView';
import { cn } from '../../lib/utils';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

import { AnalyticsGroup, Segment } from '../../core/models/AnalyticsModels';

export interface AnalyticsIndexPanelProps {
  /** Historical segments to display */
  segments: Segment[];
  
  /** Available metric groups for display configuration */
  groups?: AnalyticsGroup[];
  
  /** Currently selected segment IDs for filtering */
  selectedSegmentIds?: Set<number>;
  
  /** Callback when segment is clicked */
  onSelectSegment?: (segmentId: number) => void;
  
  /** Whether to render in mobile mode */
  mobile?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}



/**
 * Convert segment to fragment array for visualization
 */
function segmentToFragments(segment: Segment): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  
  // Add type fragment
  fragments.push({
    type: segment.type,
    fragmentType: getFragmentTypeFromSegmentType(segment.type),
    value: segment.type,
    image: segment.type,
  });
  
  // Add duration as timer fragment
  fragments.push({
    type: 'timer',
    fragmentType: FragmentType.Timer,
    value: segment.duration,
    image: formatDuration(segment.duration),
  });
  
  // Add dynamic metrics based on groups or fallback to all available
  // We want to show primary metrics in the fragment view
  
  // If we have specific groups, use the first group's graphs as priority
  // Otherwise just show what we have

  // Priority display from groups
  // TODO: Pass groups to this function or make it a component
  // For now, we'll just iterate all metrics in the segment
  
  Object.entries(segment.metrics).forEach(([key, value]) => {
      if (value > 0) {
        let unit = '';
        let type = FragmentType.Text;
        
        switch(key) {
          case 'power': unit = 'W'; type = FragmentType.Resistance; break;
          case 'resistance': unit = 'kg'; type = FragmentType.Resistance; break;
          case 'distance': unit = 'm'; type = FragmentType.Distance; break;
          case 'repetitions': unit = 'reps'; type = FragmentType.Rep; break;
          case 'heart_rate': unit = 'bpm'; type = FragmentType.Text; break;
          case 'cadence': unit = 'rpm'; type = FragmentType.Text; break;
          case 'speed': unit = 'km/h'; type = FragmentType.Text; break;
        }
        
        fragments.push({
          type: key,
          fragmentType: type,
          value: value,
          image: `${Math.round(value)}${unit}`,
        });
      }
  });
  
  return fragments;
}

/**
 * Map segment type to fragment type
 */
function getFragmentTypeFromSegmentType(type: string): FragmentType {
  const typeMapping: Record<string, FragmentType> = {
    'work': FragmentType.Effort,
    'interval': FragmentType.Rounds,
    'rest': FragmentType.Action,
    'recovery': FragmentType.Action,
    'warmup': FragmentType.Timer,
    'cooldown': FragmentType.Timer,
    'root': FragmentType.Action,
    'ramp': FragmentType.Increment,
  };
  return typeMapping[type.toLowerCase()] || FragmentType.Text;
}

/**
 * Single analytics segment card component - Compact version
 */
/**
 * Single analytics segment card component - Compact version
 */
const renderMetricCard = (item: MetricItem, isSelected: boolean, mobile: boolean) => {
  const isSeparator = item.data?.isSeparator;

  if (isSeparator) {
    return (
      <div className={cn(
        "flex items-center w-full py-1.5 px-2 mt-2 mb-1",
        "border-b border-border/50"
      )}>
        <div className="flex-1 font-semibold text-sm text-foreground/90">
          {item.title}
        </div>
        <div className="flex-shrink-0 font-mono text-xs text-muted-foreground">
          {item.data?.durationText}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded border transition-all flex items-center gap-2 w-full",
      isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border",
      mobile ? "py-1 px-2" : "py-0.5 px-1.5",
      "h-8" // Fixed height for compact row
    )}>

      
      <span className={cn(
        "truncate flex-shrink-0 max-w-[120px] font-medium",
        mobile ? "text-xs" : "text-[11px]"
      )}>
        {item.title}
      </span>
      
      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
        {item.tags}
      </div>
      
      {item.footer && (
        <div className="flex-shrink-0 text-[9px] font-mono text-muted-foreground ml-2">
          {item.footer}
        </div>
      )}
    </div>
  );
};

/**
 * AnalyticsIndexPanel Component
 */
export const AnalyticsIndexPanel: React.FC<AnalyticsIndexPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
  mobile = false,
  groups = [],
  className = ''
}) => {
  // Convert segments to MetricItems
  const items = React.useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    
    return sorted.map(seg => {
      const type = seg.type.toLowerCase();
      const fragments = segmentToFragments(seg);
      
      // Determine if this is a separator/grouping node
      const isSeparator = ['root', 'round', 'interval', 'warmup', 'cooldown'].includes(type);
      
      // Build footer from secondary metrics
      const footerMetrics: React.ReactNode[] = [];
      
      // Use groups to determine what to show in footer if needed, 
      // but for now we'll just show everything that wasn't primary?
      // Actually, let's just show specific ones in footer if they exist
      const secondaryMetrics = ['heart_rate', 'cadence'];
      
      secondaryMetrics.forEach(key => {
        if (seg.metrics[key] > 0) {
          let symbol = '';
          // Try to find config in groups
          let config = null;
          for (const g of groups) {
            config = g.graphs.find(gr => gr.id === key);
            if (config) break;
          }

          if (config) {
             symbol = config.unit;
          } else {
            switch(key) {
              case 'heart_rate': symbol = '♥'; break;
              case 'cadence': symbol = 'rpm'; break;
            }
          }
          footerMetrics.push(<span key={key}>{Math.round(seg.metrics[key])}{symbol}</span>);
        }
      });

      return {
        id: seg.id.toString(),
        parentId: seg.parentId ? seg.parentId.toString() : null,
        lane: seg.depth || 0, // Use depth as lane
        title: seg.name,
        startTime: seg.startTime,
        tags: !isSeparator && (
          <FragmentVisualizer 
            fragments={fragments} 
            className="gap-1"
            compact={true}
          />
        ),
        footer: !isSeparator && footerMetrics.length > 0 && (
          <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
            {footerMetrics}
          </div>
        ),
        data: {
          isSeparator,
          type: type,
          durationText: formatDuration(seg.duration)
        }
      } as MetricItem;
    });
  }, [segments]);

  const handleSelect = React.useCallback((segmentId: number) => {
    onSelectSegment?.(segmentId);
  }, [onSelectSegment]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Always show on mobile */}
      {mobile && (
        <div className="p-4 border-b border-border bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold">Analytics Index</h3>
        </div>
      )}
      
      {/* Segment Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No historical data available
          </div>
        ) : (
          <MetricsTreeView 
            items={items}
            selectedIds={new Set(Array.from(selectedSegmentIds).map(String))}
            onSelect={(id) => handleSelect(parseInt(id))}
            renderItem={(item, isSelected) => renderMetricCard(item, isSelected, mobile)}
          />
        )}
      </div>

      {/* Selection Info */}
      {selectedSegmentIds.size > 0 && (
        <div className="p-2 border-t border-border text-xs text-muted-foreground bg-muted/10 shrink-0">
          {selectedSegmentIds.size} segment{selectedSegmentIds.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default AnalyticsIndexPanel;
