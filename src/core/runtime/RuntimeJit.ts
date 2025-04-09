import {
  StatementNode,
  IRuntimeBlock,
  RuntimeTrace,
  IRuntimeLogger,
  IRuntimeAction,
  ITimerRuntime,
  RuntimeEvent,
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
import { WorkRestLogger } from "./logger/WorkRestLogger";
import { RepFragment } from "../fragments/RepFragment";
import { EffortFragment } from "../fragments/EffortFragment";
import { DistanceFragment, ResistanceFragment } from "../fragments/ResistanceFragment";
import { PlaySoundAction } from "./actions/PlaySoundAction";

/**
 * Base class for sound handlers
 */
abstract class BaseSoundHandler extends EventHandler {
  protected abstract soundType: 'start' | 'complete' | 'countdown' | 'tick';
  
  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PlaySoundAction(event, this.soundType)];
  }
}

/**
 * Handles start event sounds
 */
class StartSoundHandler extends BaseSoundHandler {
  protected eventType: string = "start";
  protected soundType: 'start' | 'complete' | 'countdown' | 'tick' = "start";
}

/**
 * Handles complete/end event sounds
 */
class CompleteSoundHandler extends EventHandler {
  protected eventType: string = "complete";
  protected soundType: 'start' | 'complete' | 'countdown' | 'tick' = "complete";
  
  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PlaySoundAction(event, this.soundType)];
  }
}

/**
 * Handles countdown event sounds
 */
class CountdownSoundHandler extends BaseSoundHandler {
  protected eventType: string = "countdown";
  protected soundType: 'start' | 'complete' | 'countdown' | 'tick' = "countdown";
}

/**
 * Handles tick event sounds for countdown (3,2,1)
 */
class TickCountdownSoundHandler extends EventHandler {
  protected eventType: string = "tick";
  protected soundType: 'start' | 'complete' | 'countdown' | 'tick' = "countdown";
  
  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Only play countdown sounds when timer hits 3, 2, or 1 seconds
    if (runtime.display?.primary?.seconds === 3 || 
        runtime.display?.primary?.seconds === 2 || 
        runtime.display?.primary?.seconds === 1) {
      return [new PlaySoundAction(event, this.soundType)];
    }
    return [];
  }
}

export class RuntimeJit {
  handlers: EventHandler[] = [
    new TickHandler(),
    new TotalTimeHandler(),
    new LabelCurrentEffortHandler(),
    new StartSoundHandler(),
    new CompleteSoundHandler(),
    new CountdownSoundHandler(),
    new TickCountdownSoundHandler(),
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
    const distance = fragmentsTo<DistanceFragment>(nodes, "distance");
    
    console.log("Fragments:", efforts, rounds, repetitions, resistance, distance);

    const currentIndex = trace.getTotal(nodes[0].id) ;
    const currentRep = repetitions[(currentIndex- 1) % repetitions.length] 

    let logger: IRuntimeLogger = new DefaultResultLogger(
      efforts,
      currentRep,
      resistance,
      distance  
    );
    if (repetitions && rounds) {
      logger = new WorkRestLogger(efforts, rounds, currentRep, resistance, distance);
    }

    return new RuntimeBlock(key.toString(), nodes, logger, this.handlers);
  }
}
