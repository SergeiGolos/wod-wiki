import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface MetricPoint {
  timestamp: number;
  type: string;
  value: number;
  unit?: string;
  segmentId?: string;
}

export interface SegmentLog {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  metrics: MetricPoint[];
}

interface MetricsContextType {
  segments: SegmentLog[];
  activeSegmentId: string | null;
  startSegment: (id: string, name: string) => void;
  endSegment: (id: string) => void;
  logMetric: (metric: MetricPoint) => void;
  clearMetrics: () => void;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [segments, setSegments] = useState<SegmentLog[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const startSegment = (id: string, name: string) => {
    const newSegment: SegmentLog = {
      id,
      name,
      startTime: Date.now(),
      status: 'running',
      metrics: []
    };
    setSegments(prev => [...prev, newSegment]);
    setActiveSegmentId(id);
  };

  const endSegment = (id: string) => {
    setSegments(prev => prev.map(seg => 
      seg.id === id ? { ...seg, endTime: Date.now(), status: 'completed' } : seg
    ));
    if (activeSegmentId === id) {
      setActiveSegmentId(null);
    }
  };

  const logMetric = (metric: MetricPoint) => {
    if (activeSegmentId) {
      setSegments(prev => prev.map(seg => 
        seg.id === activeSegmentId 
          ? { ...seg, metrics: [...seg.metrics, metric] } 
          : seg
      ));
    }
  };

  const clearMetrics = () => {
    setSegments([]);
    setActiveSegmentId(null);
  };

  return (
    <MetricsContext.Provider value={{ segments, activeSegmentId, startSegment, endSegment, logMetric, clearMetrics }}>
      {children}
    </MetricsContext.Provider>
  );
};

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};
