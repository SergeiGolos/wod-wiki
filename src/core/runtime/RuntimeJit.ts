import {
  StatementNode,
  IRuntimeBlock,
  RuntimeTrace,
  IRuntimeLogger,
} from "../timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { EventHandler } from "./EventHandler";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";
import {
  LabelCurrentEffortHandler,
  TotalTimeHandler,
} from "./handlers/TotalTimeHandler";
import { StopHandler } from "./handlers/StopHandler";
import { ResetHandler } from "./handlers/ResetHandler";
import { CompleteHandler } from "./handlers/CompleteHandler";
import { EndHandler } from "./handlers/EndHandler";
import { DefaultResultLogger } from "./logger/DefaultResultLogger";
import { fragmentsTo, fragmentsToMany } from "../utils";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { WorkRestLogger } from "./logger/WorkRestLogger";
import { RepFragment } from "../fragments/RepFragment";
import { EffortFragment } from "../fragments/EffortFragment";
import { ResistanceFragment } from "../fragments/ResistanceFragment";

export class RuntimeJit {
  handlers: EventHandler[] = [
    new TickHandler(),
    new TotalTimeHandler(),
    new LabelCurrentEffortHandler(),

    new StartHandler(),
    new StopHandler(),

    new CompleteHandler(),
    new ResetHandler(),
    new EndHandler(),
  ];

  compile(trace: RuntimeTrace, nodes: StatementNode[]): IRuntimeBlock {
    let key = trace.set(nodes);
    console.log("Compiling block:", key.toString());

    const efforts = fragmentsTo<EffortFragment>(nodes, "effort");
    const rounds = fragmentsTo<RoundsFragment>(nodes, "rounds");
    const repetitions = fragmentsToMany<RepFragment>(nodes, "rep");
    const resistance = fragmentsTo<ResistanceFragment>(nodes, "resistance");
    console.log(efforts, rounds, repetitions, resistance);

    const currentIndex = trace.getTotal(nodes[0].id) ;
    const currentRep = repetitions[(currentIndex- 1) % repetitions.length] 
    
    console.log("Rep / Round:", currentRep, currentIndex);
    console.log(efforts, rounds, repetitions, resistance);

    let logger: IRuntimeLogger = new DefaultResultLogger(
      efforts,
      currentRep,
      resistance
    );
    if (repetitions && rounds) {
      logger = new WorkRestLogger(efforts, rounds, currentRep, resistance);
    }

    return new RuntimeBlock(key.toString(), nodes, logger, this.handlers);
  }
}
