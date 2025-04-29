import { IRuntimeBlock, ITimerRuntimeIo, IRuntimeEvent, IRuntimeLog, StatementNode, OutputEvent } from "../timer.types";
import { RuntimeTrace } from "./RuntimeTrace";
import { RuntimeStack } from "./RuntimeStack";
import { RuntimeJit } from "./RuntimeJit";
import { interval, map, merge, Observable, Subject, Subscription, tap } from "rxjs";

/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */

export class TimerRuntime implements ITimerRuntimeIo {  
  public current: IRuntimeBlock;
  public dispose: Subscription | undefined;
  public tick$: Observable<IRuntimeEvent>;  
    
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public code: string,
    public script: RuntimeStack,     
    public jit: RuntimeJit,
    public input$: Subject<IRuntimeEvent>,
    public output$: Subject<OutputEvent>,
    public trace: RuntimeTrace | undefined = undefined
  ) {            
    this.current = jit.compile(this, [], this.trace)

    this.tick$ = interval(100).pipe(
      map(() => ({ name: 'tick', timestamp: new Date() } as IRuntimeEvent)));
    
    const loggedInput = this.input$.pipe(
      tap((event) => {
        console.debug(`::handle[- ${event.name} -]`, this.current);        
      }));

    this.dispose = merge(loggedInput, this.tick$)
      .subscribe(event => {         
                
        const actions = this.current?.handlers
            .map(handler => handler.apply(event, this))
            .filter(actions => actions !== undefined)
            .flat() ?? [];
        
        for (const action of actions) {
          console.debug(`++action[- ${action.name} -]`, event);
          action.apply(this, this.input$, this.output$);
        }            
      });    
  }
  
  goto(block: StatementNode | undefined): IRuntimeBlock | undefined {
    if (!block) {
      return this.jit.compile(this, [], this.trace!);
    }
    let stack: StatementNode[] = [];
    let parentId: number | undefined = block.id;
    while (parentId != undefined) {      
      const next: StatementNode = this.script.getId(parentId)!;
      stack.push(next);
      parentId = next.parent ?? undefined;
    }    
    return this.current = this.jit.compile(this, stack, this.trace);
  }

  reset(): void {
    this.current = this.jit.compile(this, [], this.trace);    
    this.trace?.clear();
  }
}