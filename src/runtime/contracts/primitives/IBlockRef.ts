import type { BlockKey } from '../../../core/models/BlockKey';
import type { IBlockContext } from '../IBlockContext';
import type { IMemoryLocation, MemoryTag } from '../../memory/MemoryLocation';
import type { MemoryType, MemoryValueOf } from '../../memory/MemoryTypes';
import type { MetricVisibility } from '../../memory/MetricVisibility';

/**
 * Backward-compatible memory entry shape exposed by {@link IBlockRef.getMemory}.
 *
 * Mirrors the legacy shim type historically defined on `IRuntimeBlock`. Lives
 * in the primitives layer because both `IBlockRef` (consumer) and
 * `IRuntimeBlock` (producer) reference it.
 */
export interface IMemoryEntryShim<V = unknown> {
    readonly value: V;
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void;
}

/**
 * Minimal block reference primitive consumed by {@link IBehaviorContext}.
 *
 * `IRuntimeBlock` extends this primitive with runtime-side lifecycle methods
 * (`mount`, `next`, `unmount`, `dispose`). Defining the consumer-facing
 * surface here lets `IBehaviorContext` reference a block without importing
 * `IRuntimeBlock`, which in turn breaks the cycle:
 *
 *   IBehaviorContext → IRuntimeBlock → IRuntimeBehavior → IBehaviorContext
 *
 * The shape includes the full surface that behavior implementations use
 * through `ctx.block.*`, but intentionally avoids importing
 * `IRuntimeBehavior` (which depends on `IBehaviorContext`). The `behaviors`
 * array is therefore typed as opaque objects here and refined to
 * `readonly IRuntimeBehavior[]` on `IRuntimeBlock` itself.
 */
export interface IBlockRef {
    /** Unique identifier for this block instance. */
    readonly key: BlockKey;

    /** Source code location identifiers. */
    readonly sourceIds: number[];

    /** Type discriminator for UI display and logging. */
    readonly blockType?: string;

    /** Human-readable label for the block. */
    readonly label: string;

    /** The execution context for this block (memory allocation/cleanup). */
    readonly context: IBlockContext;

    /** Whether this block has completed execution. */
    readonly isComplete: boolean;

    /** Reason the block completed, if any. */
    readonly completionReason?: string;

    /**
     * Read-only view of the behaviors attached to the block.
     *
     * Intentionally typed as opaque objects in the primitive layer to avoid
     * importing `IRuntimeBehavior` (which would re-introduce a cycle through
     * `IBehaviorContext`). `IRuntimeBlock` refines this to
     * `readonly IRuntimeBehavior[]`.
     */
    readonly behaviors: ReadonlyArray<{ readonly constructor: Function }>;

    /** Push a memory location onto the block's memory list. */
    pushMemory(location: IMemoryLocation): void;

    /** Get all memory locations matching the given tag. */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];

    /** Get all memory locations owned by this block. */
    getAllMemory(): IMemoryLocation[];

    /** Get all metrics memory locations matching a given visibility tier. */
    getMetricMemoryByVisibility(visibility: MetricVisibility): IMemoryLocation[];

    /** Mark the block as complete (idempotent). */
    markComplete(reason?: string): void;

    // ============================================================================
    // Backward-Compatible Memory API (shims over list-based memory)
    // ============================================================================

    /** @deprecated Use {@link getMemoryByTag} instead. */
    getMemory<T extends MemoryType>(type: T): IMemoryEntryShim<MemoryValueOf<T>> | undefined;

    /** @deprecated Use `getMemoryByTag(tag).length > 0` instead. */
    hasMemory(type: MemoryType): boolean;

    /** @deprecated Use {@link pushMemory} or the `BehaviorContext` API instead. */
    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
}
