import { IRuntimeEvent } from "./IRuntimeEvent";
import { RuntimeMetric } from "./RuntimeMetric";


export interface ITimeSpan {
  start?: IRuntimeEvent;
  stop?: IRuntimeEvent;
  // Block identifier to associate with metrics
  blockKey?: string;
  // Metrics associated with this time span  
  metrics?: RuntimeMetric[];
}
