import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Brush } from 'recharts';
import { Activity, Zap, Layers, BarChart2, Wind, CheckSquare, ChevronRight, Clock, GitCommit, GitBranch, GitMerge, MousePointer2 } from 'lucide-react';
import { GitTreeSidebar, Segment } from './GitTreeSidebar';

// --- Mock Data Generation (Hierarchical) ---
const generateSessionData = () => {
  const data = [];
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

const { data: RAW_DATA, segments: SEGMENTS } = generateSessionData();

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
export const TimelineView = () => {
  const [viewMode, setViewMode] = useState<'timeline' | 'overlay'>('timeline');
  const [activeMetric, setActiveMetric] = useState<'power' | 'hr' | 'cadence'>('power');
  const [selectedSegmentIds, setSelectedSegmentIds] = useState(new Set([5, 7, 9, 11])); // Default: Intervals

  // Config
  const METRICS = {
    power: { label: 'Power', unit: 'W', color: '#8b5cf6', icon: Zap },
    hr: { label: 'Heart Rate', unit: 'bpm', color: '#ef4444', icon: Activity },
    cadence: { label: 'Cadence', unit: 'rpm', color: '#3b82f6', icon: Wind },
  };

  // Handlers
  const handleSelect = (id: number) => {
    // Multi-select with Shift/Ctrl logic could go here, simplified to single select toggle for demo
    // or keep existing set logic
    const newSet = new Set(selectedSegmentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSegmentIds(newSet);
  };

  // Data Prep for Charts
  const activeColor = METRICS[activeMetric].color;

  const overlayData = useMemo(() => {
    if (viewMode !== 'overlay') return [];
    let maxDuration = 0;
    const activeSegments = SEGMENTS.filter(s => selectedSegmentIds.has(s.id));
    activeSegments.forEach(s => { if (s.duration > maxDuration) maxDuration = s.duration; });

    const points = [];
    for (let t = 0; t < maxDuration; t++) {
      const point: any = { time: t };
      activeSegments.forEach(seg => {
        if (t < seg.duration) {
          const absTime = seg.startTime + t;
          point[`seg_${seg.id}`] = RAW_DATA[absTime] ? RAW_DATA[absTime][activeMetric] : null;
        }
      });
      points.push(point);
    }
    return points;
  }, [viewMode, selectedSegmentIds, activeMetric]);

  // Data Prep for Details Table
  const selectedSegmentsData = SEGMENTS.filter(s => selectedSegmentIds.has(s.id));

  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-sm tracking-tight">SegmentAlyzer <span className="text-slate-500 font-normal">// GitView</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Metric Toggles */}
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              {Object.entries(METRICS).map(([key, cfg]) => (
                 <button
                    key={key}
                    onClick={() => setActiveMetric(key as any)}
                    className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-2 transition-all ${activeMetric === key ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <cfg.icon className="w-3 h-3" style={{ color: activeMetric === key ? cfg.color : 'currentColor' }} />
                    {cfg.label}
                 </button>
              ))}
           </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Git Tree */}
        <GitTreeSidebar 
          segments={SEGMENTS} 
          selectedIds={selectedSegmentIds} 
          onSelect={handleSelect} 
        />

        {/* RIGHT PANEL: Charts & Data */}
        <div className="flex-1 flex flex-col bg-slate-950 min-w-0 overflow-y-auto">
          
          {/* Chart Section */}
          <div className="p-4 min-h-[450px] flex-shrink-0 border-b border-slate-800">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setViewMode('timeline')}
                    className={`text-xs font-bold px-3 py-1 rounded border ${viewMode === 'timeline' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'border-slate-700 text-slate-500'}`}
                   >
                      TIMELINE
                   </button>
                   <button 
                    onClick={() => setViewMode('overlay')}
                    className={`text-xs font-bold px-3 py-1 rounded border ${viewMode === 'overlay' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'border-slate-700 text-slate-500'}`}
                   >
                      OVERLAY
                   </button>
                </div>
                <div className="text-xl font-mono font-bold text-slate-400">
                  {METRICS[activeMetric].unit}
                </div>
             </div>

             <div className="h-[350px] w-full bg-slate-900/50 rounded-xl border border-slate-800 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'timeline' ? (
                    <LineChart data={RAW_DATA}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                       <XAxis dataKey="time" tickFormatter={formatTime} stroke="#475569" tick={{fontSize: 10}} />
                       <YAxis stroke="#475569" tick={{fontSize: 10}} domain={['auto', 'auto']}/>
                       <Tooltip 
                          contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}}
                          labelFormatter={t => formatTime(t)}
                       />
                       {SEGMENTS.filter(s => selectedSegmentIds.has(s.id)).map(s => (
                          <ReferenceArea key={s.id} x1={s.startTime} x2={s.endTime} fill={activeColor} fillOpacity={0.05} />
                       ))}
                       <Line type="monotone" dataKey={activeMetric} stroke={activeColor} strokeWidth={2} dot={false} />
                       <Brush dataKey="time" height={20} stroke="#334155" fill="#0f172a" />
                    </LineChart>
                  ) : (
                    <LineChart data={overlayData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                       <XAxis 
                          dataKey="time" 
                          stroke="#475569" 
                          tick={{fontSize: 10}} 
                          label={{ value: 'Seconds (T+0)', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10 }}
                        />
                       <YAxis stroke="#475569" tick={{fontSize: 10}} domain={['auto', 'auto']}/>
                       <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}} />
                       {SEGMENTS.filter(s => selectedSegmentIds.has(s.id)).map((s, i) => (
                          <Line 
                             key={s.id} 
                             dataKey={`seg_${s.id}`} 
                             name={s.name}
                             type="monotone" 
                             stroke={selectedSegmentIds.has(s.id) ? `hsl(${i * 137.508}, 70%, 60%)` : '#334155'} 
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
          <div className="p-4 flex-1 bg-slate-950">
             <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
               <CheckSquare className="w-4 h-4" />
               Selected Segments Analysis
             </h3>
             <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-800 text-slate-400 text-xs uppercase font-semibold">
                      <tr>
                         <th className="p-3">Segment Name</th>
                         <th className="p-3">Start</th>
                         <th className="p-3">Duration</th>
                         <th className="p-3 text-right">Avg Power</th>
                         <th className="p-3 text-right">Avg HR</th>
                         <th className="p-3 text-right">Intensity</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                      {selectedSegmentsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                            Select a segment from the tree on the left to view details.
                          </td>
                        </tr>
                      ) : (
                        selectedSegmentsData.map(seg => (
                           <tr key={seg.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-3 font-medium text-slate-200 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }}></div>
                                {seg.name}
                              </td>
                              <td className="p-3 text-slate-400 font-mono">{formatTime(seg.startTime)}</td>
                              <td className="p-3 text-slate-400 font-mono">{formatDuration(seg.duration)}</td>
                              <td className="p-3 text-right font-mono text-indigo-300">{seg.avgPower}w</td>
                              <td className="p-3 text-right font-mono text-rose-300">{seg.avgHr}bpm</td>
                              <td className="p-3 text-right">
                                 <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    seg.type === 'work' ? 'bg-rose-900 text-rose-200' : 
                                    seg.type === 'rest' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-400'
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
    </div>
  );
};
