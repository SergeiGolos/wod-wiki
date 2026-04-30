import type { WodBlock } from '@/components/Editor/types';

/**
 * RuntimeController — stable object passed via context to let bridge components
 * trigger runtime lifecycle without storing React hook closures in Zustand.
 */
export interface RuntimeController {
  initialize(block: WodBlock): void;
  dispose(): void;
}
