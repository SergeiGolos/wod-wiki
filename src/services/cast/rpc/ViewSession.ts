import type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';
import type { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
import { LocalEventProvider } from '@/runtime/subscriptions/LocalEventProvider';
import { ReceiverCastSignaling, SenderCastSignaling } from '@/services/cast/CastSignaling';
import { CAST_NAMESPACE } from '@/types/cast/messages';
import type { IRpcTransport, RpcUnsubscribe } from './IRpcTransport';
import { ChromecastEventProvider } from './ChromecastEventProvider';
import { ChromecastProxyRuntime } from './ChromecastProxyRuntime';
import { ChromecastRuntimeSubscription } from './ChromecastRuntimeSubscription';
import { ClockSyncService } from './ClockSync';
import { WebRtcRpcTransport, type ISignaling } from './WebRtcRpcTransport';

export interface IViewSession {
    readonly transport: IRpcTransport | null;
    readonly eventProvider: IRuntimeEventProvider | null;
    readonly subscription: IRuntimeSubscription | null;
    connect(): Promise<void>;
    onConnected(handler: () => void): RpcUnsubscribe;
    onDisconnected(handler: () => void): RpcUnsubscribe;
    dispose(): void;
}

interface SubscriptionRegistry {
    add(subscription: IRuntimeSubscription): void;
    remove(subscriptionId: string): void;
}

interface SenderCastSession {
    sendMessage(namespace: string, payload: unknown): Promise<void>;
}

interface SenderSessionConnectOptions {
    castSession?: SenderCastSession | null;
    existingTransport?: WebRtcRpcTransport | null;
    bootDelayMs?: number;
    skipNamespacePing?: boolean;
}

interface SenderSessionDeps {
    createSignaling: (session: SenderCastSession) => ISignaling;
    createTransport: (role: 'offerer', signaling: ISignaling) => WebRtcRpcTransport;
    createEventProvider: (transport: WebRtcRpcTransport) => ChromecastEventProvider;
    createSubscription: (transport: WebRtcRpcTransport) => ChromecastRuntimeSubscription;
    createClockSync: (transport: WebRtcRpcTransport) => ClockSyncService;
    sleep: (ms: number) => Promise<void>;
}

const senderDeps: SenderSessionDeps = {
    createSignaling: (session) => new SenderCastSignaling(session as any),
    createTransport: (role, signaling) => new WebRtcRpcTransport(role, signaling),
    createEventProvider: (transport) => new ChromecastEventProvider(transport),
    createSubscription: (transport) => new ChromecastRuntimeSubscription(transport, { id: 'chromecast' }),
    createClockSync: (transport) => new ClockSyncService(transport),
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

export class ChromecastSenderViewSession implements IViewSession {
    transport: WebRtcRpcTransport | null = null;
    eventProvider: ChromecastEventProvider | null = null;
    subscription: ChromecastRuntimeSubscription | null = null;

    private clockSync: ClockSyncService | null = null;
    private connectedHandlers = new Set<() => void>();
    private disconnectedHandlers = new Set<() => void>();
    private transportDisconnectedUnsub: RpcUnsubscribe | null = null;

    constructor(
        private readonly subscriptionRegistry?: SubscriptionRegistry | null,
        private readonly deps: SenderSessionDeps = senderDeps,
    ) {}

    async connect(options: SenderSessionConnectOptions = {}): Promise<void> {
        await this.connectInternal(options);
    }

    async connectInternal(options: SenderSessionConnectOptions): Promise<void> {
        this.cleanupCurrentSession(false);

        const transport = options.existingTransport ?? await this.createTransportFromCastSession(options);
        if (!transport.connected) {
            await transport.connect();
        }

        this.transport = transport;
        this.eventProvider = this.deps.createEventProvider(transport);
        this.subscription = this.deps.createSubscription(transport);
        this.subscriptionRegistry?.add(this.subscription);

        try {
            this.clockSync = this.deps.createClockSync(transport);
            await this.clockSync.sync();
        } catch (err) {
            console.error('[ChromecastSenderViewSession] Clock sync failed', err);
            this.clockSync?.dispose();
            this.clockSync = null;
        }

        this.transportDisconnectedUnsub = transport.onDisconnected(() => {
            this.cleanupCurrentSession(false);
            for (const handler of this.disconnectedHandlers) handler();
        });

        for (const handler of this.connectedHandlers) handler();
    }

    sendDisposeSignal(): void {
        if (!this.transport?.connected) return;
        this.transport.send({ type: 'rpc-dispose' });
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connectedHandlers.add(handler);
        return () => this.connectedHandlers.delete(handler);
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.disconnectedHandlers.add(handler);
        return () => this.disconnectedHandlers.delete(handler);
    }

    dispose(): void {
        this.cleanupCurrentSession(false);
        this.connectedHandlers.clear();
        this.disconnectedHandlers.clear();
    }

    endSession(): void {
        this.cleanupCurrentSession(true);
    }

    private async createTransportFromCastSession(options: SenderSessionConnectOptions): Promise<WebRtcRpcTransport> {
        const castSession = options.castSession;
        if (!castSession) {
            throw new Error('castSession is required when existingTransport is not provided');
        }

        if ((options.bootDelayMs ?? 0) > 0) {
            await this.deps.sleep(options.bootDelayMs!);
        }

        if (!options.skipNamespacePing) {
            await castSession.sendMessage(CAST_NAMESPACE, { type: 'ping', timestamp: Date.now() });
        }

        const signaling = this.deps.createSignaling(castSession);
        return this.deps.createTransport('offerer', signaling);
    }

    private cleanupCurrentSession(notifyRemote: boolean): void {
        this.transportDisconnectedUnsub?.();
        this.transportDisconnectedUnsub = null;

        if (notifyRemote) {
            this.sendDisposeSignal();
        }

        if (this.subscription) {
            this.subscriptionRegistry?.remove(this.subscription.id);
            this.subscription.dispose();
            this.subscription = null;
        }

        this.eventProvider?.dispose();
        this.eventProvider = null;

        this.clockSync?.dispose();
        this.clockSync = null;

        this.transport?.dispose();
        this.transport = null;
    }
}

interface ReceiverSessionDeps {
    createSignaling: (context: any) => ISignaling;
    createTransport: (role: 'answerer', signaling: ISignaling) => WebRtcRpcTransport;
    createRuntime: (transport: WebRtcRpcTransport) => ChromecastProxyRuntime;
    createEventProvider: (runtime: ChromecastProxyRuntime) => IRuntimeEventProvider;
}

const receiverDeps: ReceiverSessionDeps = {
    createSignaling: (context) => new ReceiverCastSignaling(context),
    createTransport: (role, signaling) => new WebRtcRpcTransport(role, signaling),
    createRuntime: (transport) => new ChromecastProxyRuntime(transport),
    createEventProvider: (runtime) => new LocalEventProvider(runtime),
};

export class ChromecastReceiverViewSession implements IViewSession {
    transport: WebRtcRpcTransport | null = null;
    eventProvider: IRuntimeEventProvider | null = null;
    subscription: IRuntimeSubscription | null = null;

    runtime: ChromecastProxyRuntime | null = null;

    private signaling: ISignaling | null = null;
    private signalingUnsub: RpcUnsubscribe | null = null;
    private transportDisconnectedUnsub: RpcUnsubscribe | null = null;
    private connectedHandlers = new Set<() => void>();
    private disconnectedHandlers = new Set<() => void>();

    constructor(
        private readonly castContext: any,
        private readonly deps: ReceiverSessionDeps = receiverDeps,
    ) {}

    async connect(): Promise<void> {
        this.signaling = this.deps.createSignaling(this.castContext);

        this.signalingUnsub = this.signaling.onSignal((signal) => {
            if (signal.type === 'webrtc-offer') {
                this.recreateTransportSession().catch((err) => {
                    console.error('[ChromecastReceiverViewSession] Failed to establish receiver transport', err);
                });
            }
        });
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connectedHandlers.add(handler);
        return () => this.connectedHandlers.delete(handler);
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.disconnectedHandlers.add(handler);
        return () => this.disconnectedHandlers.delete(handler);
    }

    dispose(): void {
        this.signalingUnsub?.();
        this.signalingUnsub = null;

        this.cleanupTransportSession();

        this.signaling?.dispose();
        this.signaling = null;

        this.connectedHandlers.clear();
        this.disconnectedHandlers.clear();
    }

    private async recreateTransportSession(): Promise<void> {
        if (!this.signaling) return;

        this.cleanupTransportSession();

        const sharedSignaling = this.signaling;
        const signalingFacade: ISignaling = {
            send: (signal) => sharedSignaling.send(signal),
            onSignal: (handler) => sharedSignaling.onSignal(handler),
            dispose: () => {},
        };

        const transport = this.deps.createTransport('answerer', signalingFacade);
        const runtime = this.deps.createRuntime(transport);
        const eventProvider = this.deps.createEventProvider(runtime);

        this.transport = transport;
        this.runtime = runtime;
        this.eventProvider = eventProvider;

        this.transportDisconnectedUnsub = transport.onDisconnected(() => {
            this.cleanupTransportSession();
            for (const handler of this.disconnectedHandlers) handler();
        });

        await transport.connect();

        for (const handler of this.connectedHandlers) handler();
    }

    private cleanupTransportSession(): void {
        this.transportDisconnectedUnsub?.();
        this.transportDisconnectedUnsub = null;

        this.eventProvider?.dispose();
        this.eventProvider = null;

        this.runtime?.dispose();
        this.runtime = null;

        this.transport?.dispose();
        this.transport = null;
    }
}

export class LocalViewSession implements IViewSession {
    readonly transport: IRpcTransport | null = null;
    readonly subscription: IRuntimeSubscription | null = null;

    constructor(readonly eventProvider: IRuntimeEventProvider) {}

    async connect(): Promise<void> {
        return;
    }

    onConnected(_handler: () => void): RpcUnsubscribe {
        return () => {};
    }

    onDisconnected(_handler: () => void): RpcUnsubscribe {
        return () => {};
    }

    dispose(): void {
        this.eventProvider.dispose();
    }
}
