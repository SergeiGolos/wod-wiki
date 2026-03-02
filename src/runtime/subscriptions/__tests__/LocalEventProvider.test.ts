import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalEventProvider } from '../LocalEventProvider';
import type { IEventReceivingRuntime } from '../../contracts/IRuntimeEventProvider';

function createMockRuntime(): IEventReceivingRuntime & { events: Array<{ name: string; data?: unknown }> } {
  return {
    events: [],
    handle(event) {
      this.events.push({ name: event.name, data: event.data });
    },
  };
}

describe('LocalEventProvider', () => {
  let provider: LocalEventProvider;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    provider = new LocalEventProvider('test-local');
    runtime = createMockRuntime();
  });

  it('has the correct id', () => {
    expect(provider.id).toBe('test-local');
  });

  it('is not connected initially', () => {
    expect(provider.isConnected).toBe(false);
  });

  it('becomes connected after connect()', () => {
    provider.connect(runtime);
    expect(provider.isConnected).toBe(true);
  });

  it('becomes disconnected after disconnect()', () => {
    provider.connect(runtime);
    provider.disconnect();
    expect(provider.isConnected).toBe(false);
  });

  it('forwards events to the runtime', () => {
    provider.connect(runtime);
    provider.sendEvent('next');
    provider.sendEvent('start', { source: 'button' });

    expect(runtime.events).toHaveLength(2);
    expect(runtime.events[0].name).toBe('next');
    expect(runtime.events[1].name).toBe('start');
    expect(runtime.events[1].data).toEqual({ source: 'button' });
  });

  it('drops events when not connected', () => {
    provider.sendEvent('next');
    expect(runtime.events).toHaveLength(0);
  });

  it('drops events after disconnect', () => {
    provider.connect(runtime);
    provider.sendEvent('next');
    expect(runtime.events).toHaveLength(1);

    provider.disconnect();
    provider.sendEvent('pause');
    expect(runtime.events).toHaveLength(1);
  });

  it('cleans up on dispose', () => {
    provider.connect(runtime);
    provider.dispose();
    expect(provider.isConnected).toBe(false);
  });
});
