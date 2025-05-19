import { CodeFragment } from "./CodeFragment";

/**
 * Returns all fragments of a specific type from an array of StatementFragments
 * @param fragments Array of StatementFragment objects to filter
 * @param type The type of fragments to retrieve
 * @returns Array of fragments matching the specified type
 */

export function getFragments<T extends CodeFragment>(
  fragments: CodeFragment[],
  type: string
): T[] {
  return fragments?.filter((fragment) => fragment.type === type) as T[] ?? [];
}
