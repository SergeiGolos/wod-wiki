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
    console.log('[gotoBlock] Input node:', node);  
    if (node == undefined) {
      console.log('[gotoBlock] No node provided, returning IdleRuntimeBlock');
      return this.current = new IdleRuntimeBlock();
    }    

    // if Leaf
    if (node.children.length == 0) {
      console.log('[gotoBlock] Leaf node, returning LeafRuntimeBlock');
      const leaf = this.script.goto(node.id);
      const compiledBlock = this.jit.compile(this.trace!, leaf);            
      return this.current = compiledBlock;
    }

    // Get the initial execution stack for this node
    let current = this.script.getId(node.id);        
    let expectedRounds = (current?.rounds ?? 1);
    if (current?.children?.length ?? 0 > 0) {
      expectedRounds *= current?.children?.length ?? 1;
    }
    
    let reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
    console.log('[gotoBlock] Initial node:', { id: node.id, current, expectedRounds, reentryCount });
    while (current && reentryCount >= expectedRounds) {      
      current = this.script.getId(current.parent ?? current.next ?? -1);
      reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
    }
    
    while (current && current.children?.length > 0) {
      reentryCount = this.trace!.get(current.id) ?? 0;
      console.log('[gotoBlock] Processing parent node:', {
        nodeId: current.id,
        childrenCount: current.children.length,
        reentryCount
      });
      
      // Select child using round-robin (modulo number of children)
      const childIndex = reentryCount % current.children.length;
      const childId = current.children[childIndex];
      console.log('[gotoBlock] Selected child:', { childIndex, childId });
      
      // Update the stack to include the selected child
      current = this.script.getId(childId) ?? undefined;
    }

    if (!current) {
      return this.current = new IdleRuntimeBlock();
    }

    var stack = this.script.goto(current.id);
    if (!stack) {
      const errorId = current?.id ?? -1;
      console.error('[gotoBlock] Failed to find block:', errorId);
      throw new Error(`Block with ID ${errorId} not found`);
    }
  
    const compiledBlock = this.jit.compile(this.trace!, stack);
    console.log('[gotoBlock] Compiled runtime block:', { key: compiledBlock.blockKey, block: compiledBlock });
    
    return this.current = compiledBlock;
  }
}