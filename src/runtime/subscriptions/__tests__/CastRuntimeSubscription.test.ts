import { describe, it, expect, beforeEach } from 'bun:test';
import { CastRuntimeSubscription } from '../CastRuntimeSubscription';
import type { ICastTransport } from '../CastRuntimeSubscription';
import type { ISubscribableRuntime } from '../../contracts/IRuntimeSubscription';
import type { StackSnapshot } from '../../contracts/IRuntimeStack';
import type { IOutputStatement } from '../../../core/models/OutputStatement';

function createMockRuntime(): ISubscribableRuntime & {
  emitStack: (snapshot: StackSnapshot) => void;
  emitOutput: (output: IOutputStatement) => void;
} {
  const stackObservers = new Set<(s: StackSnapshot) => void>();
  const outputListeners = new Set<(o: IOutputStatement) => void>();

  return {
    subscribeToStack(observer) {
      stackObservers.add(observer);
      return () => { stackObservers.delete(observer); };
    },
    subscribeToOutput(listener) {
      outputListeners.add(listener);
      return () => { outputListeners.delete(listener); };
    },
    getOutputStatements() { return []; },
    emitStack(snapshot: StackSnapshot) {
      for (const obs of stackObservers) obs(snapshot);
    },
    emitOutput(output: IOutputStatement) {
      for (const lis of outputListeners) lis(output);
    },
  };
}

function createMockTransport(): ICastTransport & { sent: unknown[] } {
  return {
    sent: [],
    isConnected: true,
    send(message: unknown) {
      this.sent.push(message);
    },
  };
}

function makeSnapshot(type: StackSnapshot['type'] = 'push'): StackSnapshot {
  return {
    type,
    blocks: [],
    depth: 2,
    clockTime: new Date('2024-01-01T12:00:00Z'),
  };
}

function makeOutput(): IOutputStatement {
  return {
    id: 42,
    outputType: 'segment',
    sourceBlockKey: 'block-1',
    stackLevel: 1,
    fragments: [{ fragmentType: 'label', type: 'test', image: 'Test', value: 'test', origin: 'runtime' }],
    fragmentMeta: new Map(),
    timeSpan: { startMs: Date.now(), endMs: Date.now(), durationMs: 0 },
    spans: [],
    elapsed: 0,
    total: 0,
  } as unknown as IOutputStatement;
}

describe('CastRuntimeSubscription', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let sub: CastRuntimeSubscription;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    transport = createMockTransport();
    sub = new CastRuntimeSubscription(transport, 'session-1');
    runtime = createMockRuntime();
  });

  it('has cast-prefixed id', () => {
    expect(sub.id).toBe('cast-session-1');
  });

  it('is not attached initially', () => {
    expect(sub.isAttached).toBe(false);
  });

  it('sends stack snapshots over transport on attach', () => {
    sub.attach(runtime);
    expect(sub.isAttached).toBe(true);

    runtime.emitStack(makeSnapshot('push'));

    expect(transport.sent).toHaveLength(1);
    const msg = transport.sent[0] as any;
    expect(msg.type).toBe('state-update');
    expect(msg.snapshot.type).toBe('push');
    expect(msg.snapshot.depth).toBe(2);
  });

  it('sends output updates over transport', () => {
    sub.attach(runtime);
    runtime.emitOutput(makeOutput());

    expect(transport.sent).toHaveLength(1);
    const msg = transport.sent[0] as any;
    expect(msg.type).toBe('output-update');
    expect(msg.output.sourceBlockKey).toBe('block-1');
    expect(msg.output.fragmentCount).toBe(1);
  });

  it('drops messages when transport is not connected', () => {
    transport.isConnected = false;
    sub.attach(runtime);
    runtime.emitStack(makeSnapshot());

    expect(transport.sent).toHaveLength(0);
  });

  it('stops sending after detach', () => {
    sub.attach(runtime);
    runtime.emitStack(makeSnapshot());
    expect(transport.sent).toHaveLength(1);

    sub.detach();
    runtime.emitStack(makeSnapshot());
    expect(transport.sent).toHaveLength(1); // No new sends
  });

  it('cleans up on dispose', () => {
    sub.attach(runtime);
    sub.dispose();
    expect(sub.isAttached).toBe(false);

    runtime.emitStack(makeSnapshot());
    expect(transport.sent).toHaveLength(0);
  });
});
