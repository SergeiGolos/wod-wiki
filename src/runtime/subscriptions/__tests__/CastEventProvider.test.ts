import { describe, it, expect, beforeEach } from 'bun:test';
import { CastEventProvider } from '../CastEventProvider';
import type { ICastEventTransport } from '../CastEventProvider';
import type { IEventReceivingRuntime } from '../../contracts/IRuntimeEventProvider';

function createMockTransport(): ICastEventTransport & {
  handlers: Map<string, Set<(data: unknown) => void>>;
  emitMessage: (data: unknown) => void;
} {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  return {
    handlers,
    on(event: string, handler: (data: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    off(event: string, handler: (data: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
    emitMessage(data: unknown) {
      handlers.get('message')?.forEach(h => h(data));
    },
  };
}

function createMockRuntime(): IEventReceivingRuntime & { events: Array<{ name: string; data?: unknown }> } {
  return {
    events: [],
    handle(event) {
      this.events.push({ name: event.name, data: event.data });
    },
  };
}

describe('CastEventProvider', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let provider: CastEventProvider;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    transport = createMockTransport();
    provider = new CastEventProvider(transport, 'session-1');
    runtime = createMockRuntime();
  });

  it('has cast-prefixed id', () => {
    expect(provider.id).toBe('cast-session-1');
  });

  it('is not connected initially', () => {
    expect(provider.isConnected).toBe(false);
  });

  it('becomes connected after connect()', () => {
    provider.connect(runtime);
    expect(provider.isConnected).toBe(true);
  });

  it('forwards event-from-receiver messages to runtime', () => {
    provider.connect(runtime);

    transport.emitMessage({
      type: 'event-from-receiver',
      payload: {
        event: {
          name: 'next',
          timestamp: Date.now(),
        },
      },
    });

    expect(runtime.events).toHaveLength(1);
    expect(runtime.events[0].name).toBe('next');
  });

  it('ignores non-event messages', () => {
    provider.connect(runtime);

    transport.emitMessage({ type: 'state-update', payload: {} });

    expect(runtime.events).toHaveLength(0);
  });

  it('ignores messages without event name', () => {
    provider.connect(runtime);

    transport.emitMessage({
      type: 'event-from-receiver',
      payload: { event: {} },
    });

    expect(runtime.events).toHaveLength(0);
  });

  it('stops forwarding after disconnect', () => {
    provider.connect(runtime);

    transport.emitMessage({
      type: 'event-from-receiver',
      payload: { event: { name: 'next', timestamp: Date.now() } },
    });
    expect(runtime.events).toHaveLength(1);

    provider.disconnect();
    transport.emitMessage({
      type: 'event-from-receiver',
      payload: { event: { name: 'pause', timestamp: Date.now() } },
    });
    expect(runtime.events).toHaveLength(1);
  });

  it('cleans up on dispose', () => {
    provider.connect(runtime);
    provider.dispose();
    expect(provider.isConnected).toBe(false);
  });
});
