import { StatementFragment, StatementNode } from "./timer.types";

export const cn = (...args: string[]) => args.filter(Boolean).join(' ');

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

export function fragmentsTo<T extends StatementFragment>(
  statements: StatementNode[],
  type: string
): T | null {
  for (let statement of statements){ 
    const fragment = statement.fragments.find((f) => f.type === type);
    if  (fragment) {
      return fragment as T;
    }
  }
  return null;
}

export function fragmentTo<T extends StatementFragment>(
  statement: StatementNode,
  type: string
): T | null {
  const fragment = statement.fragments.find((f) => f.type === type);
  return fragment as T;
}