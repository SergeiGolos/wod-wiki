import { Observable, Subject } from "rxjs";
import { RuntimeStack } from "./runtime/RuntimeStack";
import { RuntimeTrace } from "./RuntimeTrace";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { RuntimeJit } from "./runtime/RuntimeJit";

export const Diff = {  
  /**
   * Compares two durations and returns the difference in milliseconds
   * @param a The first duration
   * @param b The second duration
   * @returns The difference in milliseconds
   */
  duration(a: IDuration, b: IDuration) : IDuration {
    return new Duration((a.original ?? 0) - (b.original ?? 0));
  }
}

export const Clock = {
  forDuration(duration: IDuration): [string, string] {
    const pad = (n: number) => n.toString().padStart(2, "0");

    const days = duration.days || 0;
    const hours = duration.hours || 0;
    const minutes = duration.minutes || 0;
    const seconds = duration.seconds || 0;
    const milliseconds = duration.milliseconds || 0;

    const clock = [];

    if (days && days > 0) {
      clock.push(`${days}`);
    }

    if ((hours && hours > 0) || clock.length > 0) {
      clock.push(`${pad(hours)}`);
    }

    if (clock.length > 0) {
      clock.push(`${pad(minutes)}`);
    } else {
      clock.push(`${minutes}`);
    }

    clock.push(`${pad(seconds)}`);

    return [clock.join(":"), milliseconds.toString()];
  }
}
export class Duration implements IDuration {
  original?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;

  constructor(original?: number) {    
    const multiplier = 10 ** 3;    
    let remaining = this.original = original ?? 0;

    this.days = Math.floor(remaining / 86400);
    remaining %= 86400;

    this.hours = Math.floor(remaining / 3600);
    remaining %= 3600;

    this.minutes = Math.floor(remaining / 60);
    remaining %= 60;

    this.seconds = Math.floor(remaining);

    this.milliseconds = Math.round((remaining - this.seconds) * multiplier);    
  }
}

export interface IDuration {
  original?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}
 

export interface IRuntimeAction {
  name: string;
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>, 
    output: Subject<ChromecastEvent>
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
  hints: WodWikiTokenHint[];
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

export interface IRuntimeLogger {
  write: (runtimeBlock: IRuntimeBlock) => ResultSpan[];
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
  output$: Observable<ChromecastEvent>;  
}

export interface ITimerRuntime {
  code: string;  
  events: IRuntimeLog[];
  jit: RuntimeJit;
  trace: RuntimeTrace | undefined;
  script: RuntimeStack;  
  current: IRuntimeBlock | undefined;  
  goto(block: StatementNode | undefined): IRuntimeBlock | undefined;
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
  buttons: ActionButton[];
  type: "active" | "complete" | "idle";
  blockId: number;
  nextId?: number;
  
  blockKey: string;  
  
  duration: IDuration;
  elapsed(): IDuration;  
  
  stack?: StatementNode[];
  laps: ResultSpan[];  

  metrics: RuntimeMetric[];  

  onEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];  
}

export interface IRuntimeLog extends IRuntimeEvent {
  blockId: number;
  blockKey: string;  
}

export interface IRuntimeEvent {
  timestamp: Date;
  name: string;
};

export interface RuntimeBlockHandler {
  apply: (event: IRuntimeEvent, runtime: ITimerRuntime) => IRuntimeAction[];
}

export interface ActionButton {
  label?: string;
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & {
      title?: string;
      titleId?: string;
    } & React.RefAttributes<SVGSVGElement>
  >;
  onClick: () => IRuntimeEvent[];
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
