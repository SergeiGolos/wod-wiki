import { ButtonConfig, IRuntimeBlock, ITimerRuntime, ResultSpan, RuntimeEvent, RuntimeMetricEdit, RuntimeTrace, StatementNode, TimerDisplayBag, TimerFromSeconds } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";
import { IdleRuntimeBlock } from "./IdelRuntimeBlock";
import { RuntimeJit } from "./RuntimeJit";
import { startButton } from "@/components/buttons/timerButtons";


/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */

export class TimerRuntime implements ITimerRuntime {
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
    private onSetResults: (results: ResultSpan[]) => void,
    private onSetCursor: (cursor: IRuntimeBlock | undefined) => void,
    private onSetEdits: (edits: RuntimeMetricEdit[]) => void
    
  ) {
    // Initialize block tracker with all nodes from the script     
    this.reset();
  }

  reset() {
    this.results = [];
    this.buttons = [startButton];
    this.edits = [];
    this.onSetResults(this.results);
    this.onSetEdits(this.edits);
    this.current = this.gotoBlock(undefined);    
    this.trace = new RuntimeTrace();        
  }
  
  buttons: ButtonConfig[] = [];
  results: ResultSpan[] = [];
  edits: RuntimeMetricEdit[] = [];

  display: TimerDisplayBag = { primary: new TimerFromSeconds(0), label: "idle", bag: {} };
  
  public events: RuntimeEvent[] = [];
  /**
   * Processes timer events and produces actions
   * @param events Array of runtime events to process
   * @returns Array of runtime actions to apply
   */
  public tick(events: RuntimeEvent[]): RuntimeEvent[] {    
    let resultsCount = this.results.length;
    let next : RuntimeEvent[] = [];
    this.display = { bag: {} } as TimerDisplayBag;    
    
    for (const event of events) {                        
      const actions = this.current?.onEvent(event, this) ?? [];
      for (const action of actions) {
        next = [...next, ... action.apply(this)];
      }      
    }
    this.onSetDisplay(this.display);
    this.onSetButtons(this.buttons);        
    if (resultsCount != this.results.length) {
      this.onSetResults([...this.results]);
    }
    if (this.edits.length > 0) {
      this.onSetEdits([...this.edits]);
    }
    return next;
  }
  edit(metric: RuntimeMetricEdit) {
    this.edits.push(metric);
    this.onSetEdits([...this.edits]);
  }
  /**
   * Navigates to a specific block in the workout script and records the visit
   * @param blockId ID of the block to navigate to
   * @returns The runtime block that was navigated to
   */
  public gotoBlock(node: StatementNode | undefined): IRuntimeBlock {                
    const report = this.current?.report() ?? [];
    this.results = [...this.results, ...report];      
    
    if (node == undefined) {
      this.onSetCursor(undefined);
      return this.current = new IdleRuntimeBlock();
    }    
    console.log("Navigating to block:", node.id, node.isLeaf, node.children.length);  
    if (node.isLeaf === true || node.children.length == 0) {
      const leaf = this.script.goto(node.id);
      const compiledBlock = this.jit.compile(this.trace!, leaf);            
      this.onSetCursor(compiledBlock);
      return this.current = compiledBlock;
    }

    // Get the initial execution stack for this node
    let current = this.script.getId(node.id);        
    let expectedRounds = (current?.rounds ?? 1);
    if (current?.children?.length ?? 0 > 0) {
      expectedRounds *= current?.children?.length ?? 1;
    }
    
    let reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
    while (current && reentryCount >= expectedRounds) {      
      current = this.script.getId(current.parent ?? current.next ?? -1);
      reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
    }
    
    while (current && current.children?.length > 0) {
      reentryCount = this.trace!.get(current.id) ?? 0;
      
      // Select child using round-robin (modulo number of children)
      const childIndex = reentryCount % current.children.length;
      const childId = current.children[childIndex];
      
      // Update the stack to include the selected child
      current = this.script.getId(childId) ?? undefined;
    }

    if (!current) {
      this.onSetCursor(undefined);
      return this.current = new IdleRuntimeBlock();
    }

    var stack = this.script.goto(current.id);
    if (!stack) {
      const errorId = current?.id ?? -1;
      console.error('[gotoBlock] Failed to find block:', errorId);
      throw new Error(`Block with ID ${errorId} not found`);
    }
  
    const compiledBlock = this.jit.compile(this.trace!, stack);
    this.onSetCursor(compiledBlock);
    return this.current = compiledBlock;
  }
}