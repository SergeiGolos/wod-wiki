import { Observable, Subject } from "rxjs";
import { RuntimeScript } from "./runtime/RuntimeScript";
import { RuntimeJit } from "./runtime/RuntimeJit";
import { RuntimeStack } from "./runtime/RuntimeStack";
import { EventHandler } from "./runtime/EventHandler";
import { BlockContext } from "./runtime/blocks/BlockContext";
import { getAction } from "./runtime/blocks/readers/getAction";
import { getEffort, getRepetitions, getRounds } from "./runtime/blocks/readers/getRounds";
import { getDuration } from "./runtime/blocks/readers/getDuration";
import { getResistance } from "./runtime/blocks/readers/getResistance";
import { getDistance } from "./runtime/blocks/readers/getDistance";
import { ResistanceFragment } from "./fragments/ResistanceFragment";
import { DistanceFragment } from "./fragments/DistanceFragment";
import { RepFragment } from "./fragments/RepFragment";
import { EffortFragment } from "./fragments/EffortFragment";
import { RoundsFragment } from "./fragments/RoundsFragment";

export type DurationSign = "+" | "-" | undefined;

export interface IDuration {
  original?: number;
  sign: DurationSign;

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

  constructor(public original?: number, public sign: DurationSign = "-") {    
    let remaining = original ?? 0;

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
  // Block identifier to associate with metrics
  blockKey?: string;
  // Metrics associated with this time span  
  metrics?: RuntimeMetric[];
}

export interface ISpanDuration extends IDuration {
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
    return new Duration(this.spans?.reduce((total, span) => {
      const start = span.start?.timestamp ?? new Date();
      const stop = span.stop?.timestamp ?? new Date();
      return total + (stop.getTime() - start.getTime());
    }, 0) ?? 0);
  }

  remaining(): IDuration {
    return (this.original ?? 0) !== 0
    ? new Duration((this.original ?? 0) - (this.elapsed()?.original ?? 0))      
    : new Duration((this.elapsed()?.original ?? 0))      
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
  errors: any[];
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
  trace: RuntimeStack;
  history: Array<IRuntimeLog>;
  script: RuntimeScript;
  apply(actions: IRuntimeAction[], lifeCycle: string): void;
  push(block: IRuntimeBlock | undefined): IRuntimeBlock;
  pop(): IRuntimeBlock | undefined;
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
  return fragments?.filter((fragment) => fragment.type === type) as T[] ?? [];
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

export class ZeroIndexMeta implements SourceCodeMetadata {
  line = 0;
  startOffset = 0;
  endOffset = 0;
  columnStart = 0;
  columnEnd = 0;
  length = 0;      
}

export class RootStatementNode implements StatementNode {
  id: number = -1;
  parent?: number;
  children: number[] = [];
  meta: SourceCodeMetadata = new ZeroIndexMeta();
  fragments: StatementFragment[] = [];
}



export class PrecompiledNode implements StatementNode {
  constructor(public node: StatementNode) {
    this.id = node?.id ?? -1;
    this.parent = node?.parent;
    this.children = node?.children ?? [];
    this.meta = node?.meta ?? new ZeroIndexMeta();
    this.fragments = node?.fragments ?? [];
  }
  
  public addFragment(fragment: StatementFragment): PrecompiledNode {
    if (!!fragment) {
      this.fragments.push(fragment);
    }
    return this;
  }

  public id: number;
  public parent?: number;
  public children: number[] = [];
  public meta: SourceCodeMetadata = new ZeroIndexMeta();
  public fragments: StatementFragment[] = [];
  
  public actions(): IActionButton[] {
    return getAction(this).map(f => ({
      event: f.type,
      label: f.action,      
      isActive: false,
      variant: "primary"
    }));
  }

  public duration(): Duration {
    const durations = getDuration(this);
    if (durations.length == 0) {
      return new Duration(undefined);
    }
    if (durations.length == 1) {
      return durations[0];
    }

    return durations.reduce((a, b) => new Duration(a.original ?? 0 + (b.original ?? 0), b.sign));
  }

  public repetitions(): RepFragment[] {
    return getRepetitions(this);    
  }

  public resistance(): ResistanceFragment[] {
    return getResistance(this);    
  }

  public distance(): DistanceFragment[] {
    return getDistance(this);
  }

  public effort(): EffortFragment[] {
    return getEffort(this);    
  }

  public rounds(): RoundsFragment[] {
    return getRounds(this);
  }

}
export class IdleStatementNode extends PrecompiledNode { 
  id: number = -1;  
  children: number[] = [];
  meta: SourceCodeMetadata = new ZeroIndexMeta();
  fragments: StatementFragment[] = [];
}
export interface StatementNode {
  id: number;
  parent?: number;
  children: number[];
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
  isLeaf?: boolean;
}

export interface RuntimeMetric {
  sourceId: string;
  effort: string;
  values: MetricValue[];
};

export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp";
  value: number;
  unit: string;
};

export interface IRuntimeBlock {
  blockKey?: string | undefined;
  blockId: string;
  parent?: IRuntimeBlock | undefined;
  
