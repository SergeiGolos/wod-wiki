import { IRuntimeEvent, ITimerRuntime, ITimeSpan, ResultSpan, RuntimeMetric, PrecompiledNode } from "@/core/timer.types";
import { IMetricMergeStrategy, ConcatMetricsStrategy } from "@/core/metrics/MetricMergeStrategy";

export interface BlockContextOptions {
  sources: PrecompiledNode[];
  blockKey?: string;
  metricMergeStrategy?: IMetricMergeStrategy;
  initialResultSpans?: ResultSpan[];
  initialEvents?: IRuntimeEvent[];
  initialIndex?: number;
  initialRuntime?: ITimerRuntime;
  initialActiveTimeSpan?: ITimeSpan;
  initialCurrentResultSpan?: ResultSpan;
  initialChildIndex?: number;
  initialLastLap?: string;
  initialDuration?: number;
}

/**
 * Manages the runtime context for a block, including its state, spans, and metrics.
 */
export class BlockContext {
  public runtime: ITimerRuntime;
  public index: number;
  public blockKey?: string;
  public events: IRuntimeEvent[];
  public resultSpans: ResultSpan[]; // Stores all historical ResultSpans for this block instance
  public childIndex: number;
  public lastLap: string;
  public duration?: number;

  private blockId: string; 
  private metricMergeStrategy: IMetricMergeStrategy;
  private _activeTimeSpan?: ITimeSpan;
  private _currentResultSpan?: ResultSpan; // The currently active ResultSpan being built

  constructor(options: BlockContextOptions) {
    this.blockId = options.sources && options.sources.length > 0 
                   ? options.sources.map(s => s.id).join(":") 
                   : Math.random().toString(36).substring(2, 15); // Fallback for safety

    this.runtime = options.initialRuntime || {} as ITimerRuntime;
    this.index = options.initialIndex || 0;
    this.blockKey = options.blockKey;
    this.events = options.initialEvents || [];
    this.resultSpans = options.initialResultSpans || [];
    this.metricMergeStrategy = options.metricMergeStrategy || new ConcatMetricsStrategy();
    this._activeTimeSpan = options.initialActiveTimeSpan;
    this._currentResultSpan = options.initialCurrentResultSpan;
    this.childIndex = options.initialChildIndex || 0;
    this.lastLap = options.initialLastLap || "";
    this.duration = options.initialDuration;
  }

  public getBlockId(): string {
    return this.blockId;
  }

  public initializeCurrentResultSpan(startEvent: IRuntimeEvent, label?: string): ResultSpan {
    if (this._currentResultSpan && !this._currentResultSpan.stop) {
      console.warn(`BlockContext (${this.blockKey}/${this.blockId}): Initializing new ResultSpan while previous was still active. Archiving previous.`);
      this._currentResultSpan.stop = {
        name: "implicit_stop_on_reinitialize",
        timestamp: new Date(startEvent.timestamp.getTime() -1),
        blockKey: this.blockKey
      };
      this.resultSpans.push(this._currentResultSpan);
    }

    this._currentResultSpan = new ResultSpan();
    this._currentResultSpan.blockKey = this.blockKey;
    this._currentResultSpan.index = this.index;
    this._currentResultSpan.start = startEvent;
    this._currentResultSpan.label = label || this.blockKey;
    return this._currentResultSpan;
  }

  public getCurrentResultSpan(): ResultSpan | undefined {
    return this._currentResultSpan;
  }

  public startActiveTimeSpan(startEvent: IRuntimeEvent): ITimeSpan {
    if (!this._currentResultSpan) {
      this.initializeCurrentResultSpan({
        name: "implicit_result_span_start_for_active_time_span",
        timestamp: new Date(startEvent.timestamp.getTime() -1),
        blockKey: this.blockKey
      }, `Implicit ${this.blockKey}`);
    }

    if (this._activeTimeSpan && !this._activeTimeSpan.stop) {
      this.stopActiveTimeSpan({
        name: "implicit_stop_on_new_active_span",
        timestamp: new Date(startEvent.timestamp.getTime() -1),
        blockKey: this.blockKey
      });
    }

    this._activeTimeSpan = {
      start: startEvent,
      blockKey: this.blockKey,
      metrics: []
    };

    if (this._currentResultSpan) {
      this._currentResultSpan.timeSpans.push(this._activeTimeSpan);
    } else {
      console.error(`BlockContext (${this.blockKey}/${this.blockId}): _currentResultSpan is unexpectedly undefined after initialization attempt.`);
    }
    
    return this._activeTimeSpan;
  }

