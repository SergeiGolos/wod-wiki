import { describe, it, expect, beforeEach } from 'bun:test';
import { ChromecastRuntimeSubscription } from '../ChromecastRuntimeSubscription';
import { IRpcTransport, RpcUnsubscribe } from '../IRpcTransport';
import { RpcMessage, RpcStackUpdate, RpcOutputStatement } from '../RpcMessages';
import { StackSnapshot } from '@/runtime/contracts/IRuntimeStack';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { BlockKey } from '@/core/models/BlockKey';

// ── Mock Transport ──────────────────────────────────────────────────────────

class MockTransport implements IRpcTransport {
    connected = true;
    sent: RpcMessage[] = [];

    send(message: RpcMessage): void {
        this.sent.push(message);
    }

    onMessage(): RpcUnsubscribe { return () => {}; }
    onConnected(): RpcUnsubscribe { return () => {}; }
    onDisconnected(): RpcUnsubscribe { return () => {}; }
    dispose(): void {}
}

// ── Minimal mock block for snapshot serialization ───────────────────────────

function createMockBlock(key: string, label: string, opts?: { isComplete?: boolean }): IRuntimeBlock {
    return {
        key: new BlockKey(key),
        sourceIds: [1],
        blockType: 'Timer',
        label,
        isComplete: opts?.isComplete ?? false,
        completionReason: undefined,
        behaviors: [],
        context: {} as any,
        getMetricMemoryByVisibility: () => [],
        getMemoryByTag: () => [],
        getAllMemory: () => [],
        pushMemory: () => {},
        mount: () => [],
        next: () => [],
        unmount: () => [],
        dispose: () => {},
        markComplete: () => {},
        getBehavior: () => undefined,
    } as any;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ChromecastRuntimeSubscription', () => {
    let transport: MockTransport;
    let subscription: ChromecastRuntimeSubscription;

    beforeEach(() => {
        transport = new MockTransport();
        subscription = new ChromecastRuntimeSubscription(transport);
    });

    it('should have default id "chromecast"', () => {
        expect(subscription.id).toBe('chromecast');
    });

    it('should accept custom id', () => {
        const sub = new ChromecastRuntimeSubscription(transport, { id: 'custom-cast' });
        expect(sub.id).toBe('custom-cast');
    });

    describe('onStackSnapshot', () => {
        it('should send rpc-stack-update on snapshot', () => {
            const snapshot: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run')],
                depth: 1,
                clockTime: new Date(),
            };

            subscription.onStackSnapshot(snapshot);

            expect(transport.sent).toHaveLength(1);
            const msg = transport.sent[0] as RpcStackUpdate;
            expect(msg.type).toBe('rpc-stack-update');
            expect(msg.snapshotType).toBe('push');
            expect(msg.blocks).toHaveLength(1);
            expect(msg.blocks[0].key).toBe('b1');
            expect(msg.blocks[0].label).toBe('Run');
            expect(msg.depth).toBe(1);
        });

        it('should not send when transport is disconnected', () => {
            transport.connected = false;

            const snapshot: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run')],
                depth: 1,
                clockTime: new Date(),
            };
            subscription.onStackSnapshot(snapshot);

            expect(transport.sent).toHaveLength(0);
        });

        it('should deduplicate identical snapshots via fingerprinting', () => {
            const snapshot: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run')],
                depth: 1,
                clockTime: new Date(),
            };

            subscription.onStackSnapshot(snapshot);
            subscription.onStackSnapshot(snapshot);

            // Second call should be deduped
            expect(transport.sent).toHaveLength(1);
        });

        it('should send again when structure changes', () => {
            const snapshot1: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run')],
                depth: 1,
                clockTime: new Date(),
            };
            const snapshot2: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run'), createMockBlock('b2', 'Rest')],
                depth: 2,
                clockTime: new Date(),
            };

            subscription.onStackSnapshot(snapshot1);
            subscription.onStackSnapshot(snapshot2);

            expect(transport.sent).toHaveLength(2);
        });
    });

    describe('onOutput', () => {
        it('should send rpc-output', () => {
            const output: IOutputStatement = {
                outputType: 'segment',
                sourceBlockKey: 'block-1',
                stackLevel: 0,
                metrics: [{ type: 'text', image: 'Run' } as any],
                metricMeta: new Map(),
                timeSpan: { started: 1000, ended: 2000 },
                spans: [],
                elapsed: 1000,
                total: 1000,
                completionReason: 'timer-expired',
            } as any;

            subscription.onOutput(output);

            expect(transport.sent).toHaveLength(1);
            const msg = transport.sent[0] as RpcOutputStatement;
            expect(msg.type).toBe('rpc-output');
            expect(msg.sourceBlockKey).toBe('block-1');
            expect(msg.outputType).toBe('segment');
        });

        it('should not send output when disconnected', () => {
            transport.connected = false;
            subscription.onOutput({
                outputType: 'segment',
                sourceBlockKey: 'b',
                stackLevel: 0,
                metrics: [],
                metricMeta: new Map(),
                timeSpan: { started: 0 },
                spans: [],
                elapsed: 0,
                total: 0,
            } as any);

            expect(transport.sent).toHaveLength(0);
        });
    });

    describe('dispose', () => {
        it('should NOT send rpc-dispose on runtime cleanup (only CastButtonRpc.cleanupCast does)', () => {
            // rpc-dispose is only sent by the explicit cast-session teardown path,
            // not by ChromecastRuntimeSubscription.dispose() — otherwise every
            // runtime reset would permanently break the receiver's proxy runtime.
            subscription.dispose();

            expect(transport.sent).toHaveLength(0);
        });

        it('should not send rpc-dispose even when connected', () => {
            // Same invariant regardless of connection state
            transport.connected = true;
            subscription.dispose();

            expect(transport.sent).toHaveLength(0);
        });

        it('should reset fingerprint on dispose', () => {
            const snapshot: StackSnapshot = {
                type: 'push',
                blocks: [createMockBlock('b1', 'Run')],
                depth: 1,
                clockTime: new Date(),
            };

            subscription.onStackSnapshot(snapshot);
            expect(transport.sent).toHaveLength(1);

            // Dispose resets fingerprint
            transport.connected = false;
            subscription.dispose();
            transport.connected = true;
            transport.sent = [];

            // After reset, same snapshot should be sent again
            // (need new subscription since dispose clears fingerprint)
            subscription.onStackSnapshot(snapshot);
            expect(transport.sent).toHaveLength(1);
        });
    });
});
