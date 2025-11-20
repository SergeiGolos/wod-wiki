import React from 'react';
import { GitBranch } from 'lucide-react';

// Types (should be moved to a shared type file eventually)
export interface Segment {
  id: number;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  parentId: number | null;
  depth: number;
  avgPower: number;
  avgHr: number;
  lane: number;
}

interface GitTreeSidebarProps {
  segments: Segment[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
  hideHeader?: boolean;
  disableScroll?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const GitTreeSidebar: React.FC<GitTreeSidebarProps> = ({ 
  segments, 
  selectedIds, 
  onSelect, 
  scrollContainerRef, 
  children,
  hideHeader = false,
  disableScroll = false
}) => {
  // Sort by start time to create the vertical flow
  const sortedSegs = [...segments].sort((a, b) => a.startTime - b.startTime || a.depth - b.depth);
  
  const ROW_HEIGHT = 64; // Height of each list item
  const LANE_WIDTH = 24; // Width between vertical lines
  const LEFT_MARGIN = 10;

  // Generate SVG paths connecting nodes
  const renderConnections = () => {
    return sortedSegs.map((seg, index) => {
      if (!seg.parentId) return null;
      
      const parent = segments.find(s => s.id === seg.parentId);
      if (!parent) return null;

      // Find vertical index of parent
      const parentIndex = sortedSegs.findIndex(s => s.id === parent.id);
      
      // Coordinates
      const startX = LEFT_MARGIN + (parent.lane * LANE_WIDTH) + 5; // +5 centers on dot
      const startY = (parentIndex * ROW_HEIGHT) + 24; // +24 aligns with dot center
      
      const endX = LEFT_MARGIN + (seg.lane * LANE_WIDTH) + 5;
      const endY = (index * ROW_HEIGHT) + 24;

      // Draw L-shape or Curve (Git style)
      // We go down from parent, then curve out to child
      const path = `
        M ${startX} ${startY}
        L ${startX} ${endY - 15}
        C ${startX} ${endY}, ${startX} ${endY}, ${endX} ${endY}
      `;

      return (
        <path
          key={`conn-${seg.id}`}
          d={path}
          fill="none"
          stroke={selectedIds.has(seg.id) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
          strokeWidth="2"
          className="transition-colors duration-300"
        />
      );
    });
  };

  return (
    <div className={`flex flex-col bg-background w-full ${disableScroll ? '' : 'h-full'}`}>
      {!hideHeader && (
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            Segment Topology
          </h2>
        </div>
      )}
      
      <div 
        className={`relative ${disableScroll ? '' : 'flex-1 overflow-y-auto custom-scrollbar'}`} 
        ref={scrollContainerRef}
      >
        {/* SVG Layer for Lines */}
        <svg className="absolute top-0 left-0 w-full pointer-events-none" style={{ height: sortedSegs.length * ROW_HEIGHT }}>
          {renderConnections()}
        </svg>

        {/* List Items */}
        <div className="relative">
          {sortedSegs.map((seg, index) => {
            const isSelected = selectedIds.has(seg.id);
            const xOffset = LEFT_MARGIN + (seg.lane * LANE_WIDTH);

            return (
              <div 
                key={seg.id}
                onClick={() => onSelect(seg.id)}
                className={`
                  group relative h-16 flex items-center cursor-pointer transition-all border-b border-border
                  ${isSelected ? 'bg-muted/80' : 'hover:bg-muted/30'}
                `}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Left: Dot Area */}
                <div className="relative h-full" style={{ width: xOffset + 20 }}>
                   {/* The Dot */}
                   <div 
                      className={`
                        absolute top-6 w-2.5 h-2.5 rounded-full border-2 z-10 transition-all
                        ${isSelected 
                          ? 'bg-background border-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] scale-125' 
                          : 'bg-background border-muted-foreground group-hover:border-foreground'}
                      `}
                      style={{ left: xOffset }}
                   />
                </div>

                {/* Content Area - Visual Block */}
                <div className="flex-1 pr-4 min-w-0 flex flex-col justify-center">
                  <div 
                    className={`
                      relative rounded-md border overflow-hidden transition-all
                      ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/50'}
                    `}
                    style={{
                      height: '48px',
                      background: `linear-gradient(90deg, 
                        hsl(var(--primary) / ${Math.min(seg.avgPower / 400, 1) * 0.3}) 0%, 
                        transparent 100%)`
                    }}
                  >
                    {/* HR Bar Indicator */}
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-red-500/70 transition-all"
                      style={{ width: `${Math.min((seg.avgHr - 60) / 140, 1) * 100}%` }}
                    />

                    <div className="px-3 py-1.5 flex flex-col justify-center h-full">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold truncate">{seg.name}</span>
                        <span className="text-[10px] font-mono opacity-70">{formatTime(seg.startTime)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-0.5">
                        <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
                          <span>{Math.round(seg.avgPower)}W</span>
                          <span>{Math.round(seg.avgHr)}bpm</span>
                        </div>
                        <span className={`text-[10px] px-1 rounded-sm ${
                            seg.type === 'work' ? 'bg-red-500/20 text-red-500' : 
                            seg.type === 'rest' ? 'bg-green-500/20 text-green-500' : 
                            'bg-muted text-muted-foreground'
                        }`}>
                          {formatDuration(seg.duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
};
