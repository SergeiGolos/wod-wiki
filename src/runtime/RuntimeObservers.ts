/**
 * RuntimeObservers — the shared observer collaborator for IScriptRuntime adapters.
 *
 * Owns the **subscriber side** of the stack-snapshot reactive seam
 * (`IScriptRuntime.subscribeToStack`). Both `ScriptRuntime` and
 * `ChromecastProxyRuntime` compose one of these.
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
 *   live there.
 */
import type { IRuntimeBlock } from './contracts/IRuntimeBlock';
import type {
    StackObserver,
    StackSnapshot,
    Unsubscribe,
} from './contracts/IRuntimeStack';

/**
 * Subscriber collaborator for stack snapshots. (The former tracker-listener
 * seam was removed when session-totals moved to the live 'analytics' output
 * stream — see AnalyticsEngine.setLiveOutputEmitter.)
 */
export class RuntimeObservers {
    private readonly _stackObservers: Set<StackObserver> = new Set();

    /**
     * Subscribe to stack snapshots. The collaborator does NOT emit an
     * `'initial'` snapshot automatically — the calling adapter is
     * responsible for constructing the snapshot and calling `emitStack`
     * right after subscribe, so the adapter owns its own initial-snapshot
     * timing (ScriptRuntime defers via setTimeout to dodge React render
     * warnings; the Chromecast proxy fires synchronously per its existing
     * contract — see `ChromecastProxyRuntime.test.ts`).
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

    /**
     * Drop all subscribers. After `dispose`, `emit*` calls become no-ops
     * (empty Set checks), and any subscription returned previously
     * continues to function as an unsubscribe.
     */
    dispose(): void {
        this._stackObservers.clear();
    }

    /** Introspection (testing / diagnostics). */
    get stackObserverCount(): number { return this._stackObservers.size; }
}