  public stopActiveTimeSpan(stopEvent: IRuntimeEvent): ITimeSpan | undefined {
    if (this._activeTimeSpan && !this._activeTimeSpan.stop) {
      this._activeTimeSpan.stop = stopEvent;
      const stoppedSpan = this._activeTimeSpan;
      return stoppedSpan;
    }
    // If trying to stop a span that doesn't exist or is already stopped, create a new one and close it immediately.
    // This handles cases where a stop might be called without a preceding start, ensuring a span is recorded.
    console.warn(`BlockContext (${this.blockKey}/${this.blockId}): stopActiveTimeSpan called without an active, open span. Creating and closing a new span.`);
    const newClosedSpan: ITimeSpan = {
        start: { ...stopEvent, name: 'implicit-start-for-immediate-close', timestamp: new Date(stopEvent.timestamp.getTime() -1) }, 
        stop: stopEvent,
        blockKey: this.blockKey,
        metrics: []
      };
    if (this._currentResultSpan) {
        if (!this._currentResultSpan.timeSpans) this._currentResultSpan.timeSpans = [];
        this._currentResultSpan.timeSpans.push(newClosedSpan);
    }
    return newClosedSpan; 
  }

  public finalizeCurrentResultSpan(stopEvent: IRuntimeEvent): ResultSpan | undefined {
    if (this._currentResultSpan) {
      if (this._activeTimeSpan && !this._activeTimeSpan.stop) {
        this.stopActiveTimeSpan({
          name: "implicit_stop_on_result_finalize",
          timestamp: stopEvent.timestamp,
          blockKey: this.blockKey
        });
      }
      
      this._currentResultSpan.stop = stopEvent;
      this.resultSpans.push(this._currentResultSpan);
      const finalizedSpan = this._currentResultSpan;
      this._currentResultSpan = undefined;
      this._activeTimeSpan = undefined;
      return finalizedSpan;
    }
    return undefined;
  }

  public addSupplementaryTimeSpan(startEvent: IRuntimeEvent, type: string, stopEvent?: IRuntimeEvent): ITimeSpan {
    if (!this._currentResultSpan) {
      this.initializeCurrentResultSpan({
        name: "implicit_result_span_start_for_supplementary_span",
        timestamp: new Date(startEvent.timestamp.getTime() -1),
        blockKey: this.blockKey
      }, `Implicit ${this.blockKey}`);
    }

    const supplementarySpan: ITimeSpan = {
      start: startEvent,
      stop: stopEvent,
      blockKey: `${this.blockKey}_${type}`,
      metrics: []
    };

    if (this._currentResultSpan) {
      this._currentResultSpan.timeSpans.push(supplementarySpan);
    } else {
       console.error(`BlockContext (${this.blockKey}/${this.blockId}): _currentResultSpan is unexpectedly undefined for supplementary span.`);
    }
    return supplementarySpan;
  }

  public pushMetricsToCurrentResult(newMetrics: RuntimeMetric[], strategy?: IMetricMergeStrategy): void {
    if (!this._currentResultSpan) {
      console.warn(`BlockContext (${this.blockKey}/${this.blockId}): Attempted to push metrics without an initialized ResultSpan. Metrics lost.`);
      return;
    }
    if (!newMetrics || newMetrics.length === 0) return;

    const mergeStrategy = strategy || this.metricMergeStrategy;
    this._currentResultSpan.metrics = mergeStrategy.apply(
      this._currentResultSpan.metrics || [], 
      newMetrics
    );
  }
  
  public getActiveTimeSpan(): ITimeSpan | undefined {
    return this._activeTimeSpan;
  }

  /**
   * @deprecated Use initializeCurrentResultSpan, finalizeCurrentResultSpan, and other dedicated methods.
   * Creates and adds a new ResultSpan to the context's list.
   */
  public createAndAddResultSpan(params: Partial<ResultSpan> & { start: IRuntimeEvent }): ResultSpan {
    const span = new ResultSpan();
    span.blockKey = params.blockKey || this.blockKey;
    span.index = params.index === undefined ? this.index : params.index;
    span.start = params.start;
    span.timeSpans = params.timeSpans ? [...params.timeSpans] : [];
    span.metrics = params.metrics ? [...params.metrics] : [];
    span.label = params.label;
    span.children = params.children ? [...params.children] : [];

    this.resultSpans.push(span);
    return span;
  }
}
