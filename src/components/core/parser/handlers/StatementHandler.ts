import { IRuntimeBlock } from "../../runtime/timer.runtime";
import { StatementNode } from "../../runtime/types";

/**
 * Interface for statement handlers that evaluate if they can process a node
 * and create appropriate runtime handlers for that node type.
 * 
 * Following Single Responsibility Principle, this separates the concern of
 * determining if a handler can process a node from the actual runtime handling logic.
 */
export interface IStatementHandler {
  /**
   * Creates a runtime handler for the given statement node
   * @param node The statement node to create a handler for
   * @returns A runtime handler appropriate for the node
   */
  build(block: IRuntimeBlock, node: StatementNode):  IRuntimeBlock
}
