/**
 * Legacy metric value format for CollectionSpan.
 * @deprecated Use ICodeFragment instead. Will be replaced in Phase 3.
 */
export type MetricValue = {
  type: string;
  value: number;
  unit: string;
};

/**
 * Legacy metric format stored in CollectionSpan.
 * @deprecated Use ICodeFragment[] instead. Will be replaced in Phase 3.
 */
export interface Metric {
  sourceId: number;
  values: MetricValue[];
}


export type TimeSpan = {
  start?: Date;
  stop?: Date;  
}


export class CollectionSpan {  
  blockKey?: string;
    
  duration?: number | undefined;

  timeSpans: TimeSpan[] = [];  
  metrics: Metric[] = [];  
}
