import type { ScriptBlock } from '../types';

/**
 * RuntimeController — stable object passed via context to let bridge components
 * trigger runtime lifecycle without storing React hook closures in Zustand.
 */
export interface RuntimeController {
  initialize(block: ScriptBlock): void;
  dispose(): void;
}
