import { StatementNode, TimerEvent } from "../timer.types";
import { RuntimeStack } from "../parser/RuntimeStack";
import { IdelRuntimeBlock } from "./blocks/IdelRuntimeBlock";
import { IRuntimeAction } from "./EventAction";


export interface RuntimeResult {    
  round: number;
  stack: number[];
  timestamps: TimerEvent[];
}

export interface RuntimeState {
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  currentBlockId?: number;
  elapsedTime: number;
  remainingTime?: number;
}

export type RuntimeMetric = {
  name: string;
  unit: string;
  value: number;
}

export interface IRuntimeBlock {    
  blockId: number;
  blockIndex: number;

  label?: string;

  parent?: IRuntimeBlock;        
  round?: [number, number];


  metrics: RuntimeMetric[];
  events: TimerEvent[]; 
  onEvent(event: RuntimeEvent, runtime: TimerRuntime): IRuntimeAction[];
}


export interface IRuntimeHandler {
  type: string;    
  onTimerEvent(timestamp: Date, event: string, blocks?: IRuntimeBlock[]): IRuntimeAction[];
}


export type RuntimeEvent = { 
  timestamp: Date, 
  name: string    
}

export interface RuntimeBlockHandler {
  apply: (event: RuntimeEvent, runtime: TimerRuntime) => IRuntimeAction[];
}
/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */
export class TimerRuntime {
  private blockTracker: Map<string, number> 
  public current?: IRuntimeBlock;
  private idel: IdelRuntimeBlock;
  
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public script: RuntimeStack) {
    // Initialize block tracker with all nodes from the script
    this.blockTracker = new Map();
    this.idel = new IdelRuntimeBlock();
    this.current = undefined;
  }
  
  /**
   * Processes timer events and produces actions
   * @param events Array of runtime events to process
   * @returns Array of runtime actions to apply
   */
  public tick(events: RuntimeEvent[]): IRuntimeAction[] {
    var current = this.current ?? this.idel;
    let actions: IRuntimeAction[] = [];
    for (const event of [...events, { name: "tick", timestamp: new Date() }] ) {
      actions = [...actions, ...current.onEvent(event, this) ?? []];
    }

    return actions;
  }

  /**
   * Navigates to a specific block in the workout script and records the visit
   * @param blockId ID of the block to navigate to
   * @returns The runtime block that was navigated to
   */
  public gotoBlock(node: StatementNode): IRuntimeBlock {    
    let parent: IRuntimeBlock | undefined = this.current = this.script.goto(node.id);  
    while (parent != undefined)  
    {
      // TODO Build Proper key from parent relationship
      const key = `${parent.blockId}`;  
      this.blockTracker.set(key, (this.blockTracker.get(key) ?? 0) + 1);
      parent = parent.parent;
    }

    return this.current!;
  }
}
