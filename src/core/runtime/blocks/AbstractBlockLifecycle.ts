import { 
  IRuntimeAction, 
  IRuntimeBlock, 
  IRuntimeEvent, 
  ITimerRuntime,
  ITimeSpan,
  PrecompiledNode
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { BlockContext } from "./BlockContext";

/**
 * Abstract base class that implements the Template Method pattern for runtime blocks.
 * This class provides the basic structure for all blocks and handles common behaviors
 * like logging while allowing concrete subclasses to define specific behaviors.
 */
export abstract class AbstractBlockLifecycle implements IRuntimeBlock {
  constructor(
    // meta
    protected sources: PrecompiledNode[]
  ) {
    this.blockId = sources.map(s => s.id).join(":") || "";
    
    // Initialize the BlockContext with defalt values
    this.ctx = new BlockContext({
      // Default empty values that will be populated in lifecycle methods
      runtime: {} as ITimerRuntime,
      index: 0,
      spans: []
    });
  }
  
  public blockKey?: string | undefined;
  // meta
  public parent?: IRuntimeBlock | undefined;    
  public blockId: string;
  
  // Block state context - holds all mutable state
  protected ctx: BlockContext;
  
  // Runtime event handlers
  protected handlers: EventHandler[] = [];  
  
  // Getters for encapsulated properties
  public getSources(): PrecompiledNode[] {
    return this.sources;
  }
  
  public getIndex(): number {
    return this.ctx.index;
  }
  
  public getSpans(): ITimeSpan[] {
    return this.ctx.spans;
  }
  
  /**
   * Template method for enter lifecycle phase
   * This follows the template method pattern - the base method handles
   * common behavior while abstract methods are implemented by subclasses
   */
  public enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    this.ctx.runtime = runtime;
    
    // Call the hook method for specific behavior
    return this.doEnter(runtime);
  }
  
  /**
   * Template method for next lifecycle phase
   */
  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== next : ${this.blockKey}`);
    this.ctx.runtime = runtime;
    
    // Call the hook method for specific behavior
    return this.doNext(runtime);
  }
  
  /**
   * Template method for leave lifecycle phase
   */
  public leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    this.ctx.runtime = runtime;
    
    // Call the hook method for specific behavior
    return this.doLeave(runtime);
  }
  
  /**
   * Event handling method
   */
  public handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent,
    system: EventHandler[]
  ): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    for (const handler of [...system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      for (const action of actions) {
        result.push(action);
      }
    }

    return result;
  }
  
  /**
   * Helper method to retrieve data from the source nodes
   */
  public get<T>(fn: (node: PrecompiledNode) => T[], recursive?: boolean): T[] {
    let block: IRuntimeBlock = this;
    let result: T[] = block.getSources().flatMap(fn) ?? [];
    while (recursive && block.parent) {
      block = block.parent;
      result.push(...block.getSources().flatMap(fn) ?? []);
    }
    
    return result;
  }
  
  // Abstract hook methods to be implemented by concrete subclasses
  protected abstract doEnter(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract doNext(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract doLeave(runtime: ITimerRuntime): IRuntimeAction[];
}
