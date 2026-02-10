/**
 * Analytics Module
 * 
 * This module provides the projection layer for analyzing runtime metrics
 * and producing meaningful insights about workout performance.
 */

// Core interfaces
export type { IProjectionEngine } from './IProjectionEngine';
export type { ProjectionResult } from './ProjectionResult';

// Services
export { AnalysisService } from './AnalysisService';

// Built-in projection engines
export { VolumeProjectionEngine } from './engines/VolumeProjectionEngine';
