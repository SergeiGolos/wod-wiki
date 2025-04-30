import { Observable, Subject } from "rxjs";
import { RuntimeStack } from "./runtime/RuntimeStack";
import { RuntimeJit } from "./runtime/RuntimeJit";
import { EventHandler } from "./runtime/EventHandler";
import { RuntimeTrace } from "./runtime/RuntimeTrace";

export type DurationSign = "+" | "-";

export interface IDuration {
  original?: number;
  sign: "+" | "-";

  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

export class Duration implements IDuration {  
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;

  constructor(public original: number, public sign: DurationSign = "+") {    
    let remaining = this.original = original ?? 0;

    this.days = Math.floor(remaining / 86400000);
    remaining %= 86400000;

    this.hours = Math.floor(remaining / 3600000);
    remaining %= 3600000;

    this.minutes = Math.floor(remaining / 60000);
    remaining %= 60000;

    this.seconds = Math.floor(remaining / 1000);

    this.milliseconds = Math.round((remaining - this.seconds * 1000) );    
  }
}

export interface ITimeSpan { 
  start?: IRuntimeEvent;
  stop?: IRuntimeEvent;
}

export interface ISpanDuration extends IDuration {
  display(): IDuration;
  spans: ITimeSpan[]
  elapsed(): IDuration;
  remaining(): IDuration;
}

export class TimeSpanDuration extends Duration implements ISpanDuration {
  constructor(milliseconds: number, public spans: ITimeSpan[]) {
    super(milliseconds);
    this.spans = spans;
  }

  elapsed(): IDuration {  
    return new Duration(this.spans.reduce((total, span) => {
      const start = span.start?.timestamp ?? new Date();
      const stop = span.stop?.timestamp ?? new Date();
      return total + (stop.getTime() - start.getTime());
    }, 0));
  }

  remaining(): IDuration {
    return new Duration((this.original ?? 0) - (this.elapsed()?.original ?? 0))      
  }   

  display(): IDuration {
    return this.sign === "+" ? this.elapsed() : this.remaining();
  }
}
 
export interface IRuntimeAction {
  name: string;
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>, 
    output: Subject<OutputEvent>
  ): void;
}

export type WodRuntimeScript = {
  source: string;
  statements: StatementNode[];
};

export interface WodWikiInitializer {
  code?: string;
  syntax: string;
}

export interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints?: WodWikiTokenHint[];
}

export interface WodWikiTokenHint {
  hint: string;
  position: "after" | "before";
  offSet?: number | undefined;
}

// Represents an instruction to update a specific metric for a result span
export type RuntimeMetricEdit = {
  blockKey: string;
  index: number;
  metricType: "repetitions" | "resistance" | "distance";
  newValue: MetricValue; // The parsed new value
  createdAt: Date; // Timestamp when the edit was created
};

export type MetricValue = {
  value: number;
  unit: string;
};

export type IRuntimeSync = (runtimeBlock: OutputEvent) => void;  

export type OutputEventType =
  | 'SYSTEM'  
  | 'HEARTBEAT'  
  | 'WRITE_LOG'
  | 'WRITE_RESULT'
  | 'SET_DISPLAY'
  | 'SET_CLOCK'
  | 'SET_TEXT'
  | 'SET_SOUND'
  | 'SET_DEBUG'
  | 'SET_ERROR'
  | 'SET_IDLE';
  

export interface OutputEvent {
  eventType: OutputEventType;
  timestamp: Date;
  bag: { [key: string]: any };
}

export type RuntimeState =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "done"
  | undefined;

export interface ITimerRuntimeIo extends ITimerRuntime {
  input$: Subject<IRuntimeEvent>;
  tick$: Observable<IRuntimeEvent>;
  output$: Observable<OutputEvent>;  
}

export interface ITimerRuntime {
  code: string;
  jit: RuntimeJit;
  trace: RuntimeTrace;
  script: RuntimeStack;
  next(block?: IRuntimeBlock | undefined): IRuntimeBlock | undefined;
  reset(): void;
}

