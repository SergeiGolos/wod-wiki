import { ButtonConfig, IRuntimeBlock, ITimerRuntime, RuntimeEvent, StatementNode, TimerDisplayBag, WodResultBlock } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";
import { IdleRuntimeBlock } from "./IdelRuntimeBlock";


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
  public current: IRuntimeBlock;
  
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public script: RuntimeStack,
    private onSetDisplay: (display: TimerDisplayBag) => void,
    private onSetButtons: (buttons: ButtonConfig[]) => void,
    private onSetResults: (results: WodResultBlock[]) => void
  ) {
    // Initialize block tracker with all nodes from the script
    this.blockTracker = new Map();  
    this.current = this.gotoBlock(undefined);
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
  display: TimerDisplayBag = { elapsed: 0, state: "idel" };
  
  public events: RuntimeEvent[] = [];
  /**
   * Processes timer events and produces actions
   * @param events Array of runtime events to process
   * @returns Array of runtime actions to apply
   */
  public tick(events: RuntimeEvent[]): void {    
    for (const event of events) {                        
      const actions = this.current?.onEvent(event, this) ?? [];
      for (const action of actions) {
        action.apply(this);
      }      
    }
  }

  /**
   * Navigates to a specific block in the workout script and records the visit
   * @param blockId ID of the block to navigate to
   * @returns The runtime block that was navigated to
   */
  public gotoBlock(node: StatementNode | undefined): IRuntimeBlock {        
    return this.current = node !== undefined 
      ? this.script.goto(node.id) 
      : new IdleRuntimeBlock();
  }
}
