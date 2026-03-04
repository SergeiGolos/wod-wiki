import { describe, it, expect, beforeEach } from 'bun:test';
import { ChromecastProxyRuntime } from '../ChromecastProxyRuntime';
import { IRpcTransport, RpcUnsubscribe } from '../IRpcTransport';
import { RpcMessage, RpcStackUpdate, RpcOutputStatement, SerializedBlock } from '../RpcMessages';

// ── Mock Transport ──────────────────────────────────────────────────────────

class MockTransport implements IRpcTransport {
    connected = true;
    sent: RpcMessage[] = [];
    private messageHandlers = new Set<(msg: RpcMessage) => void>();
    private connHandlers = new Set<() => void>();
    private discHandlers = new Set<() => void>();

    send(message: RpcMessage): void {
        this.sent.push(message);
    }

    onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connHandlers.add(handler);
        return () => this.connHandlers.delete(handler);
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.discHandlers.add(handler);
        return () => this.discHandlers.delete(handler);
    }

    dispose(): void {
        this.messageHandlers.clear();
    }

    /** Simulate receiving a message from the browser */
    _receive(message: RpcMessage): void {
        for (const h of this.messageHandlers) h(message);
    }
}

function createSerializedBlock(key: string, overrides?: Partial<SerializedBlock>): SerializedBlock {
    return {
        key,
        blockType: 'Timer',
        label: 'Run',
        sourceIds: [1],
        isComplete: false,
        displayFragments: [[{ type: 'text', metricType: 'label' as any, image: 'Run' } as any]],
        timer: null,
        ...overrides,
    };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ChromecastProxyRuntime', () => {
    let transport: MockTransport;
    let proxy: ChromecastProxyRuntime;

    beforeEach(() => {
        transport = new MockTransport();
        proxy = new ChromecastProxyRuntime(transport);
    });

    // ── Stack subscription ──────────────────────────────────────────────────

    describe('subscribeToStack', () => {
        it('should deliver initial snapshot on subscribe', () => {
            const snapshots: any[] = [];
            proxy.subscribeToStack(s => snapshots.push(s));

            expect(snapshots).toHaveLength(1);
            expect(snapshots[0].type).toBe('initial');
            expect(snapshots[0].blocks).toHaveLength(0);
        });

        it('should notify observers on rpc-stack-update', () => {
            const snapshots: any[] = [];
            proxy.subscribeToStack(s => snapshots.push(s));
            snapshots.length = 0; // clear initial

            const block = createSerializedBlock('block-1');
            const update: RpcStackUpdate = {
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [block],
                affectedBlockKey: 'block-1',
                depth: 1,
                clockTime: Date.now(),
            };
            transport._receive(update);

            expect(snapshots).toHaveLength(1);
            expect(snapshots[0].type).toBe('push');
            expect(snapshots[0].blocks).toHaveLength(1);
            expect(snapshots[0].blocks[0].key.toString()).toBe('block-1');
            expect(snapshots[0].depth).toBe(1);
        });

        it('should update stack.blocks on rpc-stack-update', () => {
            const block = createSerializedBlock('blk');
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [block],
                depth: 1,
                clockTime: Date.now(),
            });

            expect(proxy.stack.count).toBe(1);
            expect(proxy.stack.current?.key.toString()).toBe('blk');
        });

        it('should handle clear snapshot', () => {
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('a')],
                depth: 1,
                clockTime: Date.now(),
            });
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'clear',
                blocks: [],
                depth: 0,
                clockTime: Date.now(),
            });

            expect(proxy.stack.count).toBe(0);
        });

        it('should unsubscribe observers', () => {
            const snapshots: any[] = [];
            const unsub = proxy.subscribeToStack(s => snapshots.push(s));
            snapshots.length = 0;
            unsub();

            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('x')],
                depth: 1,
                clockTime: Date.now(),
            });

            expect(snapshots).toHaveLength(0);
        });

        it('should reuse ProxyBlock instances across updates (block cache)', () => {
            // Push block-1
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('block-1', { label: 'First' })],
                depth: 1,
                clockTime: Date.now(),
            });
            const firstInstance = proxy.stack.current;
            expect(firstInstance?.label).toBe('First');

            // Receive another snapshot for the same block key — should update in-place
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('block-1', { label: 'First', isComplete: true })],
                depth: 1,
                clockTime: Date.now(),
            });
            const secondInstance = proxy.stack.current;

            // Same object reference — update was in-place
            expect(secondInstance).toBe(firstInstance);
            expect(secondInstance?.isComplete).toBe(true);
        });

        it('should evict blocks from cache when they leave the stack', () => {
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('block-a')],
                depth: 1,
                clockTime: Date.now(),
            });

            // Block leaves the stack
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'pop',
                blocks: [],
                depth: 0,
                clockTime: Date.now(),
            });

            // Re-add with same key — should be a NEW instance
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('block-a', { label: 'Reused' })],
                depth: 1,
                clockTime: Date.now(),
            });

            // This just verifies it doesn't throw and the stack is correct
            expect(proxy.stack.current?.key.toString()).toBe('block-a');
            expect(proxy.stack.current?.label).toBe('Reused');
        });

        it('should clear block cache on clear snapshot', () => {
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('c1')],
                depth: 1,
                clockTime: Date.now(),
            });

            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'clear',
                blocks: [],
                depth: 0,
                clockTime: Date.now(),
            });

            expect(proxy.stack.count).toBe(0);
        });
    });

    // ── Output subscription ─────────────────────────────────────────────────

    describe('subscribeToOutput', () => {
        it('should notify listeners on rpc-output', () => {
            const outputs: any[] = [];
            proxy.subscribeToOutput(o => outputs.push(o));

            const msg: RpcOutputStatement = {
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'block-1',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: Date.now(), ended: Date.now() + 1000 },
            };
            transport._receive(msg);

            expect(outputs).toHaveLength(1);
            expect(outputs[0].sourceBlockKey).toBe('block-1');
            expect(outputs[0].outputType).toBe('segment');
        });

        it('should use pre-computed elapsed from rpc-output message', () => {
            const outputs: any[] = [];
            proxy.subscribeToOutput(o => outputs.push(o));

            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: 1000, ended: 6000 },
                elapsed: 5000,
            });

            expect(outputs[0].elapsed).toBe(5000);
        });

        it('should compute elapsed from timeSpan when elapsed field is absent', () => {
            const outputs: any[] = [];
            proxy.subscribeToOutput(o => outputs.push(o));

            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: 1000, ended: 3000 },
                // no elapsed field
            } as any);

            expect(outputs[0].elapsed).toBe(2000);
        });

        it('should accumulate outputs in getOutputStatements', () => {
            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: 0, ended: 1 },
            });
            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b2',
                stackLevel: 1,
                metrics: [],
                timeSpan: { started: 1, ended: 2 },
            });

            const all = proxy.getOutputStatements();
            expect(all).toHaveLength(2);
        });

        it('should unsubscribe output listener', () => {
            const outputs: any[] = [];
            const unsub = proxy.subscribeToOutput(o => outputs.push(o));
            unsub();

            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: 0 },
            });

            expect(outputs).toHaveLength(0);
        });
    });

    // ── Event handling ──────────────────────────────────────────────────────

    describe('handle (event dispatch)', () => {
        it('should send rpc-event to transport', () => {
            proxy.handle({ name: 'next', timestamp: new Date() });

            expect(transport.sent).toHaveLength(1);
            expect(transport.sent[0].type).toBe('rpc-event');
            expect((transport.sent[0] as any).name).toBe('next');
        });

        it('should emit event locally on proxy event bus', () => {
            const events: any[] = [];
            proxy.eventBus.on('*', (e) => events.push(e), 'test');

            proxy.handle({ name: 'pause', timestamp: new Date() });

            expect(events).toHaveLength(1);
            expect(events[0].name).toBe('pause');
        });

        it('should not send events after dispose', () => {
            proxy.dispose();
            proxy.handle({ name: 'next', timestamp: new Date() });
            expect(transport.sent).toHaveLength(0);
        });
    });

    // ── No-op methods ───────────────────────────────────────────────────────

    describe('no-op methods', () => {
        it('do() should not throw', () => {
            expect(() => proxy.do({} as any)).not.toThrow();
        });

        it('doAll() should not throw', () => {
            expect(() => proxy.doAll([])).not.toThrow();
        });

        it('pushBlock() should not throw', () => {
            expect(() => proxy.pushBlock({} as any)).not.toThrow();
        });

        it('popBlock() should not throw', () => {
            expect(() => proxy.popBlock()).not.toThrow();
        });
    });

    // ── Dispose ─────────────────────────────────────────────────────────────

    describe('dispose', () => {
        it('should handle rpc-dispose message', () => {
            const snapshots: any[] = [];
            proxy.subscribeToStack(s => snapshots.push(s));
            snapshots.length = 0;

            transport._receive({ type: 'rpc-dispose' });

            // After dispose, further messages should not be processed
            transport._receive({
                type: 'rpc-stack-update',
                snapshotType: 'push',
                blocks: [createSerializedBlock('x')],
                depth: 1,
                clockTime: Date.now(),
            });

            expect(snapshots).toHaveLength(0);
        });

        it('should be safe to call dispose() multiple times', () => {
            expect(() => {
                proxy.dispose();
                proxy.dispose();
            }).not.toThrow();
        });

        it('should clear outputs on dispose', () => {
            transport._receive({
                type: 'rpc-output',
                outputType: 'segment',
                sourceBlockKey: 'b',
                stackLevel: 0,
                metrics: [],
                timeSpan: { started: 0 },
            });
            proxy.dispose();
            expect(proxy.getOutputStatements()).toHaveLength(0);
        });
    });
});
