export type MetricValue = {
  type: string;
  value: number;
  unit: string;
};

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
