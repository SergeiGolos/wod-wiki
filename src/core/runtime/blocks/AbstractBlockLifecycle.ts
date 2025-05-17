import { 
  PrecompiledNode, 
  IRuntimeBlock, 
  IRuntimeEvent, 
  ITimerRuntime, 
  RuntimeMetric, 
  ResultSpan, 
  IRuntimeAction,
  ITimeSpan
} from "../../timer.types";
import { BlockContext, BlockContextOptions } from "./BlockContext";
import { MetricsContext } from "@/core/metrics/MetricsContext";
import { MetricsRelationshipType } from "@/core/metrics/MetricsRelationship";
import { MetricsFactory } from "@/core/metrics/MetricsFactory";
import { EventHandler } from "../EventHandler";

export abstract class AbstractBlockLifecycle implements IRuntimeBlock {
  public readonly blockKey: string;
  public readonly blockId: string;
  protected ctx: BlockContext;
  protected metricsContext: MetricsContext;
  protected logger: Console = console;
  protected readonly relationshipType: MetricsRelationshipType;
  protected metricsFactory: MetricsFactory;
  protected handlers: EventHandler[];
  protected sources: PrecompiledNode[];
  public parent?: IRuntimeBlock;

  protected formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

    if (hours > 0) {
      const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  }

  public get id(): string {
    return this.blockId;
  }

  constructor(
    sources: PrecompiledNode[],
    parentMetricsContext: MetricsContext | undefined,
    relationshipType: MetricsRelationshipType,
    handlers: EventHandler[] = [],
    parentBlock?: IRuntimeBlock
  ) {
    this.sources = sources;
    this.handlers = handlers;
    this.parent = parentBlock;
    this.blockKey = sources.map(s => s.id ? s.id.toString() : s.constructor.name).join("-") || "unknown-block";
    this.blockId = `${this.constructor.name}-${this.blockKey}-${Date.now()}`;
    this.metricsFactory = new MetricsFactory();
    this.relationshipType = relationshipType;

    const contextOptions: BlockContextOptions = {
      sources: sources,
      blockKey: this.blockKey,
    };
    this.ctx = new BlockContext(contextOptions);

    this.metricsContext = parentMetricsContext
      ? parentMetricsContext.createChildContext()
      : new MetricsContext();

    const initialMetrics = this.metricsFactory.createFromStatements(this.sources.map(s => s.node));
    this.metricsContext.addMetrics(initialMetrics);

    this.logger.debug(`+=== constructor : ${this.blockKey} ===+`);
  }

  // --- IRuntimeBlock Implementation ---
  public getSources(): PrecompiledNode[] {
    return this.sources;
  }

  public getContext(): BlockContext {
    return this.ctx;
  }

  public getIndex(): number {
    return this.ctx.index;
  }

  public getSpans(): ITimeSpan[] {
    let allTimeSpans: ITimeSpan[] = [];
    this.ctx.resultSpans.forEach(rs => {
      if (rs.timeSpans) {
        allTimeSpans = allTimeSpans.concat(rs.timeSpans);
      }
    });
    const currentResultSpan = this.ctx.getCurrentResultSpan();
    if (currentResultSpan && currentResultSpan.timeSpans) {
      allTimeSpans = allTimeSpans.concat(currentResultSpan.timeSpans);
    }
    return Array.from(new Set(allTimeSpans));
  }

  public getResultSpans(): ResultSpan[] {
    return this.ctx.resultSpans;
  }

  public get<T>(fn: (node: PrecompiledNode) => T[]): T[] {
    let results: T[] = [];
    for (const source of this.sources) {
      results = results.concat(fn(source));
    }
    return results;
  }

  public metrics(includeChildren: boolean = true, inheritFromParent: boolean = true): RuntimeMetric[] {
    let baseMetrics = this.metricsContext.getAllMetrics(inheritFromParent);
    if (includeChildren) {
      this.logger.warn(`metrics(): Child metric aggregation is currently not implemented for ${this.blockKey}`);
    }
    return baseMetrics;
  }

  public enter(runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`+=== enter : ${this.blockKey} ===+`);
    const enterEvent: IRuntimeEvent = {
      timestamp: new Date(),
      name: 'enter',
      blockKey: this.blockKey,
    };
    
    const defaultLabel = this.generateBlockLabel(this.constructor.name);
    this.ctx.initializeCurrentResultSpan(enterEvent, defaultLabel);
    
    const currentSpan = this.ctx.getCurrentResultSpan();
    if (currentSpan) {
      currentSpan.metrics = this.metricsContext.getAllMetrics(false);
      if (!currentSpan.timeSpans) currentSpan.timeSpans = [];
    }
    return this.doEnter(runtime);
  }

  public leave(runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`+=== leave : ${this.blockKey} ===+`);
    const actions = this.doLeave(runtime);
    const leaveEvent: IRuntimeEvent = {
      timestamp: new Date(),
      name: 'leave',
      blockKey: this.blockKey,
    };
    this.ctx.finalizeCurrentResultSpan(leaveEvent);
    return actions;
  }

  // Aligned with IRuntimeBlock interface: next(runtime: ITimerRuntime)
  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`+=== next : ${this.blockKey} ===+`);
    // Event-specific handler logic is primarily managed by the 'handle' method.
    // 'next' is for non-event-driven progression.
    return this.doNext(runtime);
  }

  public handle(runtime: ITimerRuntime, event: IRuntimeEvent, systemHandlers: EventHandler[]): IRuntimeAction[] {
    this.logger.debug(`+=== handle : ${this.blockKey} (${event.name}) ===+`);
    const result: IRuntimeAction[] = [];
    const allHandlers = Array.from(new Set([...systemHandlers, ...this.handlers]));

    for (const handler of allHandlers) {
      const actions = handler.apply(event, runtime);
      result.push(...actions);
    }
    // Potentially add results from a doHandle hook if needed for block-specific non-handler logic
    // result.push(...this.doHandle(event, runtime));
    return result;
  }

  protected abstract doEnter(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract doLeave(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract doNext(runtime: ITimerRuntime): IRuntimeAction[];
  // Optional: If blocks need to react to handled events beyond handlers.
  // protected doHandle(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
  //   return [];
  // }

  protected generateBlockLabel(blockType: string, details?: string): string {
    let label = `${blockType}: ${this.blockKey}`;
    if (details) {
      label += ` (${details})`;
    }
    return label;
  }
}
