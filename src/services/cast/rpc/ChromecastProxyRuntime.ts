import { IScriptRuntime, OutputListener, TrackerListener } from '@/runtime/contracts/IScriptRuntime';
import { IRuntimeStack, Unsubscribe, StackSnapshot, StackObserver, StackListener, StackEvent } from '@/runtime/contracts/IRuntimeStack';
import { IRuntimeClock } from '@/runtime/contracts/IRuntimeClock';
import { IRuntimeAction } from '@/runtime/contracts/IRuntimeAction';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { IEventBus, EventCallback, EventHandlerOptions } from '@/runtime/contracts/events/IEventBus';
import { IEvent } from '@/runtime/contracts/events/IEvent';
import { IEventHandler } from '@/runtime/contracts/events/IEventHandler';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { RuntimeStackOptions, RuntimeStackTracker, TrackerUpdate, TrackerSnapshot } from '@/runtime/contracts/IRuntimeOptions';
import { TimeSpan } from '@/runtime/models/TimeSpan';
import { BlockKey } from '@/core/models/BlockKey';
import { WhiteboardScript } from '@/parser/WhiteboardScript';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { IAnalyticsEngine } from '@/core/contracts/IAnalyticsEngine';
import type { IRpcTransport } from './IRpcTransport';
import type { RpcMessage, RpcStackUpdate, RpcOutputStatement, RpcWorkbenchUpdate, RpcTrackerUpdate, RpcClockSyncResponse } from './RpcMessages';
import { ProxyBlock } from './ProxyBlock';

// ── Stub implementations ────────────────────────────────────────────────────

/**
 * Read-only proxy stack that reflects the serialized block state from the browser.
 * Push/pop/clear are not supported — the browser owns the execution.
 */
class ProxyStack implements IRuntimeStack {
    private _blocks: readonly IRuntimeBlock[] = [];
    private listeners = new Set<StackListener>();

    get blocks(): readonly IRuntimeBlock[] { return this._blocks; }
    get count(): number { return this._blocks.length; }
    get current(): IRuntimeBlock | undefined { return this._blocks[this._blocks.length - 1]; }
    get keys(): BlockKey[] { return this._blocks.map(b => b.key); }

    push(_block: IRuntimeBlock): void {
        throw new Error('ProxyStack is read-only');
    }

    pop(): IRuntimeBlock | undefined {
        throw new Error('ProxyStack is read-only');
    }

    clear(): void {
        throw new Error('ProxyStack is read-only');
    }

    subscribe(listener: StackListener): () => void {
        this.listeners.add(listener);
        // Send initial event
        listener({ type: 'initial', blocks: this._blocks });
        return () => this.listeners.delete(listener);
    }

    /**
     * Update the stack from a serialized snapshot (used by ChromecastProxyRuntime).
     */
    _updateFromSnapshot(blocks: IRuntimeBlock[], event: StackEvent): void {
        this._blocks = Object.freeze([...blocks]);
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}

/**
 * Stub clock that returns the current wall-clock time.
 * The receiver doesn't control the runtime clock — it reads timer spans
 * from the serialized block state and interpolates elapsed locally.
 */
class ProxyClock implements IRuntimeClock {
    get now(): Date { return new Date(); }
    get elapsed(): number { return 0; }
    get isRunning(): boolean { return false; }
    get spans(): ReadonlyArray<TimeSpan> { return []; }
    start(): Date { return new Date(); }
    stop(): Date { return new Date(); }
}

/**
 * Stub event bus that supports callback registration for UI consumption
 * but doesn't do scope-filtered handler dispatch (no local execution).
 */
class ProxyEventBus implements IEventBus {
    private callbacks = new Map<string, Set<EventCallback>>();

    register(
        _eventName: string,
        _handler: IEventHandler,
        _ownerId: string,
        _options?: EventHandlerOptions,
    ): () => void {
        // No handler registration on proxy — events are dispatched via RPC
        return () => {};
    }

