/**
 * Content-stable identity for a workout block.
 *
 * A 32-bit FNV-1a hash of the trimmed fenced content, formatted as `bc-<8 hex>`.
 * Survives clone / reorder / edit-above so results and facts keyed by it stay
 * linked across runs.
 */
export function blockContentId(content: string): string {
  const normalized = content.trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `bc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
