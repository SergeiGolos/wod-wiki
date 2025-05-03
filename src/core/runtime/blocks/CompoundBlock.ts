import {
  IActionButton,
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { fragmentsTo } from "@/core/utils";
import { ActionFragment } from "@/core/fragments/ActionFragment";

export class CompoundBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(statement: StatementNode) {
    super("compound", statement.id, statement);
  }

  visit(runtime: ITimerRuntime): IRuntimeAction[] {
    
    
    const children =
      this.source?.children.map((n) => runtime.script.getId(n)) ?? [];

    const actions: IActionButton[] = [];
    for (const child of children) {
      const action = fragmentsTo<ActionFragment>(child, "action");
      if (action) {
        actions.push({
          label: action.action,
          event: action.action,
        });
      }
    }
    return [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  next(): StatementNode | undefined {
    return undefined;
  }
}
