import { IScriptRuntime, OutputListener } from '@/runtime/contracts/IScriptRuntime';
import { IRuntimeStack, Unsubscribe, StackSnapshot, StackObserver, StackListener, StackEvent } from '@/runtime/contracts/IRuntimeStack';
import { IRuntimeClock } from '@/runtime/contracts/IRuntimeClock';
import { IRuntimeAction } from '@/runtime/contracts/IRuntimeAction';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { IEventBus, EventCallback, EventHandlerOptions } from '@/runtime/contracts/events/IEventBus';
import { IEvent } from '@/runtime/contracts/events/IEvent';
import { IEventHandler } from '@/runtime/contracts/events/IEventHandler';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { RuntimeStackOptions } from '@/runtime/contracts/IRuntimeOptions';
import { TimeSpan } from '@/runtime/models/TimeSpan';
import { BlockKey } from '@/core/models/BlockKey';
import { WodScript } from '@/parser/WodScript';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import type { IRpcTransport } from './IRpcTransport';
import type { RpcMessage, RpcStackUpdate, RpcOutputStatement, RpcWorkbenchUpdate } from './RpcMessages';
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
    readonly script: WodScript = new WodScript('', []);
    readonly eventBus: IEventBus;
    readonly stack: IRuntimeStack;
    readonly jit: JitCompiler = null as any; // Not available on proxy
    readonly clock: IRuntimeClock;
    readonly errors: never[] = [];

    private proxyStack: ProxyStack;
    private proxyEventBus: ProxyEventBus;
    private stackObservers = new Set<StackObserver>();
    private outputListeners = new Set<OutputListener>();
    private outputs: IOutputStatement[] = [];
    private transportUnsub: (() => void) | null = null;
    private disposed = false;

    // Workbench display state (from rpc-workbench-update)
    private _workbenchState: WorkbenchDisplayState = { mode: 'idle' };
    private workbenchListeners = new Set<WorkbenchStateListener>();

    constructor(private readonly transport: IRpcTransport) {
        this.proxyStack = new ProxyStack();
        this.proxyEventBus = new ProxyEventBus();
        this.stack = this.proxyStack;
        this.eventBus = this.proxyEventBus;
        this.clock = new ProxyClock();

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
        this.workbenchListeners.clear();
        this.outputs = [];
    }

    // ── RPC message handling ────────────────────────────────────────────────

    private handleRpcMessage(message: RpcMessage): void {
        switch (message.type) {
            case 'rpc-stack-update':
                this.handleStackUpdate(message);
                break;
            case 'rpc-output':
                this.handleOutput(message);
                break;
            case 'rpc-workbench-update':
                this.handleWorkbenchUpdate(message);
                break;
            case 'rpc-dispose':
                this.dispose();
                break;
            // rpc-event is handled by ChromecastEventProvider on the browser side
        }
    }

    private handleStackUpdate(message: RpcStackUpdate): void {
        // Hydrate ProxyBlocks from serialized data
        const blocks = message.blocks.map(sb => new ProxyBlock(sb));

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
            fragments: message.fragments,
            fragmentMeta: new Map(),
            completionReason: message.completionReason,
            timeSpan: new TimeSpan(message.timeSpan.started, message.timeSpan.ended),
            spans: [],
            elapsed: 0,
            total: 0,
            // ICodeStatement fields (minimal stubs)
            type: 'output',
            sourceIds: [],
            children: [],
            getAllFragmentsByType: () => [],
            getFragment: () => undefined,
            getDisplayFragments: () => message.fragments,
            getFragmentsByOrigin: () => message.fragments,
        } as any;

        this.addOutput(output);
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
}
