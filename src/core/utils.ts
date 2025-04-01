import { StatementFragment, StatementNode } from "./timer.types";


/**
 * Helper function to extract a specific fragment type from a statement
 */
export function fragmentToPart(
  statement: StatementNode,
  type: string
): string | null {
  const fragment = statement.fragments?.find((f) => f.type === type);
  return fragment?.toPart() ?? null;
}

export function fragmentTo<T extends StatementFragment>(
  statement: StatementNode,
  type: string
): T | null {
  const fragment = statement.fragments.find((f) => f.type === type);
  return fragment as T;
}