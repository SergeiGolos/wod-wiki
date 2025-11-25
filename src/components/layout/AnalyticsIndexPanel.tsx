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
import { Segment } from '../../timeline/GitTreeSidebar';
import { cn } from '../../lib/utils';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { Activity } from 'lucide-react';

export interface AnalyticsIndexPanelProps {
  /** Historical segments to display */
  segments: Segment[];
  
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
 * Get status color class based on segment type
 */
function getTypeColorClass(type: string): string {
  const typeColors: Record<string, string> = {
    'work': 'text-red-500 bg-red-500/10',
    'interval': 'text-orange-500 bg-orange-500/10',
    'rest': 'text-green-500 bg-green-500/10',
    'recovery': 'text-green-500 bg-green-500/10',
    'warmup': 'text-yellow-500 bg-yellow-500/10',
    'cooldown': 'text-blue-500 bg-blue-500/10',
    'root': 'text-primary bg-primary/10',
    'ramp': 'text-purple-500 bg-purple-500/10',
  };
  return typeColors[type.toLowerCase()] || 'text-muted-foreground bg-muted';
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
  
  // Add power fragment if significant
  if (segment.avgPower > 0) {
    fragments.push({
      type: 'resistance',
      fragmentType: FragmentType.Resistance,
      value: segment.avgPower,
      image: `${Math.round(segment.avgPower)}W`,
    });
  }
  
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
const AnalyticsSegmentCard: React.FC<{
  segment: Segment;
  isSelected: boolean;
  mobile: boolean;
  onClick: () => void;
}> = ({ segment, isSelected, mobile, onClick }) => {
  const typeColorClass = getTypeColorClass(segment.type);
  const fragments = segmentToFragments(segment);
  
  const borderClass = isSelected 
    ? 'border-primary bg-primary/5' 
    : 'border-transparent hover:border-border hover:bg-muted/30';
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded border transition-all cursor-pointer flex items-center gap-2',
        borderClass,
        mobile ? 'py-1.5 px-2' : 'py-1 px-1.5',
      )}
      style={{ marginLeft: `${segment.depth * 8}px` }}
    >
      {/* Type Icon */}
      <Activity className={cn('flex-shrink-0', typeColorClass.split(' ')[0], mobile ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      
      {/* Name */}
      <span className={cn(
        'truncate flex-shrink-0 max-w-[100px]',
        mobile ? 'text-xs' : 'text-[11px]',
      )}>
        {segment.name}
      </span>
      
      {/* Fragments - inline */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <FragmentVisualizer 
          fragments={fragments} 
          className="gap-0.5"
        />
      </div>
      
      {/* Compact metrics */}
      <div className="flex-shrink-0 flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
        {segment.avgPower > 0 && <span>{Math.round(segment.avgPower)}W</span>}
        {segment.avgHr > 0 && <span>{Math.round(segment.avgHr)}♥</span>}
      </div>
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
  className = ''
}) => {
  // Sort segments OLDEST-FIRST (chronological order)
  const sortedSegments = React.useMemo(() => {
    return [...segments].sort((a, b) => a.startTime - b.startTime);
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
        {sortedSegments.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No historical data available
          </div>
        ) : (
          <div className={cn('space-y-0.5', mobile ? 'p-2' : 'p-1')}>
            {sortedSegments.map((segment) => (
              <AnalyticsSegmentCard
                key={segment.id}
                segment={segment}
                isSelected={selectedSegmentIds.has(segment.id)}
                mobile={mobile}
                onClick={() => handleSelect(segment.id)}
              />
            ))}
          </div>
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