  // Use getter methods instead of direct properties for encapsulation
  getSources(): PrecompiledNode[];
  getIndex(): number;
  getSpans(): ITimeSpan[];
  getResultSpans(): ResultSpan[];
  getContext(): BlockContext;
  
  // Core methods
  get<T>(fn: (node: PrecompiledNode) => T[]): T[];
  
  /**
   * Calculates metrics for this block, potentially inheriting from parent blocks
   * @param includeChildren Whether to include metrics from child blocks (default: true)
   * @param inheritFromParent Whether to inherit missing metrics from parent blocks (default: true)
   * @returns An array of RuntimeMetric objects representing the metrics for this block
   */
  metrics(includeChildren?: boolean, inheritFromParent?: boolean): RuntimeMetric[];
  
  enter(runtime: ITimerRuntime): IRuntimeAction[];
  next(runtime: ITimerRuntime): IRuntimeAction[];
  handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[];
  leave(runtime: ITimerRuntime): IRuntimeAction[];
}

export interface IRuntimeLog extends IRuntimeEvent {
  blockId: string;
  blockKey: string;  
}

export interface IRuntimeEvent {
  timestamp: Date;
  name: string;
  blockKey?: string;
};

export interface IActionButton {
  label?: string;
  icon?: React.ForwardRefExoticComponent<
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
  start?: IRuntimeEvent;
  stop?: IRuntimeEvent;
  timeSpans: ITimeSpan[] = [];
  metrics: RuntimeMetric[] = [];
  label?: string;
  
  /** References to child block keys for hierarchical relationships */
  children: string[] = [];

  /**
   * Create a ResultSpan from a RuntimeBlock
   * Uses the IMetricsProvider interface if available, otherwise falls back to metrics() method
   * @param block The block to create a ResultSpan from
   * @returns A new ResultSpan representing the block's state
   */
  static fromBlock(block: IRuntimeBlock): ResultSpan {
    const result = new ResultSpan();
    const span = block.getSpans() ?? [];
    
    if (span.length === 0) {
      span.push({start: undefined, stop: undefined});
    }
    
    // Basic properties
    result.blockKey = block.blockKey;
    result.index = block.getIndex();      
    result.start = span[0].start;
    result.stop = span[span.length - 1].stop;
    result.timeSpans = span;
    result.label = "";
    
    // Get metrics using IMetricsProvider interface if available
    // Check if the block implements IMetricsProvider by detecting the getMetrics method
    if (typeof (block as any).getMetrics === 'function') {
      result.metrics = (block as any).getMetrics(true, true);
    } else if (typeof block.metrics === 'function') {
      // Fallback to the old metrics method for backward compatibility
      result.metrics = block.metrics(true, true);
    } else {
      result.metrics = [];
    }
    
    return result;
  }

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
      
      // Apply edits to the appropriate metric value
      for (const edit of selected) {
        // Find the value with the matching type or add a new one
        const valueIndex = metric.values.findIndex(v => v.type === edit.metricType);
        
        if (valueIndex >= 0) {
          // Update existing value with the new MetricValue's properties
          metric.values[valueIndex] = edit.newValue;
        } else {
          // Add the new MetricValue directly
          metric.values.push(edit.newValue);
        }
      }
      return metric;
    });
    return this;
  }
}