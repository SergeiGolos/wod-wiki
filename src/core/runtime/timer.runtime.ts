import { ButtonConfig, IRuntimeBlock, ITimerRuntime, RuntimeEvent, RuntimeTrace, StatementKey, StatementNode, TimerDisplayBag, WodResultBlock } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";
import { IdleRuntimeBlock } from "./IdelRuntimeBlock";
import { RuntimeJit } from "./RuntimeJit";


/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */




export class TimerRuntime implements ITimerRuntime {1
  public trace: RuntimeTrace | undefined;  
  public current: IRuntimeBlock | undefined;
  
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public script: RuntimeStack, 
    public jit: RuntimeJit,
    private onSetDisplay: (display: TimerDisplayBag) => void,
    private onSetButtons: (buttons: ButtonConfig[]) => void,
    private onSetResults: (results: WodResultBlock[]) => void
  ) {
    // Initialize block tracker with all nodes from the script     
    this.reset();
  }

  reset() {
    this.current = this.gotoBlock(undefined);
    this.trace = new RuntimeTrace();
  }
  
  setDisplay: (display: TimerDisplayBag) => void = (display) => {
    this.display = display;
    this.onSetDisplay(display);
  };
 
  setButtons: (buttons: ButtonConfig[]) => void = (buttons) => {
    this.buttons = buttons;
    this.onSetButtons(buttons);
  };
  setResults: (results: WodResultBlock[]) => void = (results) => {
    this.results = results;
    this.onSetResults(results);
  };

  buttons: ButtonConfig[] = [];
  results: WodResultBlock[] = [];
  display: TimerDisplayBag = { elapsed: 0, label: "idle", bag: {} };
  
  public events: RuntimeEvent[] = [];
  /**
   * Processes timer events and produces actions
   * @param events Array of runtime events to process
   * @returns Array of runtime actions to apply
   */
  public tick(events: RuntimeEvent[]): RuntimeEvent[] {    
    let next : RuntimeEvent[] = [];
    for (const event of events) {                        
      const actions = this.current?.onEvent(event, this) ?? [];
      for (const action of actions) {
        next = [...next, ... action.apply(this)];
      }      
    }
    return next;
  }

  /**
   * Navigates to a specific block in the workout script and records the visit
   * @param blockId ID of the block to navigate to
   * @returns The runtime block that was navigated to
   */
  public gotoBlock(node: StatementNode | undefined): IRuntimeBlock {        
    if (node == undefined) {
      return this.current = new IdleRuntimeBlock();
    }    

    // Get the initial execution stack for this node
    let current = this.script.getId(node.id);
    
    // If this is a parent node, traverse down to a leaf node
    while (current && current.children?.length > 0) {
      // Get the number of times we've entered this node to determine which child to pick
      const reentryCount = this.trace!.get(current.id) ?? 0;
      // Select child using round-robin (modulo number of children)
      const childIndex = reentryCount % current.children.length;
      const childId = current.children[childIndex];
      // Update the stack to include the selected child
      current = this.script.getId(childId) ?? undefined;
    }

    var stack = this.script.goto(current?.id ?? node.id);
    if (!stack) {
      throw new Error(`Block with ID ${current?.id ?? node.id} not found`);
    }

    let key = this.trace!.set(stack);
    return this.current = this.jit.compile(key, this.trace!, stack);
  }
}