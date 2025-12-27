import { ICodeFragment } from './CodeFragment';

export type TimeSpan = {
  start?: Date;
  stop?: Date;  
}

/**
 * CollectionSpan stores execution data for a workout segment.
 * Uses ICodeFragment arrays for unified metric representation.
 */
export class CollectionSpan {  
  blockKey?: string;
    
  duration?: number | undefined;

  timeSpans: TimeSpan[] = [];  
  
  /**
   * Fragments collected during execution.
   * Each inner array represents a collection event (e.g., one set of metrics).
   */
  fragments: ICodeFragment[][] = [];  
}
