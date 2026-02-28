import { BlockKey } from '../../core/models/BlockKey';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock, IMemoryEntryShim } from '../contracts/IRuntimeBlock';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IBlockContext } from '../contracts/IBlockContext';
import { BlockContext } from '../BlockContext';
import { IMemoryLocation, MemoryLocation, MemoryTag } from '../memory/MemoryLocation';
import { MemoryType, MemoryValueOf } from '../memory/MemoryTypes';
import { FragmentVisibility, getFragmentVisibility } from '../memory/FragmentVisibility';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { FragmentBucket } from './FragmentBucket';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { OutputStatement } from '../../core/models/OutputStatement';
import { TimeSpan } from '../models/TimeSpan';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IEventHandler } from '../contracts/events/IEventHandler';
import { IEvent } from '../contracts/events/IEvent';
import { HandlerScope } from '../contracts/events/IEventBus';

export interface TypedBlockConfig {
    sourceIds?: number[];
    blockType: string;
    label?: string;
    planFragments?: ICodeFragment[];
}

/**
 * Abstract base class for typed blocks in the hybrid architecture.
 *
 * TypedBlock implements IRuntimeBlock without behavior delegation.
 * Subclasses implement onMount/onNext/onUnmount directly, owning
 * their lifecycle and completion policy.
 *
 * State is stored in a FragmentBucket (observable collection).
 * Memory locations are maintained for backward compatibility.
 */
export abstract class TypedBlock implements IRuntimeBlock {
    // Identity
    readonly key: BlockKey;
    readonly sourceIds: number[];
    readonly blockType: string;
    readonly context: IBlockContext;

    // Fragment-centric state
    readonly fragments: FragmentBucket;

    // Memory (backward compat)
    private _memory: IMemoryLocation[] = [];

    // Completion state
    private _isComplete = false;
    private _completionReason?: string;

    // Execution timing
    public executionTiming: BlockLifecycleOptions = {};

    // Runtime reference (set during mount)
    protected _runtime?: IScriptRuntime;
    protected _clock?: IRuntimeClock;

    // Event unsubscribers
    private _eventUnsubscribers: Array<() => void> = [];

    constructor(
        runtime: IScriptRuntime,
        config: TypedBlockConfig
    ) {
        this._runtime = runtime;
        this.key = new BlockKey(config.blockType.toLowerCase());
        this.sourceIds = config.sourceIds ?? [];
        this.blockType = config.blockType;
        this.context = new BlockContext(runtime, this.key.toString(), config.blockType);

        // Initialize fragment bucket with plan fragments
        this.fragments = new FragmentBucket(config.planFragments ?? []);

        // Store label in memory + fragments
        if (config.label) {
            const labelFragment: ICodeFragment = {
                fragmentType: FragmentType.Label,
                type: 'label',
                image: config.label,
                origin: 'compiler',
                value: config.label,
            };
            this._memory.push(new MemoryLocation('fragment:label', [labelFragment]));
            this.fragments.add(labelFragment);
        }
    }

    // ========================================================================
    // Label (computed from fragments)
    // ========================================================================

    get label(): string {
        const labelFrag = this.fragments.firstOfType(FragmentType.Label);
        if (labelFrag) {
            return labelFrag.image || (labelFrag.value as string) || this.blockType;
        }
        return this.blockType;
    }

    // ========================================================================
    // Behaviors (empty — typed blocks don't use the behavior system)
    // ========================================================================

    get behaviors(): readonly IRuntimeBehavior[] {
        return [];
    }

    getBehavior<T extends IRuntimeBehavior>(_type: new (...args: unknown[]) => T): T | undefined {
        return undefined;
    }

    // ========================================================================
    // Completion
    // ========================================================================

    get isComplete(): boolean {
        return this._isComplete;
    }

    get completionReason(): string | undefined {
        return this._completionReason;
    }

    markComplete(reason?: string): void {
        if (this._isComplete) return; // idempotent
        this._isComplete = true;
        this._completionReason = reason;
    }

    // ========================================================================
    // IRuntimeBlock Lifecycle (delegates to abstract methods)
    // ========================================================================

    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this._runtime = runtime;
        this._clock = options?.clock ?? runtime.clock;
        this.executionTiming.startTime = options?.startTime ?? this._clock.now;

