import { BlockKey } from "./BlockKey";
import { ITimeSpan } from "./ITimeSpan";
import { RuntimeMetric } from "./RuntimeMetric";


export class RuntimeSpan {
  blockKey?: string | BlockKey;
  index?: number;
  timeSpans: ITimeSpan[] = [];
  metrics: RuntimeMetric[] = [];
  children: string[] = []; // Added children property
  leaf?: boolean; // marker if span comes from a leaf-level block
}
