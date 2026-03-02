import { describe, it, expect, beforeEach } from 'bun:test';
import { ChromeCastRPCRuntime } from '../ChromeCastRPCRuntime';
import type { IRPCTransport } from '../ChromeCastRPCRuntime';

function createMockTransport(): IRPCTransport & {
  handlers: Map<string, Set<(data: unknown) => void>>;
  emitMessage: (data: unknown) => void;
  sent: unknown[];
} {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  return {
    handlers,
    sent: [],
    isConnected: true,
    on(event: string, handler: (data: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    off(event: string, handler: (data: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
    send(message: unknown) {
      this.sent.push(message);
    },
    emitMessage(data: unknown) {
      handlers.get('message')?.forEach(h => h(data));
    },
  };
}

describe('ChromeCastRPCRuntime', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let rpc: ChromeCastRPCRuntime;

  beforeEach(() => {
    transport = createMockTransport();
    rpc = new ChromeCastRPCRuntime(transport);
  });

  it('subscribes to stack updates from transport messages', () => {
    const snapshots: any[] = [];
    rpc.subscribeToStack((s) => snapshots.push(s));

    transport.emitMessage({
      type: 'state-update',
      snapshot: {
        type: 'push',
        depth: 3,
        clockTime: new Date('2024-01-01T12:00:00Z').getTime(),
        blockKeys: ['key-1', 'key-2'],
      },
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].type).toBe('push');
    expect(snapshots[0].depth).toBe(3);
  });

  it('subscribes to output updates from transport messages', () => {
    const outputs: any[] = [];
    rpc.subscribeToOutput((o) => outputs.push(o));

    transport.emitMessage({
      type: 'output-update',
      output: {
        id: 100,
        outputType: 'segment',
        sourceBlockKey: 'block-1',
        stackLevel: 1,
        fragmentCount: 2,
      },
    });

    expect(outputs).toHaveLength(1);
    expect(outputs[0].sourceBlockKey).toBe('block-1');
    expect(outputs[0].outputType).toBe('segment');
  });

  it('sends events back to sender via transport', () => {
    rpc.sendEvent('next');

    expect(transport.sent).toHaveLength(1);
    const msg = transport.sent[0] as any;
    expect(msg.type).toBe('event-from-receiver');
    expect(msg.payload.event.name).toBe('next');
  });

  it('drops events when transport is not connected', () => {
    transport.isConnected = false;
    rpc.sendEvent('next');
    expect(transport.sent).toHaveLength(0);
  });

  it('unsubscribes stack observers', () => {
    const snapshots: any[] = [];
    const unsub = rpc.subscribeToStack((s) => snapshots.push(s));

    transport.emitMessage({
      type: 'state-update',
      snapshot: { type: 'push', depth: 1, clockTime: Date.now(), blockKeys: [] },
    });
    expect(snapshots).toHaveLength(1);

    unsub();
    transport.emitMessage({
      type: 'state-update',
      snapshot: { type: 'pop', depth: 0, clockTime: Date.now(), blockKeys: [] },
    });
    expect(snapshots).toHaveLength(1);
  });

  it('ignores unknown message types', () => {
    const snapshots: any[] = [];
    rpc.subscribeToStack((s) => snapshots.push(s));

    transport.emitMessage({ type: 'ping', payload: {} });
    expect(snapshots).toHaveLength(0);
  });

  it('collects output statements via getOutputStatements', () => {
    transport.emitMessage({
      type: 'output-update',
      output: {
        id: 1,
        outputType: 'system',
        sourceBlockKey: 'block-1',
        stackLevel: 0,
        fragmentCount: 0,
      },
    });

    const outputs = rpc.getOutputStatements();
    expect(outputs).toHaveLength(1);
  });

  it('cleans up on dispose', () => {
    const snapshots: any[] = [];
    rpc.subscribeToStack((s) => snapshots.push(s));

    rpc.dispose();

    transport.emitMessage({
      type: 'state-update',
      snapshot: { type: 'push', depth: 1, clockTime: Date.now(), blockKeys: [] },
    });
    expect(snapshots).toHaveLength(0);
    expect(rpc.getOutputStatements()).toHaveLength(0);
  });
});
