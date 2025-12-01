/**
 * RuntimeHistoryPanel - Live execution history for Track screen
 * 
 * Key Features:
 * - Shows captured execution spans from runtime memory
 * - Section headers for looper blocks (rounds, EMOM minutes, intervals)
 * - Timestamp and visual breaks between sections
 * - Exercise efforts grouped under their parent section
 * - Newest-first, oldest-last ordering within sections
 * - Always shows active blocks highlighted
 * - Displays metrics as fragments (effort name, reps, etc.)
 * - Supports unified ExecutionSpan with segments
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { ExecutionSpan } from '../../runtime/models/ExecutionSpan';
import { useExecutionSpans } from '../../clock/hooks/useExecutionSpans';
import { cn } from '../../lib/utils';
import { Clock, Play, Activity, Pause, RotateCw, Timer } from 'lucide-react';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { spanMetricsToFragments } from '../../runtime/utils/metricsToFragments';

export interface RuntimeHistoryPanelProps {
  /** Active runtime for live tracking */
  runtime: IScriptRuntime | null;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

// --- Section Types for Visual Grouping ---

interface HistorySection {
  id: string;
  type: 'section-header' | 'effort';
  span: ExecutionSpan;
  label: string;
  timestamp: number;
  isActive: boolean;
  fragments: ICodeFragment[];
  duration?: number;
  children: HistorySection[];
}

// --- Helper Functions ---

/**
 * Section header types - these create visual breaks with timestamps
 */
const SECTION_HEADER_TYPES = new Set<string>([
  'rounds', 'round', 'interval', 'amrap', 'emom', 'tabata', 'warmup', 'cooldown', 'group'
]);

function isSectionHeader(span: ExecutionSpan): boolean {
  return SECTION_HEADER_TYPES.has(span.type.toLowerCase());
}

/**
 * Get icon for span type
 */
function getIconForSpanType(type: string, isActive: boolean): React.ReactNode {
  if (isActive) {
    return <Play className="h-3 w-3 text-primary animate-pulse" />;
  }
  
  switch (type.toLowerCase()) {
    case 'timer':
    case 'amrap':
    case 'emom':
    case 'tabata':
      return <Timer className="h-3 w-3 text-blue-500" />;
    case 'rounds':
    case 'round':
      return <RotateCw className="h-3 w-3 text-purple-500" />;
    case 'effort':
      return <Activity className="h-3 w-3 text-red-500" />;
    case 'rest':
    case 'interval':
      return <Pause className="h-3 w-3 text-green-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-500" />;
  }
}

/**
 * Format timestamp for section headers
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format duration in seconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * RuntimeHistoryPanel Component
 */
export const RuntimeHistoryPanel: React.FC<RuntimeHistoryPanelProps> = ({
  runtime,
  autoScroll = true,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use reactive hook for execution spans
  const { active, completed, byId } = useExecutionSpans(runtime);

  // Build hierarchical sections from execution spans
  const sections = useMemo(() => {
    if (!runtime) return [];

    // Combine all spans and sort by start time (oldest first for processing)
    const allSpans = [...completed, ...active].sort((a, b) => a.startTime - b.startTime);
    
    if (allSpans.length === 0) return [];

    // Build flat list of sections/efforts grouped by headers
    const result: HistorySection[] = [];
    const spanToSection = new Map<string, HistorySection>();
    
    for (const span of allSpans) {
      const isHeader = isSectionHeader(span);
      const isActive = span.status === 'active';
      const duration = span.endTime 
        ? span.endTime - span.startTime 
        : Date.now() - span.startTime;
      
      // Convert metrics to fragments
      const fragments = spanMetricsToFragments(span.metrics, span.label, span.type);
      
      const section: HistorySection = {
        id: span.id,
        type: isHeader ? 'section-header' : 'effort',
        span,
        label: span.label,
        timestamp: span.startTime,
        isActive,
        fragments,
        duration,
        children: []
      };
      
      spanToSection.set(span.id, section);
      
      if (isHeader) {
        // Section headers go at the top level
        result.push(section);
      } else {
        // Efforts nest under their parent section
        if (span.parentSpanId) {
          const parent = spanToSection.get(span.parentSpanId);
          if (parent && parent.type === 'section-header') {
            parent.children.push(section);
            continue;
          }
          
          // Try to find nearest section header ancestor
          let ancestorId: string | null = span.parentSpanId;
          let foundSection = false;
          while (ancestorId) {
            const ancestor = byId.get(ancestorId);
            if (ancestor && isSectionHeader(ancestor)) {
              const ancestorSection = spanToSection.get(ancestor.id);
              if (ancestorSection) {
                ancestorSection.children.push(section);
                foundSection = true;
                break;
              }
            }
            ancestorId = ancestor?.parentSpanId ?? null;
          }
          
          if (!foundSection) {
            // No section header found - add as top-level effort
            result.push(section);
          }
        } else {
          // No parent - top level effort
          result.push(section);
        }
      }
    }
    
    // Sort result: sections/efforts by timestamp (newest first for display)
    result.sort((a, b) => b.timestamp - a.timestamp);
    
    // Sort children within each section (oldest first within section)
    for (const section of result) {
      section.children.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    return result;
  }, [runtime, active, completed, byId]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sections.length, autoScroll]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2" ref={scrollRef}>
        {sections.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            Waiting for workout to start...
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => (
              <div key={section.id} className="relative">
                {/* Section Header */}
                {section.type === 'section-header' ? (
                  <>
                    {/* Timestamp and Section Title */}
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                      <span className="text-xs font-mono opacity-70">
                        {formatTimestamp(section.timestamp)}
                      </span>
                      <div className="h-px bg-border flex-1" />
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider",
                        section.isActive && "text-primary"
                      )}>
                        {getIconForSpanType(section.span.type, section.isActive)}
                        <span>{section.label}</span>
                      </div>
                    </div>
                    
                    {/* Section Children (efforts) */}
                    <div className="space-y-1 ml-4 border-l-2 border-border/50 pl-3">
                      {section.children.length > 0 ? (
                        section.children.map(child => (
                          <EffortRow key={child.id} section={child} />
                        ))
                      ) : (
                        section.isActive && (
                          <div className="text-xs text-muted-foreground italic py-1">
                            In progress...
                          </div>
                        )
                      )}
                    </div>
                    
                    {/* Section Duration Footer */}
                    {!section.isActive && section.duration && (
                      <div className="ml-4 mt-1 text-xs text-muted-foreground font-mono">
                        Total: {formatDuration(section.duration)}
                      </div>
                    )}
                  </>
                ) : (
                  /* Top-level effort (no parent section) */
                  <EffortRow section={section} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Single effort row component
 */
const EffortRow: React.FC<{ section: HistorySection }> = ({ section }) => {
  const duration = section.duration ?? (Date.now() - section.timestamp);
  
  return (
    <div className={cn(
      "flex items-center justify-between py-1 px-2 rounded text-sm transition-colors",
      section.isActive 
        ? "bg-primary/5 text-foreground" 
        : "text-muted-foreground hover:bg-muted/30"
    )}>
      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        {getIconForSpanType(section.span.type, section.isActive)}
        <div className="flex-1 min-w-0">
          <FragmentVisualizer 
            fragments={section.fragments} 
            className="gap-1" 
            compact 
          />
        </div>
      </div>
      <div className="text-xs font-mono opacity-70 shrink-0 ml-2">
        {formatDuration(duration)}
      </div>
    </div>
  );
};