    on(eventName: string, callback: EventCallback, _ownerId: string): () => void {
        if (!this.callbacks.has(eventName)) {
            this.callbacks.set(eventName, new Set());
        }
        this.callbacks.get(eventName)!.add(callback);
        return () => this.callbacks.get(eventName)?.delete(callback);
    }

    unregisterById(_handlerId: string): void {}
    unregisterByOwner(_ownerId: string): void {}

    dispatch(_event: IEvent, _runtime: IScriptRuntime): IRuntimeAction[] {
        return [];
    }

    emit(event: IEvent, runtime: IScriptRuntime): void {
        // Notify callbacks (for UI consumers)
        const specific = this.callbacks.get(event.name);
        const wildcard = this.callbacks.get('*');
        specific?.forEach(cb => cb(event, runtime));
        wildcard?.forEach(cb => cb(event, runtime));
    }

    dispose(): void {
        this.callbacks.clear();
    }
}

// ── WorkbenchState ─────────────────────────────────────────────────────────

/**
 * Workbench display mode carried by rpc-workbench-update messages.
 * The receiver renders different UI panels based on this mode.
 */
export interface WorkbenchDisplayState {
    mode: 'idle' | 'preview' | 'active' | 'review';
    previewData?: RpcWorkbenchUpdate['previewData'];
    reviewData?: RpcWorkbenchUpdate['reviewData'];
    analyticsSummary?: {
        totalDurationMs: number;
        completedSegments: number;
        projections: Array<{ name: string; value: number; unit: string; metricType?: string }>;
    };
}

export type WorkbenchStateListener = (state: WorkbenchDisplayState) => void;

// ── ChromecastProxyRuntime ──────────────────────────────────────────────────

/**
 * ChromecastProxyRuntime — an IScriptRuntime implementation that runs on the
 * Chromecast receiver. Instead of performing actual engine processing, it
 * consumes RPC messages from the browser and exposes the same subscription
 * APIs that workbench components use.
 *
 * The receiver workbench wraps this in <ScriptRuntimeProvider>, so hooks
 * like useSnapshotBlocks(), useOutputStatements() etc. work identically.
 *
 * Events dispatched on the proxy (e.g., D-Pad next) are sent back to the
 * browser via the RPC transport, where the real runtime processes them.
 */
export class ChromecastProxyRuntime implements IScriptRuntime {
    readonly options: RuntimeStackOptions = {};
    readonly script: WhiteboardScript = new WhiteboardScript('', []);
    readonly eventBus: IEventBus;
    readonly stack: IRuntimeStack;
    readonly jit: JitCompiler = null as any; // Not available on proxy
    readonly clock: IRuntimeClock;
    readonly errors: never[] = [];
    readonly tracker: RuntimeStackTracker;

    private proxyStack: ProxyStack;
    private proxyEventBus: ProxyEventBus;
    private stackObservers = new Set<StackObserver>();
    private outputListeners = new Set<OutputListener>();
    private trackerListeners = new Set<TrackerListener>();
    private outputs: IOutputStatement[] = [];
    private transportUnsub: (() => void) | null = null;
    private disposed = false;

    // Track real-time tracker state on the proxy
    private trackerState: TrackerSnapshot = { metrics: {}, rounds: {} };

    /**
     * Cache of active ProxyBlock instances keyed by block key string.
     * Allows update()-in-place when new RPC snapshots arrive for the same block,
     * preserving subscriber connections held by timer and metrics hooks.
     */
    private blockCache = new Map<string, ProxyBlock>();

    // Workbench display state (from rpc-workbench-update)
    private _workbenchState: WorkbenchDisplayState = { mode: 'idle' };
    private workbenchListeners = new Set<WorkbenchStateListener>();

    /**
     * Clock synchronization state.
     * Stores the offset between receiver's clock and sender's clock.
     * Used to calculate accurate elapsed time on the receiver.
     * Positive offset means receiver's clock is ahead of sender's.
     */
    private clockOffsetMs: number = 0;

