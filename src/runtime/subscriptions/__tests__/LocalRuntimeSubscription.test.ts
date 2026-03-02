import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalRuntimeSubscription } from '../LocalRuntimeSubscription';
import type { ISubscribableRuntime } from '../../contracts/IRuntimeSubscription';
import type { StackSnapshot } from '../../contracts/IRuntimeStack';
import type { IOutputStatement } from '../../../core/models/OutputStatement';

/**
 * Minimal mock runtime that implements ISubscribableRuntime.
 */
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

function makeSnapshot(type: StackSnapshot['type'] = 'initial'): StackSnapshot {
  return {
    type,
    blocks: [],
    depth: 0,
    clockTime: new Date(),
  };
}

function makeOutput(): IOutputStatement {
  return {
    id: 1,
    outputType: 'system',
    sourceBlockKey: 'test-block',
    stackLevel: 0,
    fragments: [],
    fragmentMeta: new Map(),
    timeSpan: { startMs: Date.now(), endMs: Date.now(), durationMs: 0 },
    spans: [],
    elapsed: 0,
    total: 0,
  } as unknown as IOutputStatement;
}

describe('LocalRuntimeSubscription', () => {
  let sub: LocalRuntimeSubscription;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    sub = new LocalRuntimeSubscription('test-local');
    runtime = createMockRuntime();
  });

  it('has the correct id', () => {
    expect(sub.id).toBe('test-local');
  });

  it('defaults to local id when no id is provided', () => {
    const defaultSub = new LocalRuntimeSubscription();
    expect(defaultSub.id).toBe('local');
  });

  it('is not attached initially', () => {
    expect(sub.isAttached).toBe(false);
  });

  it('becomes attached after attach()', () => {
    sub.attach(runtime);
    expect(sub.isAttached).toBe(true);
  });

  it('becomes detached after detach()', () => {
    sub.attach(runtime);
    sub.detach();
    expect(sub.isAttached).toBe(false);
  });

  it('forwards stack snapshots to registered handlers', () => {
    const received: StackSnapshot[] = [];
    sub.onStack((s) => received.push(s));
    sub.attach(runtime);

    const snapshot = makeSnapshot('push');
    runtime.emitStack(snapshot);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('push');
  });

  it('forwards output statements to registered handlers', () => {
    const received: IOutputStatement[] = [];
    sub.onOutput((o) => received.push(o));
    sub.attach(runtime);

    const output = makeOutput();
    runtime.emitOutput(output);

    expect(received).toHaveLength(1);
    expect(received[0].sourceBlockKey).toBe('test-block');
  });

  it('stops forwarding after detach', () => {
    const received: StackSnapshot[] = [];
    sub.onStack((s) => received.push(s));
    sub.attach(runtime);

    runtime.emitStack(makeSnapshot());
    expect(received).toHaveLength(1);

    sub.detach();
    runtime.emitStack(makeSnapshot());
    expect(received).toHaveLength(1); // No new events
  });

  it('unsubscribes individual handlers', () => {
    const received: StackSnapshot[] = [];
    const unsub = sub.onStack((s) => received.push(s));
    sub.attach(runtime);

    runtime.emitStack(makeSnapshot());
    expect(received).toHaveLength(1);

    unsub();
    runtime.emitStack(makeSnapshot());
    expect(received).toHaveLength(1);
  });

  it('clears all handlers on dispose', () => {
    const received: StackSnapshot[] = [];
    sub.onStack((s) => received.push(s));
    sub.attach(runtime);
    sub.dispose();

    expect(sub.isAttached).toBe(false);

    // Re-attach should not trigger old handlers
    sub.attach(runtime);
    runtime.emitStack(makeSnapshot());
    expect(received).toHaveLength(0);
  });

  it('re-attaches cleanly to a new runtime', () => {
    const received: StackSnapshot[] = [];
    sub.onStack((s) => received.push(s));

    sub.attach(runtime);
    runtime.emitStack(makeSnapshot('push'));

    const runtime2 = createMockRuntime();
    sub.attach(runtime2);

    // Old runtime should not trigger
    runtime.emitStack(makeSnapshot('pop'));
    expect(received).toHaveLength(1);

    // New runtime should trigger
    runtime2.emitStack(makeSnapshot('initial'));
    expect(received).toHaveLength(2);
    expect(received[1].type).toBe('initial');
  });
});
