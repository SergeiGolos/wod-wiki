import React, { useState, useMemo } from 'react';
import { WodBlock } from '../../markdown-editor/types';
import { TimelineView } from '../../timeline/TimelineView';
import { WodIndexPanel } from '../../components/layout/WodIndexPanel';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface AnalyticsLayoutProps {
  activeBlock: WodBlock | null;
  documentItems: DocumentItem[];
  onBlockClick: (item: DocumentItem) => void;
  onBack: () => void;
}

// --- Mock Data Generation (Moved from TimelineView) ---
const generateSessionData = () => {
  const data: any[] = [];
  const segments: Segment[] = [];
  const totalDuration = 1200; // 20 min

  // Helper to add noise
  const noise = (amp: number) => (Math.random() - 0.5) * amp;

  // 1. Generate Raw Telemetry Stream
  for (let t = 0; t <= totalDuration; t++) {
    let targetPower = 100;
    
    if (t > 300 && t < 900) { // Main Set
      targetPower = 200;
      if ((t - 300) % 180 < 120) targetPower = 280; // Hard
      else targetPower = 120; // Easy
    } else if (t >= 900) {
      targetPower = 110;
    }

    const power = Math.max(0, targetPower + noise(20));
    const hrLag = (t > 0 ? data[t-1].hr : 60) * 0.95 + (60 + power * 0.5) * 0.05;
    const hr = hrLag + noise(2);
    const cadence = power > 150 ? 90 + noise(5) : 70 + noise(5);

    data.push({
      time: t,
      power: Math.round(power),
      hr: Math.round(hr),
      cadence: Math.round(cadence),
    });
  }

  // 2. Define Hierarchical Segments
  let segIdCounter = 0;
  const addSeg = (name: string, start: number, end: number, type: string, parentId: number | null = null, depth: number = 0) => {
    segIdCounter++;
    const segPoints = data.slice(start, end);
    const avgPwr = Math.round(segPoints.reduce((a,b) => a + b.power, 0) / segPoints.length);
    const avgHr = Math.round(segPoints.reduce((a,b) => a + b.hr, 0) / segPoints.length);
    
    const segment: Segment = {
      id: segIdCounter,
      name,
      type,
      startTime: start,
      endTime: end,
      duration: end - start,
      parentId,
      depth,
      avgPower: avgPwr || 0,
      avgHr: avgHr || 0,
      lane: depth // Map depth to visual lane 
    };
    segments.push(segment);
    return segment.id;
  };

  const rootId = addSeg("Full Session", 0, totalDuration, "root", null, 0);
  const wuId = addSeg("Warmup", 0, 300, "warmup", rootId, 1);
  addSeg("Spin Up", 200, 280, "ramp", wuId, 2); // Nested in warmup

  const mainId = addSeg("Main Set", 300, 900, "work", rootId, 1);
  for (let i = 0; i < 3; i++) {
    const start = 300 + (i * 180);
    addSeg(`Interval ${i+1}`, start, start + 120, "interval", mainId, 2);
    addSeg(`Recovery ${i+1}`, start + 120, start + 180, "rest", mainId, 2);
  }
  addSeg(`Interval 4`, 840, 900, "interval", mainId, 2);

  const cdId = addSeg("Cooldown", 900, totalDuration, "cooldown", rootId, 1);

  return { data, segments };
};

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({ 
  activeBlock, 
  documentItems,
  onBlockClick,
  onBack
}) => {
  // Generate data once
  const { data: rawData, segments } = useMemo(() => generateSessionData(), []);
  
  // Selection state
  const [selectedSegmentIds, setSelectedSegmentIds] = useState(new Set([5, 7, 9, 11])); // Default: Intervals

  const handleSelectSegment = (id: number) => {
    const newSet = new Set(selectedSegmentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSegmentIds(newSet);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel: Index or Git View (1/3) */}
      <div className="w-1/3 border-r border-border flex flex-col bg-background overflow-hidden">
        {activeBlock ? (
          <>
            <div className="p-2 border-b border-border flex items-center">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Index
              </Button>
            </div>
            <GitTreeSidebar 
              segments={segments}
              selectedIds={selectedSegmentIds}
              onSelect={handleSelectSegment}
            />
          </>
        ) : (
          <WodIndexPanel 
            items={documentItems}
            activeBlockId={null}
            onBlockClick={onBlockClick}
            onBlockHover={() => {}}
          />
        )}
      </div>

      {/* Right Panel: Table & Graphs (2/3) */}
      <div className="w-2/3 flex flex-col bg-background overflow-hidden">
        <div className="flex-1 overflow-hidden">
           <TimelineView 
             rawData={rawData}
             segments={segments}
             selectedSegmentIds={selectedSegmentIds}
             onSelectSegment={handleSelectSegment}
           />
        </div>
      </div>
    </div>
  );
};
