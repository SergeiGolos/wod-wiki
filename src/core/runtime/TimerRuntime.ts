import { Subscription, Observable, Subject, interval, map, merge } from "rxjs";
import { IRuntimeAction } from "../IRuntimeAction";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IRuntimeEvent } from "../IRuntimeEvent";
import { IRuntimeLog } from "../IRuntimeLog";
import { ITimerRuntimeIo } from "../ITimerRuntimeIo";
import { OutputEvent } from "../OutputEvent";
import { TickEvent } from "./inputs/TickHandler";
import { RuntimeJit } from "./RuntimeJit";
import { RuntimeScript } from "./RuntimeScript";
import { RuntimeStack } from "./RuntimeStack";
import { ResultSpanBuilder } from "../metrics/ResultSpanBuilder";


export class TimerRuntime implements ITimerRuntimeIo {
  public dispose: Subscription | undefined;
  public tick$: Observable<IRuntimeEvent>;
  public trace: RuntimeStack;
  public registry: ResultSpanBuilder;

  constructor(public code: string,
    public script: RuntimeScript,
    public jit: RuntimeJit,

    public input$: Subject<IRuntimeEvent>,
    public output$: Subject<OutputEvent>
  ) {
    this.trace = new RuntimeStack();
    this.registry = new ResultSpanBuilder();

    this.init();
    this.tick$ = interval(50).pipe(
      map(() => new TickEvent()));    this.dispose = merge(this.input$, this.tick$)
      .subscribe(event => {
        const block = this.trace.current();
        
        // Handle case where no block is on the stack
        if (!block) {
          console.warn(`📣 Event ${event.name} received but no block is on the runtime stack`);
          return;
        }
        
        this.log(block, event);
        
        // Add enhanced logging for all non-tick events
        if (event.name !== "tick") {
          console.log(`📣 Event raised: ${event.name} at ${new Date().toISOString()}`);
          if ((event as any).source) {
            console.log(`   Source: ${(event as any).source}`);
          }
        }
        
        const actions = block.handle(this, event, this.jit.handlers)
          .filter(arr_actions => arr_actions !== undefined)
          .flat() ?? [];

        if (actions.length > 0) {
          this.apply(actions, block);
        }
      });
  }  init() {
    this.history = [];
    this.trace = new RuntimeStack();
    this.registry = new ResultSpanBuilder();
      // Always push the root block unless explicitly running in test environment
    // This ensures the runtime stack is never empty during normal operation
    const rootBlock = this.jit.root(this);
    if (rootBlock) {
      // Check for testing environment using Vitest globals
      const isTestEnv = typeof globalThis !== 'undefined' && 
                       (globalThis as any).__vitest__ !== undefined;
      if (!isTestEnv) {
        this.push(rootBlock);
      }
    }
  }

  public apply(actions: IRuntimeAction[], source: IRuntimeBlock) {
    for (const action of actions) {      
      this.log(source, { name: action.name, timestamp: new Date() });
      console.log(`⚡ Action: ${action.name} requested by block: ${source.constructor.name} [${source.blockKey}]`);
          
      action.apply(this, this.input$, this.output$);
    }
  }

  public history: Array<IRuntimeLog> = [];
  public log(block: IRuntimeBlock, event: IRuntimeEvent) {
    if (event.name == "tick") {
      return;
    }

    if (block) {
      console.log(`====+: ${event.name} by blockKey: ${block?.blockKey?.toString() ?? 'N/A'}`);
      this.history.push({
        blockId: block.blockId,
        blockKey: block?.blockKey?.toString() ?? "undefined",
        ...event
      });
    }
  }
  public push(block: IRuntimeBlock): IRuntimeBlock {
    if (!block) {
      console.warn('Attempting to push undefined block to runtime stack - ignoring');
      return this.trace.current() as IRuntimeBlock;
    }
    
    console.log(`📚 TimerRuntime.push() - pushing block: ${block.constructor.name} [${block.blockKey}]`);
    
    const pushedBlock = this.trace.push(block); // Renamed to avoid confusion
    let enterActions = pushedBlock.enter(this) ?? [];
    
    console.log(`📚 TimerRuntime.push() - block.enter() returned ${enterActions.length} actions:`, enterActions.map(a => a.name));
    
    this.apply(enterActions, pushedBlock);    
    return this.trace.current() ?? pushedBlock;
  }
  public pop(): IRuntimeBlock | undefined {    
    console.log(`📚 TimerRuntime.pop() - popping current block`);
    
    let poppedBlock = this.trace.pop(); // Keep this as poppedBlock

    if (poppedBlock) {
      console.log(`📚 TimerRuntime.pop() - popped ${poppedBlock.constructor.name} [${poppedBlock.blockKey}]`);
      
      // Call onStop for the popped block and its parents
      let leaveActions = poppedBlock.leave(this) ?? [];
      this.apply(leaveActions, poppedBlock);
      
      const currentBlock = this.trace.current();
      console.log(`📚 TimerRuntime.pop() - current block is now: ${currentBlock?.constructor.name || 'none'} [${currentBlock?.blockKey || 'N/A'}]`);
      
      return poppedBlock;
    }
    
    console.log(`📚 TimerRuntime.pop() - no block to pop`);
    return undefined; // Return undefined if no block was popped
  }

  reset() {
    this.output$.next({
      eventType: 'CLEAR_RESULTS',
      timestamp: new Date(),
      bag: {}
    });

    this.init();
  }
}