    constructor(private readonly transport: IRpcTransport) {
        this.proxyStack = new ProxyStack();
        this.proxyEventBus = new ProxyEventBus();
        this.stack = this.proxyStack;
        this.eventBus = this.proxyEventBus;
        this.clock = new ProxyClock();

        this.tracker = {
            onUpdate: (callback: TrackerListener) => this.subscribeToTracker(callback),
            getSnapshot: () => ({ ...this.trackerState })
        };

        // Listen for incoming RPC messages from the browser
        this.transportUnsub = this.transport.onMessage((message: RpcMessage) => {
            this.handleRpcMessage(message);
        });
    }

    // ── Subscription API (fully functional) ─────────────────────────────────

    subscribeToStack(observer: StackObserver): Unsubscribe {
        this.stackObservers.add(observer);
        // Immediately send current state
        observer({
            type: 'initial',
            blocks: this.proxyStack.blocks,
            depth: this.proxyStack.count,
            clockTime: new Date(),
        });
        return () => this.stackObservers.delete(observer);
    }

    subscribeToOutput(listener: OutputListener): Unsubscribe {
        this.outputListeners.add(listener);
        return () => this.outputListeners.delete(listener);
    }

    /**
     * Subscribe to real-time tracker updates.
     */
    subscribeToTracker(listener: TrackerListener): Unsubscribe {
        this.trackerListeners.add(listener);
        return () => this.trackerListeners.delete(listener);
    }

    /**
     * Set the analytics engine for the runtime.
     * No-op on proxy — analytics processing happens on the browser.
     */
    setAnalyticsEngine(_engine: IAnalyticsEngine): void {
        // No-op
    }

    finalizeAnalytics(): import('../../../core/models/OutputStatement').IOutputStatement[] {
        // No-op on proxy — analytics finalization happens on the browser.
        return [];
    }

    /**
     * Subscribe to workbench display mode changes.
     * The listener is called immediately with the current state, then on every update.
     */
    subscribeToWorkbench(listener: WorkbenchStateListener): Unsubscribe {
        this.workbenchListeners.add(listener);
        listener(this._workbenchState);
        return () => this.workbenchListeners.delete(listener);
    }

    /** Current workbench display state (mode + optional preview/review data). */
    get workbenchState(): WorkbenchDisplayState { return this._workbenchState; }

    /**
     * Get the sender's clock time, adjusted for the measured offset.
     * This allows the receiver to calculate elapsed time that matches the sender.
     *
     * @returns The sender's clock time as a Date
     */
    getSenderClockTime(): Date {
        return new Date(Date.now() - this.clockOffsetMs);
    }

    /**
     * Get the sender's clock time as epoch milliseconds.
     * Used by timer calculations to match sender's elapsed time.
     *
     * @returns The sender's clock time in milliseconds since epoch
     */
    getSenderClockTimeMs(): number {
        return Date.now() - this.clockOffsetMs;
    }

    /**
     * Set the clock offset from sync result.
     * Called when browser sends clock-sync-result after the initial handshake.
     *
     * @param offsetMs Clock offset in milliseconds (positive = receiver is ahead)
     */
    setClockOffset(offsetMs: number): void {
        this.clockOffsetMs = offsetMs;
        console.log(`[ChromecastProxyRuntime] Clock offset set to ${offsetMs}ms`);
    }

    getOutputStatements(): IOutputStatement[] {
        return [...this.outputs];
    }

    addOutput(output: IOutputStatement): void {
        this.outputs.push(output);
        for (const listener of this.outputListeners) {
            listener(output);
        }
    }

    // ── Event dispatch (sends back to browser via RPC) ──────────────────────

    handle(event: IEvent): void {
        if (this.disposed) return;
        // Send the event to the browser for processing by the real runtime
        this.transport.send({
            type: 'rpc-event',
            name: event.name,
            timestamp: event.timestamp.getTime(),
            data: event.data,
        });
        // Also notify local UI callbacks
        this.proxyEventBus.emit(event, this);
    }

    // ── Action execution (not supported on proxy) ───────────────────────────

    do(_action: IRuntimeAction): void {
        // No-op: actions are processed on the browser
    }

