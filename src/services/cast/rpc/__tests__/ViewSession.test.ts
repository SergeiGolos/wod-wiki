import { describe, it, expect, beforeEach } from 'bun:test';
import type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';
import type { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
import type { IEvent } from '@/runtime/contracts/events/IEvent';
import type { IRpcTransport, RpcUnsubscribe } from '../IRpcTransport';
import { ChromecastSenderViewSession, ChromecastReceiverViewSession } from '../ViewSession';

class MockTransport implements IRpcTransport {
    connected = false;
    sent: any[] = [];
    connectCalls = 0;
    disposeCalls = 0;

    private connectedHandlers = new Set<() => void>();
    private disconnectedHandlers = new Set<() => void>();
    private messageHandlers = new Set<(message: any) => void>();

    send(message: any): void {
        this.sent.push(message);
    }

    onMessage(handler: (message: any) => void): RpcUnsubscribe {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connectedHandlers.add(handler);
        return () => this.connectedHandlers.delete(handler);
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.disconnectedHandlers.add(handler);
        return () => this.disconnectedHandlers.delete(handler);
    }

    async connect(): Promise<void> {
        this.connectCalls++;
        this.connected = true;
        this.connectedHandlers.forEach(h => h());
    }

    dispose(): void {
        this.disposeCalls++;
        this.connected = false;
    }

    disconnect(): void {
        this.connected = false;
        this.disconnectedHandlers.forEach(h => h());
    }
}

class MockEventProvider implements IRuntimeEventProvider {
    disposeCalls = 0;
    dispatch(_event: IEvent): void {}
    onEvent(): RpcUnsubscribe { return () => {}; }
    dispose(): void {
        this.disposeCalls++;
    }
}

class MockSubscription implements IRuntimeSubscription {
    id = 'chromecast';
    disposeCalls = 0;
    onStackSnapshot(): void {}
    onOutput(): void {}
    onTrackerUpdate(): void {}
    dispose(): void {
        this.disposeCalls++;
    }
}

class MockClockSync {
    syncCalls = 0;
    disposeCalls = 0;
    async sync(): Promise<void> { this.syncCalls++; }
    dispose(): void { this.disposeCalls++; }
}

class MockSignaling {
    private handlers = new Set<(signal: any) => void>();
    send(): void {}
    onSignal(handler: (signal: any) => void): RpcUnsubscribe {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    emit(signal: any): void {
        this.handlers.forEach(h => h(signal));
    }
    dispose(): void {}
}

describe('ChromecastSenderViewSession', () => {
    let transport: MockTransport;
    let eventProvider: MockEventProvider;
    let subscription: MockSubscription;
    let clockSync: MockClockSync;
    let addCalls = 0;
    let removeCalls = 0;

    beforeEach(() => {
        transport = new MockTransport();
        eventProvider = new MockEventProvider();
        subscription = new MockSubscription();
        clockSync = new MockClockSync();
        addCalls = 0;
        removeCalls = 0;
    });

    it('connects and wires subscription/event provider via one session call', async () => {
        const session = new ChromecastSenderViewSession(
            {
                add: () => { addCalls++; },
                remove: () => { removeCalls++; },
            },
            {
                createSignaling: () => new MockSignaling() as any,
                createTransport: () => transport as any,
                createEventProvider: () => eventProvider as any,
                createSubscription: () => subscription as any,
                createClockSync: () => clockSync as any,
                sleep: async () => {},
            },
        );

        await session.connect({
            castSession: { sendMessage: async () => {} },
            skipNamespacePing: true,
        } as any);

        expect(transport.connectCalls).toBe(1);
        expect(addCalls).toBe(1);
        expect(clockSync.syncCalls).toBe(1);
        expect(session.transport).toBe(transport as any);
        expect(session.subscription).toBe(subscription as any);
        expect(session.eventProvider).toBe(eventProvider as any);
    });

    it('disposes and removes subscription on endSession', async () => {
        const session = new ChromecastSenderViewSession(
            {
                add: () => { addCalls++; },
                remove: () => { removeCalls++; },
            },
            {
                createSignaling: () => new MockSignaling() as any,
                createTransport: () => transport as any,
                createEventProvider: () => eventProvider as any,
                createSubscription: () => subscription as any,
                createClockSync: () => clockSync as any,
                sleep: async () => {},
            },
        );

        await session.connect({
            castSession: { sendMessage: async () => {} },
            skipNamespacePing: true,
        } as any);

        session.endSession();

        expect(removeCalls).toBe(1);
        expect(subscription.disposeCalls).toBe(1);
        expect(eventProvider.disposeCalls).toBe(1);
        expect(transport.disposeCalls).toBe(1);
        expect(transport.sent.some(m => m.type === 'rpc-dispose')).toBe(true);
    });
});

describe('ChromecastReceiverViewSession', () => {
    it('recreates receiver transport/runtime on each incoming offer', async () => {
        const signaling = new MockSignaling();
        const firstTransport = new MockTransport();
        const secondTransport = new MockTransport();
        const firstRuntime = { disposeCalls: 0, dispose() { this.disposeCalls++; } } as any;
        const secondRuntime = { disposeCalls: 0, dispose() { this.disposeCalls++; } } as any;
        let transportCreateCount = 0;

        const session = new ChromecastReceiverViewSession(
            {},
            {
                createSignaling: () => signaling as any,
                createTransport: () => {
                    transportCreateCount++;
                    return (transportCreateCount === 1 ? firstTransport : secondTransport) as any;
                },
                createRuntime: () => (transportCreateCount === 1 ? firstRuntime : secondRuntime),
                createEventProvider: () => new MockEventProvider(),
            },
        );

        await session.connect();
        signaling.emit({ type: 'webrtc-offer' });
        await Promise.resolve();
        await Promise.resolve();

        expect(session.transport).toBe(firstTransport as any);
        expect(session.runtime).toBe(firstRuntime);

        signaling.emit({ type: 'webrtc-offer' });
        await Promise.resolve();
        await Promise.resolve();

        expect(firstTransport.disposeCalls).toBe(1);
        expect((firstRuntime as any).disposeCalls).toBe(1);
        expect(session.transport).toBe(secondTransport as any);
        expect(session.runtime).toBe(secondRuntime);
    });
});
