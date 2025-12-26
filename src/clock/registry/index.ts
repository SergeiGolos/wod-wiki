import { CardComponentRegistry } from './CardComponentRegistry';
import {
  IdleStartCard,
  IdleCompleteCard,
  ActiveBlockCard,
  RestPeriodCard,
} from '../cards/DefaultCards';

/**
 * Register all default card components with the registry.
 * 
 * Call this once during app initialization to set up the
 * built-in card types.
 * 
 * @example
 * ```tsx
 * // In your app initialization
 * import { registerDefaultCards } from '@/clock/registry';
 * 
 * registerDefaultCards();
 * ```
 */
export function registerDefaultCards(): void {
  CardComponentRegistry.register('idle-start', IdleStartCard);
  CardComponentRegistry.register('idle-complete', IdleCompleteCard);
  CardComponentRegistry.register('active-block', ActiveBlockCard);
  CardComponentRegistry.register('rest-period', RestPeriodCard);
}

export { CardComponentRegistry } from './CardComponentRegistry';
export type { CardComponentProps, CardComponent } from './CardComponentRegistry';