    doAll(_actions: IRuntimeAction[]): void {
        // No-op: actions are processed on the browser
    }

    pushBlock(_block: IRuntimeBlock): void {
        // No-op: stack is managed by the browser
    }

    popBlock(): void {
        // No-op: stack is managed by the browser
    }

    // ── Lifecycle ───────────────────────────────────────────────────────────

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        this.transportUnsub?.();
        this.transportUnsub = null;

        this.proxyEventBus.dispose();
        this.stackObservers.clear();
        this.outputListeners.clear();
        this.trackerListeners.clear();
        this.workbenchListeners.clear();
        this.outputs = [];
        this.blockCache.clear();
    }

    // ── RPC message handling ────────────────────────────────────────────────

    private handleRpcMessage(message: RpcMessage): void {
        switch (message.type) {
            case 'rpc-clock-sync-request':
                this.handleClockSyncRequest(message);
                break;
            case 'rpc-clock-sync-result':
                this.handleClockSyncResult(message);
                break;
            case 'rpc-stack-update':
                this.handleStackUpdate(message);
                break;
            case 'rpc-output':
                this.handleOutput(message);
                break;
            case 'rpc-tracker-update':
                this.handleTrackerUpdate(message);
                break;
            case 'rpc-workbench-update':
                this.handleWorkbenchUpdate(message);
                break;
            case 'rpc-analytics-summary':
                this.handleAnalyticsSummary(message);
                break;
            case 'rpc-dispose':
                // Sender is shutting down — close the transport so its
                // onDisconnected callbacks fire (e.g. setProxyRuntime(null) on
                // the receiver), then dispose this proxy runtime.
                this.transport.dispose();
                this.dispose();
                break;
            // rpc-event is handled by ChromecastEventProvider on the browser side
        }
    }

    private handleStackUpdate(message: RpcStackUpdate): void {
        // When the browser clears the stack (workout reset / new session start),
        // purge any accumulated output statements from the previous session so
        // the left-panel completion history doesn't bleed across sessions.
        if (message.snapshotType === 'clear') {
            this.outputs = [];
            // Notify output subscribers so useOutputStatements re-fetches (→ empty).
            for (const listener of this.outputListeners) {
                listener(null as any);
            }
            // Clear cached blocks — the stack is fully reset
            this.blockCache.clear();
            // Also reset tracker state
            this.trackerState = { metrics: {}, rounds: {} };
        }

        let blocks: ProxyBlock[];
        try {
            // Update existing ProxyBlocks in-place so subscribers keep their connections,
            // or create new ProxyBlocks for blocks arriving on the stack for the first time.
            blocks = message.blocks.map(sb => {
                const existing = this.blockCache.get(sb.key);
                if (existing) {
                    existing.update(sb);
                    return existing;
                }
                const newBlock = new ProxyBlock(sb);
                this.blockCache.set(sb.key, newBlock);
                return newBlock;
            });

            // Evict blocks that are no longer on the stack
            const currentKeys = new Set(message.blocks.map(b => b.key));
            for (const key of this.blockCache.keys()) {
                if (!currentKeys.has(key)) {
                    this.blockCache.delete(key);
                }
            }
        } catch (err) {
            console.error('[ChromecastProxyRuntime] Failed to hydrate ProxyBlocks from snapshot — snapshot dropped', err);
            return;
        }

        // Find the affected block
        const affectedBlock = message.affectedBlockKey
            ? blocks.find(b => b.key.toString() === message.affectedBlockKey)
            : undefined;

        // Update the proxy stack
        const event: StackEvent = message.snapshotType === 'clear'
            ? { type: 'initial', blocks }
            : message.snapshotType === 'initial'
                ? { type: 'initial', blocks }
                : {
                    type: message.snapshotType as 'push' | 'pop',
                    block: affectedBlock ?? blocks[blocks.length - 1],
                    depth: message.depth,
                    blocks,
                };
        this.proxyStack._updateFromSnapshot(blocks, event);

        // Notify stack observers
        const snapshot: StackSnapshot = {
            type: message.snapshotType,
            blocks,
            affectedBlock,
            depth: message.depth,
            clockTime: new Date(message.clockTime),
        };
        for (const observer of this.stackObservers) {
            observer(snapshot);
        }
    }

