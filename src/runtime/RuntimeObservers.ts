/**
 * RuntimeObservers — the shared observer collaborator for IScriptRuntime adapters.
 *
 * Owns the **subscriber side** of two reactive seams:
 *   - stack snapshots (via `IScriptRuntime.subscribeToStack`)
 *   - tracker updates (via `IScriptRuntime.subscribeToTracker`)
 *
 * Both `ScriptRuntime` and `ChromecastProxyRuntime` compose one of these
 * (see Finding 03: `docs/findings/03-script-runtime-god-interface.md`).
 *
 * ## Post-mount contract
 *
 * Stack snapshots emitted via `emitStack` reflect **post-mount state** —
 * the calling adapter is responsible for invoking `emitStack` only with
 * snapshots taken from a stack where every visible block has completed
 * `onMount`. `ScriptRuntime` enforces this by calling `emitStack` from
 * two points only:
 *
 *   1. The bridge from `IRuntimeStack` push/pop events (post-mount because
 *      `RuntimeStack.push` mounts the block before notifying listeners).
 *   2. The post-turn settle re-emit in `do()` (post-mount by construction —
 *      the turn completed, so every action including `onMount` has run).
 *
 * The collaborator itself does not check this invariant; the **adapter's
 * emit sites** are the contract. The regression test
 * `tests/runtime-compliance/post-mount-snapshot-invariant.compliance.test.ts`
 * pins the outcome.
 *
 * ## What this collaborator is NOT
 *
 * - Not a producer of snapshots. The adapter decides *when* to call
 *   `emitStack(snapshot)`. The collaborator only fans out.
 * - Not a replacement for `OutputEmitter` (output buffer, analytics
 *   enrichment, GC guard, deferred catch-up). Output emission semantics
 *   live there. The original God-class extraction shipped output there
 *   deliberately; this collaborator stays out of its way.
 * - Not responsible for the tracker source. The first `subscribeToTracker`
 *   call subscribes to the provided `tracker.onUpdate`; the last
 *   unsubscribe tears it down.
 */
import type { TrackerUpdate, TrackerSnapshot } from './contracts/IRuntimeOptions';
import type { IRuntimeBlock } from './contracts/IRuntimeBlock';
import type {
    StackObserver,
    StackSnapshot,
    Unsubscribe,
} from './contracts/IRuntimeStack';

export type TrackerListener = (update: TrackerUpdate) => void;

/**
 * Subscriber contract for the shared `RuntimeObservers` collaborator.
 *
 * The collaborator calls `onUpdate` on the first `subscribeToTracker` and
 * stores the returned `Unsubscribe` to call when the last listener
 * goes away. If `null` is passed, the adapter manages the tracker source
 * externally (e.g. the proxy has no upstream tracker; it forwards
 * `rpc-tracker-update` messages through `emitTracker` directly).
 */
export interface RuntimeObserversTrackerSource {
    onUpdate(callback: TrackerListener): Unsubscribe;
    getSnapshot?: () => TrackerSnapshot;
}

export class RuntimeObservers {
    private readonly _stackObservers: Set<StackObserver> = new Set();
    private readonly _trackerListeners: Set<TrackerListener> = new Set();

    // Reference-counted upstream tracker subscription. The first
    // subscribeToTracker opens it; the last unsubscribe closes it.
    private _trackerSubscriptionUnsub: Unsubscribe | null = null;

    constructor(
        private readonly _trackerSource: RuntimeObserversTrackerSource | null = null,
    ) {}

    // ── Stack observers ───────────────────────────────────────────────

    /**
     * Subscribe to stack snapshots. The collaborator does NOT emit an
     * `'initial'` snapshot automatically — the calling adapter is
     * responsible for constructing the snapshot and calling `emitStack`
     * right after subscribe, so the adapter owns its own initial-snapshot
     * timing (ScriptRuntime defers via setTimeout to dodge React render
     * warnings; the Chromecast proxy fires synchronously per its existing
     * contract — see `ChromecastProxyRuntime.test.ts:69-73`).
     *
     * @param observer Callback invoked with every snapshot via `emitStack`.
     */
    subscribeToStack(observer: StackObserver): Unsubscribe {
        this._stackObservers.add(observer);
        return () => {
            this._stackObservers.delete(observer);
        };
    }

