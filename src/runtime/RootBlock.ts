import { IRuntimeBlock } from "./IRuntimeBlock";
import { RuntimeMetric } from "./RuntimeMetric";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance, NullMetricInheritance } from "./IMetricInheritance";
import { DefaultResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";
import { ITimerRuntime } from "./ITimerRuntime";

/**
 * Runtime block that serves as the top-level execution container for the entire workout.
 * The root block manages the overall workout flow and coordinates execution of child blocks.
 */
export class RootBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly spans: DefaultResultSpanBuilder;
  handlers: EventHandler[] = [];
  metrics: RuntimeMetric[] = [];
  parent?: IRuntimeBlock;
  
  private childBlocks: IRuntimeBlock[] = [];
  private currentChildIndex: number = 0;
  private isCompleted: boolean = false;

  constructor(childBlocks?: IRuntimeBlock[], rootMetrics?: RuntimeMetric[]) {
    this.key = new BlockKey();
    this.spans = new DefaultResultSpanBuilder();
    this.childBlocks = childBlocks || [];
    this.metrics = rootMetrics || [];
    
    // Set this block as parent for all child blocks
    this.childBlocks.forEach(child => {
      child.parent = this;
    });
  }

  /**
   * Executes the root block logic - manages progression through child blocks.
   * @param runtime The runtime context in which the block is executed
   * @returns An array of actions to execute the current child block or complete the workout
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // If we've completed all child blocks, signal completion
    if (this.currentChildIndex >= this.childBlocks.length) {
      if (!this.isCompleted) {
        this.isCompleted = true;
        return [
          {
            type: 'PUSH_BLOCK',
            payload: {
              block: 'DONE' // Signal to push completion block
            }
          }
        ];
      }
      return []; // Already completed
    }

    // Get the current child block to execute
    const currentChild = this.childBlocks[this.currentChildIndex];
    
    return [
      {
        type: 'PUSH_BLOCK', 
        payload: {
          block: currentChild
        }
      }
    ];
  }

  /**
   * Called when the root block is entered. Initializes the root execution context.
   * @param runtime The timer runtime instance
   */
  onEnter(runtime: ITimerRuntime): void {
    this.currentChildIndex = 0;
    this.isCompleted = false;
    console.log('Starting workout execution from root block');
  }

  /**
   * Returns the metric inheritance for this block. Root blocks provide base inheritance.
   * @returns NullMetricInheritance (root blocks are at the top of the hierarchy)
   */
  inherit(): IMetricInheritance {
    // Root blocks are at the top of the inheritance hierarchy
    return new NullMetricInheritance();
  }

  /**
   * Advances to the next child block in the execution sequence.
   */
  advanceToNextChild(): void {
    this.currentChildIndex++;
  }

  /**
   * Gets the current child block being executed.
   */
  getCurrentChild(): IRuntimeBlock | undefined {
    return this.childBlocks[this.currentChildIndex];
  }

  /**
   * Adds a child block to the root block's execution sequence.
   */
  addChildBlock(block: IRuntimeBlock): void {
    block.parent = this;
    this.childBlocks.push(block);
  }

  /**
   * Gets all child blocks managed by this root block.
   */
  getChildBlocks(): IRuntimeBlock[] {
    return [...this.childBlocks];
  }
}