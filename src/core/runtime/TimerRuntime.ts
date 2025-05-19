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
        let block = this.trace.current();
        this.log(block!, event);

        while (block) {
          const actions = block.handle(this, event, this.jit.handlers)
            .filter(actions => actions !== undefined)
            .flat() ?? [];

          if (actions.length > 0) {
            this.apply(actions, block);
          }

          // parent bubbles up events
          block = block.parent;
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
      this.history.push({
        blockId: block.blockId,
        blockKey: block?.blockKey?.toString() ?? "undefined",
        ...event
      });
    }
  }

  public push(block: IRuntimeBlock): IRuntimeBlock {
    console.log(`==== Push: ${block?.constructor.name ?? "block not found"} (blockKey: ${block?.blockKey})`);
    block = this.trace.push(block);
    let actions = block?.enter(this) ?? [];
    this.apply(actions, block);

    return this.trace.current() ?? block;
  }

  public pop(): IRuntimeBlock | undefined {
    const currentBlock = this.trace.current();
    console.log(`==== Pop: ${currentBlock?.constructor.name} (blockKey: ${currentBlock?.blockKey})`);
    let block = this.trace.pop();

    let actions = block?.leave(this) ?? [];
    this.apply(actions, block!);

    block = this.trace.current();
    actions = block?.next(this) ?? [];
    this.apply(actions, block!);

    return this.trace.current();
  }

  reset() {
    // Dispatch an event to clear results in the UI
    this.output$.next({
      eventType: 'CLEAR_RESULTS',
      timestamp: new Date(),
      bag: {}
    });

    this.init();
  }
}
