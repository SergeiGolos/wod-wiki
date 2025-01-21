import { IRuntimeAction } from "../IRuntimeAction";
import { RuntimeBlock } from "../RuntimeBlock";
import { TimerRuntime } from "../timer.runtime";


export class NextChildStatementAction implements IRuntimeAction {
  constructor(public sourceId: number) { }

  apply(blocks: TimerRuntime): [RuntimeBlock | undefined, number] {
    const [block, index] = blocks.current;
    block?.block.parents.forEach(parent => {
      console.log(parent);
    });
    return blocks.current;
  }
}
