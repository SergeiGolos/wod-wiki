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
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class CompoundBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(statement: StatementNode) {
    super("compound", statement.id, statement);
  }

  load(runtime: ITimerRuntime): IRuntimeAction[] {
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
    return [new SetButtonsAction(actions, "runtime")];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    return undefined;
  }
}
