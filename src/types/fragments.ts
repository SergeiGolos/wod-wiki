/**
 * Fragment types for WOD Wiki
 * 
 * Type definitions for fragment visualization and manipulation
 * including fragment color maps, visualizer props, and metadata.
 */

import { CodeMetadata, ICodeFragment } from './core';

/**
 * Fragment type for color mapping
 */
export type FragmentTypeString = 
  | 'timer' 
  | 'rep' 
  | 'effort' 
  | 'distance' 
  | 'rounds' 
  | 'action' 
  | 'increment' 
  | 'lap' 
  | 'text' 
  | 'resistance';

/**
 * Color map for fragment types
 */
export type FragmentColorMap = {
  readonly [key in FragmentTypeString]: string;
};

/**
 * Parse error for fragment visualization
 */
export interface ParseError {
  /** Human-readable error message */
  message: string;
  
  /** Optional line number where error occurred */
  line?: number;
  
  /** Optional column position where error occurred */
  column?: number;
  
  /** Optional code excerpt showing error context */
  excerpt?: string;
}

/**
 * Props for the FragmentVisualizer component
 */
export interface FragmentVisualizerProps {
  /** Array of fragments to visualize, grouped by type */
  fragments: ICodeFragment[];
  
  /** Optional error state to display instead of fragments */
  error?: ParseError | null;
  
  /** Optional className for container styling */
  className?: string;
}

/**
 * Re-export CodeMetadata for convenience
 */
export type { CodeMetadata } from './core';

/**
 * Re-export ICodeFragment for convenience
 */
export type { ICodeFragment } from './core';
