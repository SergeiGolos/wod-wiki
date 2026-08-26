/**
 * Re-exports note persistence types for use by UI components.
 * Components should import from here rather than directly from @/services/persistence
 * to maintain the components → lib → services dependency direction.
 */
export type { INotePersistence } from '@/services/persistence';
