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

export const GitTreeSidebar: React.FC<GitTreeSidebarProps> = ({ segments, selectedIds, onSelect }) => {
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
          stroke={selectedIds.has(seg.id) ? "#818cf8" : "#475569"}
          strokeWidth="2"
          className="transition-colors duration-300"
        />
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 w-80 flex-shrink-0">
      <div className="p-4 border-b border-slate-800 bg-slate-800/30">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          Segment Topology
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
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
                  group relative h-16 flex items-center cursor-pointer transition-all border-b border-slate-800/30
                  ${isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-800/30'}
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
                          ? 'bg-white border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] scale-125' 
                          : 'bg-slate-900 border-slate-500 group-hover:border-slate-300'}
                      `}
                      style={{ left: xOffset }}
                   />
                </div>

                {/* Content Area */}
                <div className="flex-1 pr-4 min-w-0 flex flex-col justify-center gap-0.5">
                  
                  {/* Top Row: Label + Start Time */}
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {seg.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {formatTime(seg.startTime)}
                    </span>
                  </div>

                  {/* Bottom Row: Duration */}
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        seg.type === 'work' ? 'bg-rose-500/10 text-rose-400' : 
                        seg.type === 'rest' ? 'bg-emerald-500/10 text-emerald-400' : 
                        'text-slate-500 bg-slate-800'
                     }`}>
                        {formatDuration(seg.duration)}
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
