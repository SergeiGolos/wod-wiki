/**
 * Primitive interfaces shared across the contracts layer.
 *
 * These primitives have no back-references into the broader contracts and
 * provide a stable foundation that breaks circular dependencies between the
 * core runtime interfaces.
 */
export type { IRuntimeActionable, IRuntimeActionLike } from './IRuntimeActionable';
export type { IBlockRef, IMemoryEntryShim } from './IBlockRef';
export type { BlockLifecycleOptions } from './IBlockLifecycle';
export type { IEventDispatchContext, IEventDispatchStack } from './IEventDispatchContext';
