import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, RuntimeEvent, StatementNode, TimerEvent } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";
import { IdelRuntimeBlock } from "./IdelRuntimeBlock";


/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */



export class TimerRuntime implements ITimerRuntime {
  private blockTracker: Map<string, number> 
  public current: IRuntimeBlock | undefined;
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
  public events: RuntimeEvent[] = [];
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
    this.current = this.script.goto(node.id);  
    return this.current!;
  }
}
