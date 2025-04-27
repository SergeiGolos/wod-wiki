import { IRuntimeBlock, ITimerRuntimeIo, IRuntimeEvent, IRuntimeLog, StatementNode } from "../timer.types";
import { RuntimeTrace } from "../RuntimeTrace";
import { RuntimeStack } from "./RuntimeStack";
import { RuntimeJit } from "./RuntimeJit";
import { interval, map, merge, Observable, Subject, Subscription, tap } from "rxjs";
import { ChromecastEvent } from "@/cast";

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
  public input$: Subject<IRuntimeEvent>;
  public tick$: Observable<IRuntimeEvent>;
  public output$: Subject<ChromecastEvent>;
    
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public code: string,
    public script: RuntimeStack,     
    public jit: RuntimeJit,
    public events: IRuntimeLog[] = [],
    public trace: RuntimeTrace | undefined = undefined
  ) {            
    this.current = jit.compile(this, [], this.trace)

    this.input$ = new Subject<IRuntimeEvent>();
    this.tick$ = interval(100).pipe(
      map(() => ({ name: 'tick', timestamp: new Date() } as IRuntimeEvent)));
    this.output$ = new Subject<ChromecastEvent>();
    
    const loggedInput = this.input$.pipe(
      tap((event) => {
        console.debug(`::handle[- ${event.name} -]`, this.current);
      }));

    this.dispose = merge(loggedInput, this.tick$)
      .subscribe(event => {         
        
        const actions = this.current?.onEvent(event, this) ?? [];        
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
    
    const children = (block.children ?? []).map(id => this.script.getId(id)!);
    console.log("Test:", children);
    // todo: make this work
    return this.current = this.jit.compile(this, children, this.trace);
  }

  reset(): void {
    this.events = [];
    this.current = this.jit.compile(this, [], this.trace);    
    this.trace?.clear();
  }
}