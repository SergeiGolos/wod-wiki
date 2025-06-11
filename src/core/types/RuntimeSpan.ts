import { ITimeSpan } from "./ITimeSpan";
import { RuntimeMetric } from "./RuntimeMetric";

export class RuntimeSpan {
  blockId?: string;
  blockKey?: string;
  index?: number;
  duration?: number | undefined;
  timeSpans: ITimeSpan[] = [];
  metrics: RuntimeMetric[] = [];  
  leaf?: boolean;  
}