/**
 * Returns all fragments of a specific type from an array of StatementFragments
 * @param fragments Array of StatementFragment objects to filter
 * @param type The type of fragments to retrieve
 * @returns Array of fragments matching the specified type
 */
export function getFragments<T extends StatementFragment>(
  fragments: StatementFragment[],
  type: string
): T[] {
  return fragments.filter((fragment) => fragment.type === type) as T[];
}

export interface StatementFragment {
  type: string;
  meta?: SourceCodeMetadata;  
}

export class StatementKey extends Map<number, number> {
  public key: string;

  constructor(public index: number) {
    super();
    this.key = index.toString();
  }

  push(id: number, index: number) {
    this.key += `|${id}:${index}`;
    this.set(id, index);
  }

  not(other: StatementKey): number[] {
    const keys = Array.from(this.keys());
    const otherKeys = Array.from(other.keys());
    return keys.filter((key) => !otherKeys.includes(key));
  }

  toString() {
    return this.key;
  }
}

export interface StatementNode {
  id: number;
  parent?: number;
  next?: number;
  rounds?: number;
  children: number[];
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
  isLeaf?: boolean; // Explicit flag to mark a node as a leaf even if it has children
}

export interface RuntimeResult {
  round: number;
  stack: number[];
  timestamps: IRuntimeEvent[];
}

export type RuntimeMetric = {
  effort: string;
  repetitions?: MetricValue;
  resistance?: MetricValue;
  distance?: MetricValue;
};

export interface IRuntimeBlock {
  blockId: number;  
  blockKey: string;  
  
  source?: StatementNode | undefined ;
  parent?: IRuntimeBlock | undefined
  // Build once, current block and the parents.

  duration(): IDuration | undefined;          
  load(runtime: ITimerRuntime): IRuntimeEvent[];
  handle(runtime: ITimerRuntime, event: IRuntimeEvent): IRuntimeAction[]
  next(runtime: ITimerRuntime): StatementNode | undefined;
  
  // this shouldbe on the trace
  laps: ResultSpan[];
  
  // Not sure where this should be yet.
  metrics: RuntimeMetric[];    
}

export interface IRuntimeLog extends IRuntimeEvent {
  blockId: number;
  blockKey: string;  
}

export interface IRuntimeEvent {
  timestamp: Date;
  name: string;
};

export interface IActionButton {
  label?: string;
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & {
      title?: string;
      titleId?: string;
    } & React.RefAttributes<SVGSVGElement>
  >;
  event: string;
  isActive?: boolean;
  variant?: "primary" | "secondary" | "success";
}

export interface SourceCodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export class ResultSpan {
  blockKey?: string;
  index?: number;
  stack?: number[];
  start?: IRuntimeEvent;
  stop?: IRuntimeEvent;
  metrics: RuntimeMetric[] = [];
  label?: string;

  duration(timestamp?: Date): number {
    let now = timestamp ?? new Date();
    const stopTime = (this.stop?.timestamp || now).getTime();
    const startTime = this.start?.timestamp.getTime() || 0;
    const calculatedDuration = stopTime - startTime;

    return calculatedDuration;
  }

  edit(edits: RuntimeMetricEdit[]): ResultSpan {
    this.metrics = this.metrics.map((metric) => {
      const selected = edits.filter(
        (e) => e.blockKey === this.blockKey && e.index === this.index
      );
      for (const edit of selected) {
        metric[edit.metricType] = edit.newValue;
      }
      return metric;
    });
    return this;
  }
}

/**
 * Represents individual measurements within a workout block
 */
export type WodMetric = {
  /** Reference to parent block */
  blockId: number;
  /** Position within the block */
  index: number;
  /** Metric type (e.g., "reps", "weight", "time") */
  type: string;
  /** Numeric value of the metric */
  value: number;
};

/**
 * Interface for objects that calculate workout metrics
 */
export interface WodMetricCalculator {
  /** Add a timer event to the calculation */
  push(event: IRuntimeEvent): void;
  /** Get the calculated metrics */
  results: WodMetric[];
}
