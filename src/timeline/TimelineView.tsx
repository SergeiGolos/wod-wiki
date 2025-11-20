import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Brush } from 'recharts';
import { Activity, Zap, Layers, Wind, CheckSquare } from 'lucide-react';
import { Segment } from './GitTreeSidebar';

interface TimelineViewProps {
  rawData: any[];
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  onSelectSegment: (id: number) => void;
}

// --- Helper Components ---

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

// --- Main Application ---
export const TimelineView: React.FC<TimelineViewProps> = ({ 
  rawData, 
  segments, 
  selectedSegmentIds,
  onSelectSegment 
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'overlay'>('timeline');
  const [activeMetric, setActiveMetric] = useState<'power' | 'hr' | 'cadence'>('power');

  // Config
  const METRICS = {
    power: { label: 'Power', unit: 'W', color: '#8b5cf6', icon: Zap },
    hr: { label: 'Heart Rate', unit: 'bpm', color: '#ef4444', icon: Activity },
    cadence: { label: 'Cadence', unit: 'rpm', color: '#3b82f6', icon: Wind },
  };

  // Data Prep for Charts
  const activeColor = METRICS[activeMetric].color;

  const overlayData = useMemo(() => {
    if (viewMode !== 'overlay') return [];
    let maxDuration = 0;
    const activeSegments = segments.filter(s => selectedSegmentIds.has(s.id));
    activeSegments.forEach(s => { if (s.duration > maxDuration) maxDuration = s.duration; });

    const points = [];
    for (let t = 0; t < maxDuration; t++) {
      const point: any = { time: t };
      activeSegments.forEach(seg => {
        if (t < seg.duration) {
          const absTime = seg.startTime + t;
          point[`seg_${seg.id}`] = rawData[absTime] ? rawData[absTime][activeMetric] : null;
        }
      });
      points.push(point);
    }
    return points;
  }, [viewMode, selectedSegmentIds, activeMetric, segments, rawData]);

  // Data Prep for Details Table
  const selectedSegmentsData = segments.filter(s => selectedSegmentIds.has(s.id));

  return (
    <div className="h-full bg-background text-foreground font-sans flex flex-col overflow-hidden">
      
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1.5 rounded">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-bold text-sm tracking-tight">Segment Analysis</h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Metric Toggles */}
           <div className="flex bg-muted rounded-lg p-1 border border-border">
              {Object.entries(METRICS).map(([key, cfg]) => (
                 <button
                    key={key}
                    onClick={() => setActiveMetric(key as any)}
                    className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-2 transition-all ${activeMetric === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                    <cfg.icon className="w-3 h-3" style={{ color: activeMetric === key ? cfg.color : 'currentColor' }} />
                    {cfg.label}
                 </button>
              ))}
           </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background min-w-0 overflow-y-auto">
          
          {/* Chart Section */}
          <div className="p-4 min-h-[450px] flex-shrink-0 border-b border-border">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setViewMode('timeline')}
                    className={`text-xs font-bold px-3 py-1 rounded border ${viewMode === 'timeline' ? 'bg-primary/10 text-primary border-primary/50' : 'border-border text-muted-foreground'}`}
                   >
                      TIMELINE
                   </button>
                   <button 
                    onClick={() => setViewMode('overlay')}
                    className={`text-xs font-bold px-3 py-1 rounded border ${viewMode === 'overlay' ? 'bg-primary/10 text-primary border-primary/50' : 'border-border text-muted-foreground'}`}
                   >
                      OVERLAY
                   </button>
                </div>
                <div className="text-xl font-mono font-bold text-muted-foreground">
                  {METRICS[activeMetric].unit}
                </div>
             </div>

             <div className="h-[350px] w-full bg-muted/30 rounded-xl border border-border p-2">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'timeline' ? (
                    <LineChart data={rawData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                       <XAxis dataKey="time" tickFormatter={formatTime} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
                       <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} domain={['auto', 'auto']}/>
                       <Tooltip 
                          contentStyle={{backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', fontSize: '12px', color: 'hsl(var(--popover-foreground))'}}
                          labelFormatter={t => formatTime(t)}
                       />
                       {segments.filter(s => selectedSegmentIds.has(s.id)).map(s => (
                          <ReferenceArea key={s.id} x1={s.startTime} x2={s.endTime} fill={activeColor} fillOpacity={0.05} />
                       ))}
                       <Line type="monotone" dataKey={activeMetric} stroke={activeColor} strokeWidth={2} dot={false} />
                       <Brush dataKey="time" height={20} stroke="hsl(var(--border))" fill="hsl(var(--muted))" />
                    </LineChart>
                  ) : (
                    <LineChart data={overlayData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                       <XAxis 
                          dataKey="time" 
                          stroke="hsl(var(--muted-foreground))" 
                          tick={{fontSize: 10}} 
                          label={{ value: 'Seconds (T+0)', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                       <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} domain={['auto', 'auto']}/>
                       <Tooltip contentStyle={{backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', fontSize: '12px', color: 'hsl(var(--popover-foreground))'}} />
                       {segments.filter(s => selectedSegmentIds.has(s.id)).map((s, i) => (
                          <Line 
                             key={s.id} 
                             dataKey={`seg_${s.id}`} 
                             name={s.name}
                             type="monotone" 
                             stroke={selectedSegmentIds.has(s.id) ? `hsl(${i * 137.508}, 70%, 60%)` : 'hsl(var(--muted-foreground))'} 
                             strokeWidth={2} 
                             dot={false}
                             connectNulls
                          />
                       ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
             </div>
          </div>

          {/* Details Table Section */}
          <div className="p-4 flex-1 bg-background">
             <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
               <CheckSquare className="w-4 h-4" />
               Selected Segments Analysis
             </h3>
             <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                         <th className="p-3">Segment Name</th>
                         <th className="p-3">Start</th>
                         <th className="p-3">Duration</th>
                         <th className="p-3 text-right">Avg Power</th>
                         <th className="p-3 text-right">Avg HR</th>
                         <th className="p-3 text-right">Intensity</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {selectedSegmentsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                            Select a segment from the tree on the left to view details.
                          </td>
                        </tr>
                      ) : (
                        selectedSegmentsData.map(seg => (
                           <tr key={seg.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium text-foreground flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }}></div>
                                {seg.name}
                              </td>
                              <td className="p-3 text-muted-foreground font-mono">{formatTime(seg.startTime)}</td>
                              <td className="p-3 text-muted-foreground font-mono">{formatDuration(seg.duration)}</td>
                              <td className="p-3 text-right font-mono text-primary">{seg.avgPower}w</td>
                              <td className="p-3 text-right font-mono text-red-500">{seg.avgHr}bpm</td>
                              <td className="p-3 text-right">
                                 <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    seg.type === 'work' ? 'bg-red-500/10 text-red-500' : 
                                    seg.type === 'rest' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                                 }`}>
                                    {seg.type.toUpperCase()}
                                 </span>
                              </td>
                           </tr>
                        ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>
      </div>
    </div>
  );
};
