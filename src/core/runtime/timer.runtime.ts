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
    const stack = this.script.goto(node.id);
    let key = this.trace!.set(stack);
    return this.current = this.jit.compile(key, this.trace!, stack);
  }
}