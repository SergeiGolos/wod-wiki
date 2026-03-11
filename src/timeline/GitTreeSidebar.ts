/**
 * GitTreeSidebar - Type definitions
 * 
 * Segment types used in analytics history.
 */

import type { IMetric } from '../core/models/Metric';

export interface Segment {
  id: number;
  name: string;
  label?: string;
  type: string;
  parentId: number | null;
  startTime: number;
  endTime: number;
  duration: number;
  metrics?: IMetric[];
  metadata?: Record<string, unknown>;
  /** Average power output for this segment (Watts) */
  avgPower?: number;
  /** Average heart rate for this segment (bpm) */
  avgHr?: number;
}
