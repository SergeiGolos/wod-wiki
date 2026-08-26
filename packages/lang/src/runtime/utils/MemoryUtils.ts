import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IMemoryReference } from '../contracts/IMemoryReference';
import { MemorySearchCriteria } from '../contracts/IRuntimeMemory';

/**
 * Searches for memory references across all blocks in the runtime stack.
 * This implements the "memory is handled by the block on the stacks" pattern.
 * 
 * @param runtime The script runtime to search
 * @param criteria Search criteria (type, ownerId, id, visibility)
 * @returns Array of matching memory references
 */
export function searchStackMemory(runtime: IScriptRuntime, criteria: Partial<MemorySearchCriteria>): IMemoryReference[] {
  const results: IMemoryReference[] = [];
  
  if (!runtime.stack || !runtime.stack.blocks) {
    return results;
  }

  for (const block of runtime.stack.blocks) {
    if (!block.context || !block.context.references) {
      continue;
    }

    const matches = block.context.references.filter(ref => {
      if (criteria.id !== undefined && criteria.id !== null && ref.id !== criteria.id) return false;
      if (criteria.ownerId !== undefined && criteria.ownerId !== null && ref.ownerId !== criteria.ownerId) return false;
      if (criteria.type !== undefined && criteria.type !== null && ref.type !== criteria.type) return false;
      if (criteria.visibility !== undefined && criteria.visibility !== null && ref.visibility !== criteria.visibility) return false;
      return true;
    });

    results.push(...matches);
  }

  return results;
}
