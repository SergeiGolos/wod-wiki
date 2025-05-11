import { IRuntimeBlock, ITimerRuntimeIo, IRuntimeEvent, OutputEvent, IRuntimeAction, IRuntimeLog } from "../timer.types";
import { RuntimeScript } from "./RuntimeScript";
import { RuntimeJit } from "./RuntimeJit";
import { interval, map, merge, Observable, Subject, Subscription } from "rxjs";
import { RuntimeStack } from "./RuntimeStack";
import { TickEvent } from "./inputs/TickHandler";

/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */

export class TimerRuntime implements ITimerRuntimeIo { 
  public dispose: Subscription | undefined;
  public tick$: Observable<IRuntimeEvent>; 
  public trace: RuntimeStack;  
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public code: string,
    public script: RuntimeScript,     
    public jit: RuntimeJit,
    public input$: Subject<IRuntimeEvent>,
    public output$: Subject<OutputEvent>,    
  ) {                
    this.trace = new RuntimeStack();
    
    this.init();
    this.tick$ = interval(50).pipe(
      map(() => new TickEvent()));
    
    this.dispose = merge(this.input$, this.tick$)
      .subscribe(event => {         
        this.log(event);

        let block = this.trace.current();                
        while (block) {
          const actions = block?.handle(this, event, this.jit.handlers)            
            .filter(actions => actions !== undefined)
            .flat() ?? [];
          
          if (actions.length > 0) {
            this.apply(actions, "handle");
            block = undefined;
          }
          else {
            block = block.parent;
          }          
        }                
      });    
  } 
  init() {
    this.push(this.jit.root(this));
  }
  
  apply(actions: IRuntimeAction[], lifeCycle: string) {
    
    if (actions.length > 0) {
      console.debug(
        `TimerRuntime ${actions.length} action(s) for [${lifeCycle}]`, 
        actions.map(a => a.constructor.name));
    }

    for (const action of actions) {          
      action.apply(this, this.input$, this.output$);
    }    
  }

  public history: Array<IRuntimeLog> = [];
  public log(event: IRuntimeEvent) {
    if (event.name == "tick") {
      return;
    }
    const block = this.trace.current();
    if (block) {
      this.history.push({
        blockId: block.blockId,
        blockKey: block.blockKey ?? block.blockId.toString(),
        ...event
      });
    }
  }

  push(block: IRuntimeBlock): IRuntimeBlock {            
    console.log(`==== Push: ${block.constructor.name}`);
    block = this.trace.push(block);         
    let actions = block?.enter(this) ?? [];
    this.apply(actions, "enter");
    
    return this.trace.current() ?? block;
  }

  pop(): IRuntimeBlock | undefined {
    console.log(`==== Pop: ${this.trace.current()?.constructor.name}`);
    let block = this.trace.pop();    
    let actions = block?.leave(this) ?? [];        
    this.apply(actions, "leave");
    
    block = this.trace.current(); 
    actions = block?.next(this) ?? [];
    this.apply(actions, "next");

    block = this.trace.current();
    console.log(`==== Load: ${block?.constructor.name}`, block?.blockKey);
    return block;
  } 

  /**
   * Resets the runtime to its initial state
   */
  reset() {    
    this.trace = new RuntimeStack();
    this.history = [];
    this.init()
  }  
}