import { IRuntimeAction } from "./EventHandler";
import { IRuntimeBlock } from "./IRuntimeBlock";

/**
 * Represents the runtime stack managing currently executing blocks.
 */
export interface RuntimeStack {
  /**
   * Gets the parent blocks in execution order (outermost to innermost).
   */
  getParentBlocks(): IRuntimeBlock[];
  
  /**
   * Pushes a new block onto the stack.
   */
  push(block: IRuntimeBlock): void;
  
  /**
   * Pops the current block from the stack.
   */
  pop(): IRuntimeBlock | undefined;
  
  /**
   * Gets the current top block without removing it.
   */
  peek(): IRuntimeBlock | undefined;
  
  /**
   * Gets the current stack depth.
   */
  depth(): number;
}

/**
 * Core runtime interface for workout execution, managing state and block transitions.
 */
export interface ITimerRuntime {
  /** The runtime stack of currently executing blocks */
  stack: RuntimeStack;
  
  /** Current execution state */
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  currentRep: number;
  currentRound: number;
  
  /**
   * Applies a set of runtime actions from a source block.
   * @param actions Array of actions to apply
   * @param source The block that generated the actions
   */
  apply(actions: IRuntimeAction[], source: IRuntimeBlock): void;
  
  /**
   * Gets the current execution time in milliseconds.
   */
  getCurrentTime(): number;
  
  /**
   * Starts the runtime execution.
   */
  start(): void;
  
  /**
   * Stops the runtime execution.
   */
  stop(): void;
  
  /**
   * Pauses the runtime execution.
   */
  pause(): void;
  
  /**
   * Resumes the runtime execution.
   */
  resume(): void;
  
  /**
   * Resets the runtime to initial state.
   */
  reset(): void;
}
