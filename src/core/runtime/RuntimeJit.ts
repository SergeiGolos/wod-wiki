import { StatementNode, IRuntimeBlock } from "../timer.types";
import { RuntimeStack } from "./RuntimeStack";

/**
 * Compiled runtime that manages workout statement nodes and their handlers
 *
 * This class is responsible for:
 * - Storing and indexing statement nodes
 * - Managing runtime handlers for each node
 * - Processing timer events and delegating to appropriate handlers
 */

export class RuntimeJit {
  compile(node: StatementNode, stack: RuntimeStack): IRuntimeBlock {
    throw new Error("Method not implemented.");
  }
}
