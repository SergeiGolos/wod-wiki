import { RuntimeStack } from "../RuntimeStack";
import { StatementNode, IRuntimeAction } from "../../runtime/types";

export interface ICompilerStrategy {
  apply(stack: StatementNode[], runtime: RuntimeStack): IRuntimeAction[];
}

export class CompoundStrategy implements ICompilerStrategy {
  constructor(private strategies: ICompilerStrategy[]) {}

  apply(stack: StatementNode[], runtime: RuntimeStack): IRuntimeAction[] {
    for (let strategy of this.strategies) {
      const result = strategy.apply(stack, runtime);
      if (result && result.length > 0) {
        return result;
      }
    }
    // Create a default empty action array if no strategy applies
    return [];
  }
}
