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


export class TimerRuntime implements ITimerRuntimeIo {
  public dispose: Subscription | undefined;
  public tick$: Observable<IRuntimeEvent>;
  public trace: RuntimeStack;

  constructor(public code: string,
    public script: RuntimeScript,
    public jit: RuntimeJit,

    public input$: Subject<IRuntimeEvent>,
    public output$: Subject<OutputEvent>
  ) {
    this.trace = new RuntimeStack();

    this.init();
    this.tick$ = interval(50).pipe(
      map(() => new TickEvent()));

    this.dispose = merge(this.input$, this.tick$)
      .subscribe(event => {
        const blockAtEventReception = this.trace.current();
        this.log(blockAtEventReception!, event);
        let handledByAnyBlock = false;

        let currentBlockInStack = blockAtEventReception;
        while (currentBlockInStack) {
          const actions = currentBlockInStack.handle(this, event, this.jit.handlers)
            .filter(arr_actions => arr_actions !== undefined)
            .flat() ?? [];

          if (actions.length > 0) {
            handledByAnyBlock = true;
            this.apply(actions, currentBlockInStack);
          }

          currentBlockInStack = currentBlockInStack.parent;
        }

        if (!handledByAnyBlock && event.name !== "tick") {
          let eventDetails = `type: ${event.name}`;
          if ((event as any).bag) { 
            try {
              eventDetails += `, bag: ${JSON.stringify((event as any).bag)}`;
            } catch (e) {
              eventDetails += `, bag: (unserializable)`;
            }
          }
          console.error(`TimerRuntime: Orphaned Event Warning: Event '${event.name}' (${eventDetails}) was not handled by any block in the stack.`);          
        }
      });
  }
  init() {
    this.history = [];
    this.trace = new RuntimeStack();
    this.push(this.jit.root(this));
  }

  public apply(actions: IRuntimeAction[], source: IRuntimeBlock) {
    for (const action of actions) {      
      this.log(source, { name: action.name, timestamp: new Date() });
      action.apply(this, this.input$, this.output$);
    }
  }

  public history: Array<IRuntimeLog> = [];
  public log(block: IRuntimeBlock, event: IRuntimeEvent) {
    if (event.name == "tick") {
      return;
    }

    if (block) {
      console.debug(`====+: ${event.name} by blockKey: ${block?.blockKey?.toString() ?? 'N/A'}`);
      this.history.push({
        blockId: block.blockId,
        blockKey: block?.blockKey?.toString() ?? "undefined",
        ...event
      });
    }
  }

  public push(block: IRuntimeBlock): IRuntimeBlock {    
    block = this.trace.push(block);
    let actions = block.enter(this) ?? [];
    this.apply(actions, block);

    return this.trace.current() ?? block;
  }

  public pop(): IRuntimeBlock | undefined {    
    let block = this.trace.pop();

    let actions = block?.leave(this) ?? [];
    this.apply(actions, block!);

    block = this.trace.current();
    if (block) {
      actions = block.next(this) ?? [];
      this.apply(actions, block);
    }

    return this.trace.current();
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