        return this.onMount(runtime, options);
    }

    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this._clock = options?.clock ?? this._clock ?? runtime.clock;

        // Emit system output for debugging
        this.emitSystemOutput(runtime, 'next');

        const actions = this.onNext(runtime, options);

        // Auto-pop if marked complete during this call
        if (this._isComplete && !actions.some(a => a.type === 'pop-block')) {
            actions.push(new PopBlockAction());
        }

        return actions;
    }

    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this._clock = options?.clock ?? this._clock ?? runtime.clock;
        this.executionTiming.completedAt = options?.completedAt ?? this._clock.now;

        const actions = this.onUnmount(runtime, options);

        // Clean up event subscriptions
        for (const unsub of this._eventUnsubscribers) {
            try { unsub(); } catch { /* ignore cleanup errors */ }
        }
        this._eventUnsubscribers = [];

        return actions;
    }

    dispose(runtime: IScriptRuntime): void {
        this.onDispose(runtime);

        // Dispose memory locations
        for (const loc of this._memory) {
            loc.dispose();
        }
        this._memory = [];

        // Dispose fragment bucket
        this.fragments.dispose();

        // Release context
        this.context.release();
    }

    // ========================================================================
    // Abstract lifecycle methods for subclasses
    // ========================================================================

    protected abstract onMount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];
    protected abstract onNext(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];
    protected abstract onUnmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /** Override for custom cleanup. Called before memory/fragment disposal. */
    protected onDispose(_runtime: IScriptRuntime): void {
        // Default: no-op
    }

    // ========================================================================
    // Event Subscription Helper
    // ========================================================================

    /**
     * Register an event handler on the runtime's event bus.
     * Automatically unsubscribes on unmount.
     */
    protected registerHandler(
        runtime: IScriptRuntime,
        eventName: string,
        handler: (event: IEvent, runtime: IScriptRuntime) => IRuntimeAction[],
        scope: HandlerScope = 'active'
    ): void {
        const eventHandler: IEventHandler = {
            id: `${this.key.toString()}-${eventName}-${Date.now()}`,
            name: `${this.blockType}:${eventName}`,
            handler,
        };
        const unsub = runtime.eventBus.register(
            eventName,
            eventHandler,
            this.key.toString(),
            { scope }
        );
        this._eventUnsubscribers.push(unsub);
    }

    // ========================================================================
    // Memory API (backward compat with IRuntimeBlock)
    // ========================================================================

    pushMemory(location: IMemoryLocation): void {
        this._memory.push(location);
    }

    getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
        return this._memory.filter(loc => loc.tag === tag);
    }

    getAllMemory(): IMemoryLocation[] {
        return [...this._memory];
    }

    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[] {
        return this._memory.filter(loc => getFragmentVisibility(loc.tag) === visibility);
    }

    getMemory<T extends MemoryType>(type: T): IMemoryEntryShim<MemoryValueOf<T>> | undefined {
        const tag = type as string as MemoryTag;
        const locations = this._memory.filter(loc => loc.tag === tag);
        if (locations.length === 0) return undefined;
        const loc = locations[0];
        return {
            get value(): MemoryValueOf<T> {
                if (loc.fragments.length === 0) return undefined as unknown as MemoryValueOf<T>;
                if (type === 'fragment') return { groups: loc.fragments } as unknown as MemoryValueOf<T>;
                if (type === 'fragment:display') return loc as unknown as MemoryValueOf<T>;
                return loc.fragments[0]?.value as MemoryValueOf<T>;
            },
            subscribe(listener: (nv: MemoryValueOf<T> | undefined, ov: MemoryValueOf<T> | undefined) => void): () => void {
                return loc.subscribe((newFrags, oldFrags) => {
                    const nv = newFrags.length > 0 ? newFrags[0]?.value as MemoryValueOf<T> : undefined;
                    const ov = oldFrags.length > 0 ? oldFrags[0]?.value as MemoryValueOf<T> : undefined;
                    listener(nv, ov);
                });
            }
        };
    }

    hasMemory(type: MemoryType): boolean {
        const tag = type as string as MemoryTag;
        return this._memory.some(loc => loc.tag === tag);
    }

    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        const tag = type as string as MemoryTag;
        const locations = this._memory.filter(loc => loc.tag === tag);
        if (locations.length > 0) {
            const loc = locations[0];
            if (loc.fragments.length > 0) {
                const updated = loc.fragments.map((f, i) => i === 0 ? { ...f, value } : f);
                loc.update(updated);
            } else {
                loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as unknown as ICodeFragment]);
            }
        } else {
            const location = new MemoryLocation(tag, [
                { fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as unknown as ICodeFragment
            ]);
            this._memory.push(location);
        }
    }

    // ========================================================================
    // System output helper
    // ========================================================================

    private emitSystemOutput(runtime: IScriptRuntime, event: string): void {
        const now = this._clock?.now ?? new Date();
        const fragment: ICodeFragment = {
            fragmentType: FragmentType.System,
            type: 'lifecycle',
            image: `${event}: ${this.label} [${this.key.toString().slice(0, 8)}]`,
            value: { event, blockKey: this.key.toString(), blockLabel: this.label },
            origin: 'runtime',
            timestamp: now,
        };
        runtime.addOutput(new OutputStatement({
            outputType: 'system',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: this.key.toString(),
            stackLevel: runtime.stack.count,
            fragments: [fragment],
        }));
    }
}
