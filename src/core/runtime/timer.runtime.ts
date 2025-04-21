import { IRuntimeBlock, ITimerRuntimeIo, IRuntimeEvent, IRuntimeLog, StatementNode } from "../timer.types";
import { RuntimeTrace } from "../RuntimeTrace";
import { RuntimeStack } from "./RuntimeStack";
import { RuntimeJit } from "./RuntimeJit";
import { interval, map, merge, Subject, Subscription } from "rxjs";
import { ChromecastEvent } from "@/cast";
import { useEffect } from "react";

/**
 * Runtime engine that processes workout scripts
 * 
 * This class manages the execution of a workout script, including:
 * - Tracking time and state
 * - Processing timer events
 * - Delegating to the compiled runtime for node-specific processing
 */

export class TimerRuntime implements ITimerRuntimeIo {  
  public current: IRuntimeBlock | undefined;
  private messagePump: Subscription | undefined;
  
  /**
   * Creates a new TimerRuntime instance
   * @param script The compiled runtime to execute
   */
  constructor(public code: string,
    public script: RuntimeStack,     
    public jit: RuntimeJit,
    public input$: Subject<IRuntimeEvent>,
    public output: Subject<ChromecastEvent>,    
    public events: IRuntimeLog[] = [],
    public trace: RuntimeTrace | undefined = undefined
  ) {            
    useEffect(() => {
      this.messagePump = merge(input$, interval(100)
      .pipe(map(() => ({ name: 'tick', timestamp: new Date() } as IRuntimeEvent))))
      .subscribe(event => {         
        console.debug('TimerRuntime: Received event', event, this.current);
        const actions = this.current?.onEvent(event, this) ?? [];        
        for (const action of actions) {
          console.debug('TimerRuntime: Generated action', action);
          action.apply(this, this.input$.next, this.output.next);
        }            
      });    
      
      return () => {
        this.messagePump?.unsubscribe();
        this.messagePump = undefined;
      };
    }, [input$]);
  }
  
  input(events: IRuntimeEvent[]): Promise<void> {  
    events.forEach(event => this.input$?.next(event));
    return Promise.resolve();    
  }   
  
  goto(block: StatementNode | undefined): IRuntimeBlock | undefined {
    if (!block) {
        return this.current = undefined;
    }

    const children = (block.children ?? []).map(id => this.script.getId(id)!);
    // todo: make this work
    return this.current = this.jit.compile(this.trace!, children);
  }
}