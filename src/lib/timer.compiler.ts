import { WodRuntimeScript } from "./md-timer";
import { IRuntimeHandler, StatementBlock } from "./timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { SourceDisplayBlock } from "./SourceDisplayBlock";

export class WodCompiler {
  static compileCode(
    value: WodRuntimeScript | undefined
  ): RuntimeBlock[] {
    if (!value?.outcome || value.outcome.length === 0) {
      return [];
    }

    const getById = (id: number): StatementBlock =>
      value?.outcome?.find((block: StatementBlock) => {
        return block.id === id;
      }) as StatementBlock;

    const handler = {} as IRuntimeHandler;
    return value?.outcome?.map(
      (block: StatementBlock): RuntimeBlock =>
        new SourceDisplayBlock(block, handler, getById) as RuntimeBlock
    );
  }
}
