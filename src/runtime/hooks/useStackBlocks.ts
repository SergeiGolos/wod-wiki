/**
 * @deprecated Use useSnapshotBlocks() instead (from src/runtime/hooks/useStackSnapshot.ts).
 * 
 * This module has been consolidated into useStackSnapshot.ts.
 * Re-exporting for backward compatibility during migration.
 * 
 * Old: useStackBlocks() → readonly IRuntimeBlock[]
 * New: useSnapshotBlocks() → readonly IRuntimeBlock[]
 * 
 * The new version provides additional metadata (type, clockTime) via StackSnapshot.
 */

export { useSnapshotBlocks as useStackBlocks, useSnapshotCurrentBlock as useCurrentBlock } from './useStackSnapshot';
