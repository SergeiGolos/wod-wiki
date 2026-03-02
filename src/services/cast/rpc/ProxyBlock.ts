import { IRuntimeBlock, BlockLifecycleOptions, IMemoryEntryShim } from '@/runtime/contracts/IRuntimeBlock';
import { IBlockContext } from '@/runtime/contracts/IBlockContext';
import { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
import { IRuntimeAction } from '@/runtime/contracts/IRuntimeAction';
import { IRuntimeBehavior } from '@/runtime/contracts/IRuntimeBehavior';
import { IMemoryLocation, MemoryTag } from '@/runtime/memory/MemoryLocation';
import { MemoryType, MemoryValueOf, TimerState } from '@/runtime/memory/MemoryTypes';
import { FragmentVisibility } from '@/runtime/memory/FragmentVisibility';
import { BlockKey } from '@/core/models/BlockKey';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { TimeSpan } from '@/runtime/models/TimeSpan';
import type { SerializedBlock } from './RpcMessages';

/**
 * Static (read-only) IMemoryLocation backed by a fixed fragment array.
 * Used by ProxyBlock to expose serialized display fragments as memory locations.
 */
class StaticMemoryLocation implements IMemoryLocation {
    constructor(
        readonly tag: MemoryTag,
        readonly fragments: ICodeFragment[],
    ) {}

    subscribe(_listener: (nv: ICodeFragment[], ov: ICodeFragment[]) => void): () => void {
        // Static — no updates after hydration; subscriber receives nothing new.
        return () => {};
    }

    update(_fragments: ICodeFragment[]): void {
        // No-op: proxy blocks are read-only
    }

    dispose(): void {
        // No-op: nothing to clean up
    }
}

/**
 * Stub IBlockContext for ProxyBlock — no real memory allocation.
 */
const PROXY_CONTEXT = {
    ownerId: 'proxy',
    exerciseId: '',
    references: [],
    allocate() { throw new Error('ProxyBlock does not support memory allocation'); },
    release() {},
} as unknown as IBlockContext;

/**
 * ProxyBlock — a lightweight, read-only IRuntimeBlock hydrated from a SerializedBlock.
 *
 * Used on the Chromecast receiver to represent blocks received over the RPC channel.
 * Exposes the same identity, label, fragment memory, and timer data that the
 * shared workbench components need for rendering, but all lifecycle methods
 * are no-ops (the real execution happens on the browser).
 */
export class ProxyBlock implements IRuntimeBlock {
    readonly key: BlockKey;
    readonly sourceIds: number[];
    readonly blockType: string;
    readonly label: string;
    readonly context: IBlockContext = PROXY_CONTEXT;
    readonly behaviors: readonly IRuntimeBehavior[] = [];
    readonly isComplete: boolean;
    readonly completionReason?: string;
    readonly executionTiming?: BlockLifecycleOptions;

    private displayLocations: StaticMemoryLocation[];
    private timerLocation: StaticMemoryLocation | null;
    /** TimerState built from the serialized timer — drives useStackTimers() */
    private timerState: TimerState | undefined;

    constructor(serialized: SerializedBlock) {
        this.key = new BlockKey(serialized.key);
        this.sourceIds = serialized.sourceIds;
        this.blockType = serialized.blockType;
        this.label = serialized.label;
        this.isComplete = serialized.isComplete;
        this.completionReason = serialized.completionReason;

        // Hydrate display fragment memory as static locations
        this.displayLocations = serialized.displayFragments.map(
            fragments => new StaticMemoryLocation('fragment:display', fragments),
        );

        // Hydrate timer state + static memory location
        if (serialized.timer) {
            const spans = serialized.timer.spans.map(s => new TimeSpan(s.started, s.ended));

            // Build the TimerState that useStackTimers / usePrimaryTimer expect
            this.timerState = {
                spans,
                direction: serialized.timer.direction,
                durationMs: serialized.timer.durationMs,
                label: serialized.timer.label ?? '',
                role: undefined,
            };

            // Store as a single fragment with .value = TimerState under 'time' tag
            // (matching what RuntimeBlock stores, so hooks using getMemoryByTag('time') work)
            const { FragmentType } = require('@/core/models/CodeFragment');
            const timerFragments: ICodeFragment[] = [
                {
                    type: 'timer',
                    fragmentType: FragmentType?.Duration ?? 'duration',
                    image: '',
                    origin: 'runtime' as any,
                    value: this.timerState,
                },
            ];
            this.timerLocation = new StaticMemoryLocation('time', timerFragments);
        } else {
            this.timerState = undefined;
            this.timerLocation = null;
        }
    }

    // ── Memory API ──────────────────────────────────────────────────────────

    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[] {
        if (visibility === 'display') return this.displayLocations;
        return [];
    }

    getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
        if (tag === 'fragment:display') return this.displayLocations;
        if (tag === 'time' && this.timerLocation) return [this.timerLocation];
        return [];
    }

    getAllMemory(): IMemoryLocation[] {
        const all: IMemoryLocation[] = [...this.displayLocations];
        if (this.timerLocation) all.push(this.timerLocation);
        return all;
    }

    pushMemory(_location: IMemoryLocation): void {
        // No-op: proxy blocks are read-only
    }

    // ── Lifecycle (no-ops) ──────────────────────────────────────────────────

    mount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }

    next(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }

    unmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }

    dispose(_runtime: IScriptRuntime): void {
        // No-op
    }

    markComplete(_reason?: string): void {
        // No-op
    }

    getBehavior<T extends IRuntimeBehavior>(_behaviorType: new (...args: any[]) => T): T | undefined {
        return undefined;
    }

    // ── Deprecated Memory API removed — use getMemoryByTag() instead ──────────
}
