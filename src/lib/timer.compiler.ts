import { WodRuntimeScript } from "./md-timer";
import { IRuntimeHandler, StatementBlock } from "./timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { SourceDisplayBlock } from "./SourceDisplayBlock";
import { TimerRuntime } from "./timer.runtime";

export class WodCompiler {
  static compileCode(
    value: WodRuntimeScript | undefined
  ): TimerRuntime {
    const steps = [] as RuntimeBlock[];
    if (!value?.outcome || value.outcome.length === 0) {
      return new TimerRuntime(steps);
    }
    
    const handler = {} as IRuntimeHandler;
    const lookup = {} as { [key: number]: RuntimeBlock };    
    const getById = (id: number): StatementBlock => lookup[id].block as StatementBlock;

    for (const block of value.outcome) {
      const runtimeBlock = new SourceDisplayBlock(
        block,
        handler,
        getById
      );

      lookup[block.id] = runtimeBlock;
      steps.push(runtimeBlock);
    }

    return new TimerRuntime(steps);
  }
}
