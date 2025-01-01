import { WodRuntimeScript } from "./md-timer";
import { DisplayBlock, SourceDisplayBlock, StatementBlock } from "./timer.types";

export class WodCompiler {
  static compileCode(
    value: WodRuntimeScript | undefined
  ): DisplayBlock[] {
    if (!value?.outcome || value.outcome.length === 0) {
      return [];
    }

    const getById = (id: number): StatementBlock =>
      value?.outcome?.find((block: StatementBlock) => {
        return block.id === id;
      }) as StatementBlock;

    return value?.outcome?.map(
      (block: StatementBlock): DisplayBlock =>
        new SourceDisplayBlock(block, getById) as DisplayBlock
    );
  }
}
