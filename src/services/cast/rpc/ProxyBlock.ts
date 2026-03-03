import { IRuntimeBlock, BlockLifecycleOptions, IMemoryEntryShim } from '@/runtime/contracts/IRuntimeBlock';
import { IBlockContext } from '@/runtime/contracts/IBlockContext';
import { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
import { IRuntimeAction } from '@/runtime/contracts/IRuntimeAction';
import { IRuntimeBehavior } from '@/runtime/contracts/IRuntimeBehavior';
import { IMemoryLocation, MemoryTag } from '@/runtime/memory/MemoryLocation';
import { MemoryType, MemoryValueOf, TimerState } from '@/runtime/memory/MemoryTypes';
import { FragmentVisibility } from '@/runtime/memory/FragmentVisibility';
import { BlockKey } from '@/core/models/BlockKey';
import { ICodeFragment, FragmentType } from '@/core/models/CodeFragment';
import { TimeSpan } from '@/runtime/models/TimeSpan';
import type { SerializedBlock } from './RpcMessages';

// ── ReactiveMemoryLocation ──────────────────────────────────────────────────

/**
 * A live IMemoryLocation backed by a mutable fragment array.
 *
 * Unlike the old StaticMemoryLocation (no-op subscribe), this implementation
 * fires all registered listeners whenever `update()` is called. This allows
 * hooks like useTimerElapsed(), useStackTimers(), and useNextPreview() to stay
 * reactive across RPC updates without losing subscriptions when a new RPC
 * stack message arrives for the same block.
 */
export class ReactiveMemoryLocation implements IMemoryLocation {
    private _fragments: ICodeFragment[];
    private listeners = new Set<(nv: ICodeFragment[], ov: ICodeFragment[]) => void>();

    constructor(
        readonly tag: MemoryTag,
        fragments: ICodeFragment[],
    ) {
        this._fragments = fragments;
    }

    get fragments(): ICodeFragment[] { return this._fragments; }

    subscribe(listener: (nv: ICodeFragment[], ov: ICodeFragment[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Replace the stored fragments and notify all subscribers.
     * Called by ProxyBlock.update() when a new RPC snapshot arrives for this block.
     */
    update(fragments: ICodeFragment[]): void {
        const old = this._fragments;
        this._fragments = fragments;
        for (const listener of this.listeners) {
            listener(fragments, old);
        }
    }

    dispose(): void {
        this.listeners.clear();
    }
}

// ── StubBehavior ────────────────────────────────────────────────────────────

/**
 * Name-only stub for IRuntimeBehavior.
 * Used by ProxyBlock.behaviors to expose behavior class names for debug inspection
 * (BlockDebugDialog Behaviors tab) without any real execution logic.
 */
class StubBehavior implements IRuntimeBehavior {
    constructor(readonly name: string) {}

    onMount(): IRuntimeAction[] { return []; }
    onNext(): IRuntimeAction[] { return []; }
    onUnmount(): IRuntimeAction[] { return []; }
    onDispose(): void {}
}

// ── PROXY_CONTEXT ────────────────────────────────────────────────────────────

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

// ── ProxyBlock ───────────────────────────────────────────────────────────────

/**
 * ProxyBlock — a reactive, read-only IRuntimeBlock hydrated from a SerializedBlock.
 *
 * Used on the Chromecast receiver to represent blocks received over the RPC channel.
 * Exposes the same identity, fragment memory (all visibility tiers), timer data, and
 * behavior metadata that shared workbench components need for rendering.
 *
 * ### Reactivity
 * Memory locations are `ReactiveMemoryLocation` instances — they support real
 * `subscribe()` calls. When a new RPC snapshot arrives, `ChromecastProxyRuntime`
 * calls `update()` instead of creating a new ProxyBlock, so existing subscribers
 * (e.g. timer hooks) receive the updated data without re-subscribing.
 *
 * ### Fragment tiers
 * ProxyBlock exposes all four visibility tiers: display, promote, result, private.
 * This gives the receiver parity with the browser for debug inspection and any
 * feature that reads promote/private memory (e.g., metric inheritance display).
 */
export class ProxyBlock implements IRuntimeBlock {
    readonly key: BlockKey;
    readonly sourceIds: number[];
    readonly blockType: string;
    readonly label: string;
    readonly context: IBlockContext = PROXY_CONTEXT;
    readonly executionTiming?: BlockLifecycleOptions;

    // Mutable — updated in-place by update()
    isComplete: boolean;
    completionReason?: string;

    // Behaviors — name-only stubs built from behaviorsMetadata
    behaviors: readonly IRuntimeBehavior[];

    // ── Fragment tier locations ──────────────────────────────────────────────
    private displayLocations: ReactiveMemoryLocation[];
    private promoteLocations: ReactiveMemoryLocation[];
    private resultLocations: ReactiveMemoryLocation[];
    /** Map<tag, ReactiveMemoryLocation[]> for private-tier fragments */
    private privateLocationMap: Map<MemoryTag, ReactiveMemoryLocation[]>;

    // ── Timer ────────────────────────────────────────────────────────────────
    private timerLocation: ReactiveMemoryLocation | null;

    // ── Next preview ─────────────────────────────────────────────────────────
    private nextLocation: ReactiveMemoryLocation | null;

    constructor(serialized: SerializedBlock) {
        this.key = new BlockKey(serialized.key);
        this.sourceIds = serialized.sourceIds;
        this.blockType = serialized.blockType;
        this.label = serialized.label;
        this.isComplete = serialized.isComplete;
        this.completionReason = serialized.completionReason;

        // Hydrate behaviors (name-only stubs)
        this.behaviors = this.buildBehaviors(serialized);

        // Hydrate fragment tiers
        this.displayLocations = this.buildLocations(serialized.displayFragments, 'fragment:display');
        this.promoteLocations = this.buildLocations(serialized.promoteFragments ?? [], 'fragment:promote');
        this.resultLocations  = this.buildLocations(serialized.resultFragments ?? [], 'fragment:result');
        this.privateLocationMap = this.buildPrivateMap(serialized.privateFragments ?? {});

        // Hydrate timer
        this.timerLocation = serialized.timer ? this.buildTimerLocation(serialized.timer) : null;

        // Hydrate next-preview
        const nextFrags = serialized.nextFragments ?? [];
        this.nextLocation = nextFrags.length > 0
            ? new ReactiveMemoryLocation('fragment:next', nextFrags)
            : null;
    }

    // ── Public: in-place update ──────────────────────────────────────────────

    /**
     * Update this ProxyBlock's state from a new SerializedBlock snapshot.
     * All reactive memory locations are updated in-place, firing their subscribers
     * so components re-render without losing their subscriptions.
     *
     * Called by ChromecastProxyRuntime when a new rpc-stack-update arrives for
     * a block that is already in the proxy stack cache.
     */
    update(serialized: SerializedBlock): void {
        // Mutable identity fields
        (this as any).isComplete = serialized.isComplete;
        (this as any).completionReason = serialized.completionReason;

        // Rebuild behaviors if metadata changed
        (this as any).behaviors = this.buildBehaviors(serialized);

        // Sync all fragment tiers in-place
        this.syncLocations(this.displayLocations, serialized.displayFragments, 'fragment:display');
        this.syncLocations(this.promoteLocations, serialized.promoteFragments ?? [], 'fragment:promote');
        this.syncLocations(this.resultLocations,  serialized.resultFragments ?? [], 'fragment:result');
        this.syncPrivateMap(serialized.privateFragments ?? {});

        // Update timer
        if (serialized.timer) {
            const timerFragments = this.buildTimerFragments(serialized.timer);
            if (this.timerLocation) {
                this.timerLocation.update(timerFragments);
            } else {
                this.timerLocation = new ReactiveMemoryLocation('time', timerFragments);
            }
        } else {
            if (this.timerLocation) {
                this.timerLocation.dispose();
                this.timerLocation = null;
            }
        }

        // Update next-preview
        const nextFrags = serialized.nextFragments ?? [];
        if (nextFrags.length > 0) {
            if (this.nextLocation) {
                this.nextLocation.update(nextFrags);
            } else {
                this.nextLocation = new ReactiveMemoryLocation('fragment:next', nextFrags);
            }
        } else if (this.nextLocation) {
            this.nextLocation.dispose();
            this.nextLocation = null;
        }
    }

    // ── Memory API ──────────────────────────────────────────────────────────

    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[] {
        switch (visibility) {
            case 'display': return this.displayLocations;
            case 'promote': return this.promoteLocations;
            case 'result':  return this.resultLocations;
            case 'private': {
                // Flatten all private-tier locations across all tags
                const all: ReactiveMemoryLocation[] = [];
                for (const locs of this.privateLocationMap.values()) {
                    all.push(...locs);
                }
                return all;
            }
            default: return [];
        }
    }

    getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
        switch (tag) {
            case 'fragment:display':  return this.displayLocations;
            case 'fragment:promote':  return this.promoteLocations;
            case 'fragment:result':   return this.resultLocations;
            case 'time':              return this.timerLocation ? [this.timerLocation] : [];
            case 'fragment:next':     return this.nextLocation ? [this.nextLocation] : [];
            default:
                return this.privateLocationMap.get(tag) ?? [];
        }
    }

    getAllMemory(): IMemoryLocation[] {
        const all: IMemoryLocation[] = [
            ...this.displayLocations,
            ...this.promoteLocations,
            ...this.resultLocations,
        ];
        for (const locs of this.privateLocationMap.values()) {
            all.push(...locs);
        }
        if (this.timerLocation) all.push(this.timerLocation);
        if (this.nextLocation)  all.push(this.nextLocation);
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
        // Clean up all reactive memory locations
        for (const loc of this.displayLocations)  loc.dispose();
        for (const loc of this.promoteLocations)  loc.dispose();
        for (const loc of this.resultLocations)   loc.dispose();
        for (const locs of this.privateLocationMap.values()) {
            for (const loc of locs) loc.dispose();
        }
        this.timerLocation?.dispose();
        this.nextLocation?.dispose();
    }

    markComplete(_reason?: string): void {
        // No-op: completion is driven by the browser runtime
    }

    getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
        return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private buildBehaviors(serialized: SerializedBlock): readonly IRuntimeBehavior[] {
        if (!serialized.behaviorsMetadata || serialized.behaviorsMetadata.length === 0) {
            return [];
        }
        return serialized.behaviorsMetadata.map(meta => new StubBehavior(meta.name));
    }

    private buildLocations(fragmentGroups: ICodeFragment[][], tag: MemoryTag): ReactiveMemoryLocation[] {
        return fragmentGroups.map(fragments => new ReactiveMemoryLocation(tag, fragments));
    }

    private buildPrivateMap(privateFragments: Record<string, ICodeFragment[][]>): Map<MemoryTag, ReactiveMemoryLocation[]> {
        const map = new Map<MemoryTag, ReactiveMemoryLocation[]>();
        for (const [tag, fragmentGroups] of Object.entries(privateFragments)) {
            map.set(tag as MemoryTag, fragmentGroups.map(
                fragments => new ReactiveMemoryLocation(tag as MemoryTag, fragments)
            ));
        }
        return map;
    }

    private buildTimerFragments(timer: NonNullable<SerializedBlock['timer']>): ICodeFragment[] {
        const spans = timer.spans.map(s => new TimeSpan(s.started, s.ended));
        const timerState: TimerState = {
            spans,
            direction: timer.direction,
            durationMs: timer.durationMs,
            label: timer.label ?? '',
            role: timer.role,
        };
        return [{
            type: 'time',
            fragmentType: FragmentType.Time,
            image: '',
            origin: 'runtime' as any,
            value: timerState,
        }];
    }

    private buildTimerLocation(timer: NonNullable<SerializedBlock['timer']>): ReactiveMemoryLocation {
        return new ReactiveMemoryLocation('time', this.buildTimerFragments(timer));
    }

    /**
     * Sync a list of reactive locations with new fragment data, growing or shrinking
     * the list as needed without losing existing subscriber connections.
     */
    private syncLocations(
        locations: ReactiveMemoryLocation[],
        newGroups: ICodeFragment[][],
        tag: MemoryTag,
    ): void {
        // Grow if needed
        while (locations.length < newGroups.length) {
            locations.push(new ReactiveMemoryLocation(tag, []));
        }
        // Shrink if needed — dispose removed locations
        while (locations.length > newGroups.length) {
            locations.pop()!.dispose();
        }
        // Update all in-place
        for (let i = 0; i < newGroups.length; i++) {
            locations[i].update(newGroups[i]);
        }
    }

    /**
     * Sync the private location map from a new privateFragments record.
     */
    private syncPrivateMap(newPrivate: Record<string, ICodeFragment[][]>): void {
        const newTags = new Set(Object.keys(newPrivate) as MemoryTag[]);

        // Update / add tags
        for (const [tag, fragmentGroups] of Object.entries(newPrivate)) {
            const existing = this.privateLocationMap.get(tag as MemoryTag);
            if (existing) {
                this.syncLocations(existing, fragmentGroups, tag as MemoryTag);
            } else {
                this.privateLocationMap.set(
                    tag as MemoryTag,
                    fragmentGroups.map(f => new ReactiveMemoryLocation(tag as MemoryTag, f))
                );
            }
        }

        // Remove tags no longer present
        for (const tag of this.privateLocationMap.keys()) {
            if (!newTags.has(tag)) {
                const locs = this.privateLocationMap.get(tag)!;
                for (const loc of locs) loc.dispose();
                this.privateLocationMap.delete(tag);
            }
        }
    }
}
