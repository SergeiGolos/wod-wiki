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
    this.next(this.jit.root(this));
    this.next(this.jit.idle(this));

    this.tick$ = interval(100).pipe(
      map(() => new TickEvent()));
    
    const loggedInput = this.input$.pipe(
      tap((event) => {
        console.debug(
          ` ----- ::handle:: [${event.name}]`,
          this.trace.current()
        );
      }));

    this.dispose = merge(loggedInput, this.tick$)
      .subscribe(event => {         
        this.trace.log(event);

        const block = this.trace.current();        
        // Debug log for event handling
        if (event.name !== 'tick') {
            console.debug(`TimerRuntime handling event [${event.name}] with current block:`, block?.blockKey);
        }
        
        const actions = block?.handle(this, event, this.jit.handlers)            
            .filter(actions => actions !== undefined)
            .flat() ?? [];
        
        if (actions.length > 0) {
        // Debug log for actions generated
          console.debug(`TimerRuntime generated ${actions.length} actions for [${event.name}]:`, 
            actions.map(a => a.constructor.name));

        }
        for (const action of actions) {          
          console.debug(`TimerRuntime applying action: ${action.constructor.name}`);
          action.apply(this, this.input$, this.output$);
        }            
      });    
  }

  next(block?: IRuntimeBlock | undefined, pop : boolean = false): IRuntimeBlock | undefined {
    if (block) {
      block.parent = this.trace.current();
      return this.trace.push(block, this);
    }
    
    let currentBlock = pop ? this.trace.pop() : this.trace.current();
    let statement: StatementNode | undefined = undefined;
    while (currentBlock && !statement) {
      statement = currentBlock.next(this);
      currentBlock = currentBlock.parent;
    }

    if (!statement) { 
      return undefined;
    }

    const nextBlock = this.jit.compile(this, statement) ;
    this.trace.push(nextBlock, this);
    return nextBlock;
  }

  /**
   * Resets the runtime to its initial state
   */
  reset(): void {    
    this.trace = new RuntimeTrace();
    this.next(this.jit.idle(this));
  }
}