    private handleOutput(message: RpcOutputStatement): void {
        // Create a minimal output statement that satisfies the interface
        // for display purposes on the receiver
        const output: IOutputStatement = {
            id: 0,
            outputType: message.outputType as any,
            sourceBlockKey: message.sourceBlockKey,
            stackLevel: message.stackLevel,
            metrics: message.metrics,
            metricMeta: new Map(),
            completionReason: message.completionReason,
            timeSpan: new TimeSpan(message.timeSpan.started, message.timeSpan.ended),
            spans: [],
            // Use the pre-computed elapsed from the browser; fall back to span difference
            elapsed: message.elapsed ?? (
                message.timeSpan.ended !== undefined
                    ? message.timeSpan.ended - message.timeSpan.started
                    : 0
            ),
            total: 0,
            // ICodeStatement fields (minimal stubs)
            type: 'output',
            sourceIds: [],
            children: [],
            getAllMetricsByType: () => [],
            getFragment: () => undefined,
            getDisplayMetrics: () => message.metrics,
            getFragmentsByOrigin: () => message.metrics,
        } as any;

        this.addOutput(output);
    }

    private handleTrackerUpdate(message: RpcTrackerUpdate): void {
        const update = message.update as TrackerUpdate;
        
        // Update local proxy state
        if (update.type === 'metric') {
            const blockId = update.blockId;
            const key = update.key!;
            const blockMetrics = this.trackerState.metrics[blockId] || {};
            this.trackerState.metrics[blockId] = {
                ...blockMetrics,
                [key]: { value: update.value, unit: update.unit }
            };
        } else if (update.type === 'round') {
            this.trackerState.rounds[update.blockId] = { 
                current: update.current!, 
                total: update.total 
            };
        } else if (update.type === 'snapshot') {
            this.trackerState = { ...update.snapshot };
        }

        // Notify listeners
        for (const listener of this.trackerListeners) {
            listener(update);
        }
    }

    private handleWorkbenchUpdate(message: RpcWorkbenchUpdate): void {
        this._workbenchState = {
            mode: message.mode,
            previewData: message.previewData,
            reviewData: message.reviewData,
        };
        for (const listener of this.workbenchListeners) {
            listener(this._workbenchState);
        }
    }

    /**
     * Handle clock sync request from browser.
     * Respond with our current timestamp and echo the request timestamp.
     */
    private handleClockSyncRequest(message: { type: 'rpc-clock-sync-request'; timestamp: number }): void {
        const response: RpcClockSyncResponse = {
            type: 'rpc-clock-sync-response',
            requestTimestamp: message.timestamp,
            receiverTimestamp: Date.now(),
        };
        this.transport.send(response);
    }

    /**
     * Handle clock sync result from browser.
     * Browser calculates the offset using RTT and sends it back.
     */
    private handleClockSyncResult(message: { type: 'rpc-clock-sync-result'; offsetMs: number; rttMs: number }): void {
        this.setClockOffset(message.offsetMs);
        console.log(`[ChromecastProxyRuntime] Clock sync complete — offset: ${message.offsetMs}ms, RTT: ${message.rttMs}ms`);
    }

    /**
     * Handle analytics summary from browser.
     * Replaces simple row-based review with focused projection results.
     */
    private handleAnalyticsSummary(message: { type: 'rpc-analytics-summary'; totalDurationMs: number; completedSegments: number; projections: Array<{ name: string; value: number; unit: string; metricType?: string }> }): void {
        this._workbenchState = {
            ...this._workbenchState,
            analyticsSummary: {
                totalDurationMs: message.totalDurationMs,
                completedSegments: message.completedSegments,
                projections: message.projections,
            },
        };
        for (const listener of this.workbenchListeners) {
            listener(this._workbenchState);
        }
    }
}
