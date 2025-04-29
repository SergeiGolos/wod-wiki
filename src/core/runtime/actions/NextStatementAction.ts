import {
  IRuntimeAction,
  ITimerRuntime,
  IRuntimeEvent,
  OutputEvent,
} from "@/core/timer.types";
import { Subject } from "rxjs";

export class GotoEndAction implements IRuntimeAction {
  name: string = "End";
  apply(runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>) : IRuntimeEvent[] {    
    runtime.goto
    
    return [];
  }
}


export class GotoStatementAction implements IRuntimeAction {
  constructor(public blockId: number) {}
  name: string = "goto";
  apply(runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>) : IRuntimeEvent[] {
       
    // TODO this should be in the trace object.
    const blocks = runtime.script.nodes;
    let current = runtime.current?.stack?.[0];

    let blockId: number | undefined;
    const round = runtime.trace!.get(current?.id ?? -1) + 1;

    if (current?.rounds == 0 && round > current?.rounds) {
      blockId = current?.parent ?? current?.next;
    } else {
      blockId = current?.id;
    }

    const nextBlock = blocks.find((block) => block.id == blockId);
    const leaf = runtime.jit.compile(runtime, [nextBlock!], runtime.trace);
    console.log("Next Action Leaf:", leaf);
    return leaf && leaf.type !== "idle" && leaf.type !== "complete"
      ? [{ name: "start", timestamp: new Date() }]
      : [{ name: "end", timestamp: new Date() }];
  }
}
