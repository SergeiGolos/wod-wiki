// Type definitions for fragment visualization components

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
