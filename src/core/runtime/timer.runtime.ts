import { IRuntimeBlock, ITimerRuntimeIo, IRuntimeEvent, StatementNode, OutputEvent } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";
import { RuntimeJit } from "./RuntimeJit";
import { interval, map, merge, Observable, Subject, Subscription, tap } from "rxjs";
import { RuntimeTrace } from "./RuntimeTrace";
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
  public trace: RuntimeTrace;
   
    
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public code: string,
    public script: RuntimeStack,     
    public jit: RuntimeJit,
    public input$: Subject<IRuntimeEvent>,
    public output$: Subject<OutputEvent>,    
  ) {            
    this.trace = new RuntimeTrace();
    this.next(this.jit.idle(this));

    this.tick$ = interval(100).pipe(
      map(() => new TickEvent()));
    
    const loggedInput = this.input$.pipe(
      tap((event) => {
        console.debug(`::handle[- ${event.name} -]`, this.trace.current());        
      }));

    this.dispose = merge(loggedInput, this.tick$)
      .subscribe(event => {         
        const block = this.trace.current();
        const actions = block?.handle(this, event)            
            .filter(actions => actions !== undefined)
            .flat() ?? [];
        
        for (const action of actions) {
          console.debug(`++action[- ${action.name} -]`, event);
          action.apply(this, this.input$, this.output$);
        }            
      });    
  }

  next(block?: IRuntimeBlock | undefined): IRuntimeBlock | undefined {
    // If a specific block is provided, set it as the current block
    if (block) {      
      this.trace.push(block);
      return block;
    }

    this.trace.push(this.jit.idle(this));
  }
  /**
   * Resets the runtime to its initial state
   */
  reset(): void {    
    this.trace = new RuntimeTrace();
    this.next(this.jit.idle(this));
  }
}