    /**
     * Fan-out a stack snapshot to all subscribers. Errors are isolated
     * per-observer so a misbehaving listener cannot stop the others.
     */
    emitStack(snapshot: StackSnapshot): void {
        if (this._stackObservers.size === 0) return;
        for (const observer of this._stackObservers) {
            try {
                observer(snapshot);
            } catch (err) {
                console.error('[RuntimeObservers] Stack observer error:', err);
            }
        }
    }

    /**
     * Membership check used by adapters that defer their initial-snapshot
     * emit (e.g. ScriptRuntime via setTimeout) and need to drop the
     * emit if the observer unsubscribed in the meantime.
     */
    hasStackObserver(observer: StackObserver): boolean {
        return this._stackObservers.has(observer);
    }

    // ── Tracker listeners ─────────────────────────────────────────────

    /**
     * Subscribe to tracker updates. The first subscriber wires the
     * upstream tracker source; the last unsubscribe tears it down.
     * If no tracker source is configured (e.g. on the proxy), tracker
     * updates are still fan-out, but the adapter is responsible for
     * driving them (e.g. forwarding `rpc-tracker-update` messages).
     */
    subscribeToTracker(listener: TrackerListener): Unsubscribe {
        this._trackerListeners.add(listener);

        if (
            this._trackerListeners.size === 1 &&
            this._trackerSource &&
            this._trackerSubscriptionUnsub === null
        ) {
            this._trackerSubscriptionUnsub = this._trackerSource.onUpdate((update) => {
                this.emitTracker(update);
            });
        }

        return () => {
            this._trackerListeners.delete(listener);
            if (this._trackerListeners.size === 0 && this._trackerSubscriptionUnsub) {
                this._trackerSubscriptionUnsub();
                this._trackerSubscriptionUnsub = null;
            }
        };
    }

    /**
     * Fan-out a tracker update to all subscribers. Called either by
     * the upstream tracker subscription bridge (auto-wired by the
     * first `subscribeToTracker`) or directly by the adapter (e.g. the
     * proxy forwards RPC tracker messages through this method).
     */
    emitTracker(update: TrackerUpdate): void {
        if (this._trackerListeners.size === 0) return;
        for (const listener of this._trackerListeners) {
            try {
                listener(update);
            } catch (err) {
                console.error('[RuntimeObservers] Tracker listener error:', err);
            }
        }
    }

    // ── Snapshot support for adapter settle path ──────────────────────

    /**
     * Build the `initial`-type snapshot the collaborator itself cannot
     * build (it doesn't know the adapter's stack). Used by the settle
     * path in `ScriptRuntime.do()`'s `finally` to re-emit a
     * post-mount snapshot after the turn completes.
     */
    emitSettled(blocks: readonly IRuntimeBlock[], depth: number, clockTime: Date): void {
        if (this._stackObservers.size === 0) return;
        if (blocks.length === 0) return;
        const snapshot: StackSnapshot = {
            type: 'initial',
            blocks,
            depth,
            clockTime,
        };
        this.emitStack(snapshot);
    }

    // ── Disposal ──────────────────────────────────────────────────────

    /**
     * Drop all subscribers and release the upstream tracker
     * subscription if one is held. After `dispose`, no further
     * `emit*` calls are required (they become no-ops via the empty
     * Set checks), and any subscription returned previously
     * continues to function as an unsubscribe.
     */
    dispose(): void {
        this._stackObservers.clear();
        this._trackerListeners.clear();
        if (this._trackerSubscriptionUnsub) {
            this._trackerSubscriptionUnsub();
            this._trackerSubscriptionUnsub = null;
        }
    }

    // ── Introspection (testing / diagnostics) ─────────────────────────

    get stackObserverCount(): number { return this._stackObservers.size; }
    get trackerListenerCount(): number { return this._trackerListeners.size; }
}
