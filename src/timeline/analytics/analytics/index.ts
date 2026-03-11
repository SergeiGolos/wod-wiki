/**
 * Analytics Module
 *
 * Pipeline B: projection engines aggregate collected IMetric arrays
 * and produce ProjectionResult summaries for the tracker UI.
 */

// Core interfaces
export type { IProjectionEngine } from './IProjectionEngine';
export type { ProjectionResult } from './ProjectionResult';

// Services
export { AnalysisService } from './AnalysisService';

// Built-in projection engines
export { VolumeProjectionEngine } from './engines/VolumeProjectionEngine';
export { RepProjectionEngine } from './engines/RepProjectionEngine';
export { DistanceProjectionEngine } from './engines/DistanceProjectionEngine';
export { SessionLoadProjectionEngine } from './engines/SessionLoadProjectionEngine';
export { MetMinuteProjectionEngine } from './engines/MetMinuteProjectionEngine';
