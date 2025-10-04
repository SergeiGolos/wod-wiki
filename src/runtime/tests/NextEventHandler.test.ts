import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextEventHandler } from '../NextEventHandler';
import { NextEvent } from '../NextEvent';
import { IEventHandler, EventHandlerResponse } from '../IEventHandler';
import { IScriptRuntime } from '../IScriptRuntime';

describe('NextEventHandler', () => {
  let handler: NextEventHandler;
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    handler = new NextEventHandler('test-handler-id');
    mockRuntime = {
      stack: {
        current: {
          key: { toString: () => 'test-block' },
          next: vi.fn().mockReturnValue([])
        },
        blocks: []
      },
      memory: {
        state: 'normal',
        allocate: vi.fn(),
        deallocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn()
      },
      hasErrors: vi.fn().mockReturnValue(false),
      setError: vi.fn(),
      handle: vi.fn()
    } as any;
  });

  it('should implement IEventHandler interface', () => {
    expect(handler).toSatisfy((h: any) =>
      'id' in h &&
      'name' in h &&
      'handler' in h &&
      typeof h.handler === 'function'
    );
  });

  it('should have unique id from constructor', () => {
    expect(handler.id).toBe('test-handler-id');
  });

  it('should have correct handler name', () => {
    expect(handler.name).toBe('next-handler');
  });

  it('should handle next events correctly', () => {
    const nextEvent = new NextEvent();
    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(false);
    expect(response.actions).toHaveLength(1);
  });

  it('should ignore non-next events', () => {
    const otherEvent = { name: 'other', timestamp: new Date() };
    const response = handler.handler(otherEvent, mockRuntime);

    expect(response.handled).toBe(false);
    expect(response.abort).toBe(false);
    expect(response.actions).toHaveLength(0);
  });

  it('should return abort when runtime has errors', () => {
    vi.mocked(mockRuntime.hasErrors).mockReturnValue(true);
    const nextEvent = new NextEvent();

    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(true);
    expect(response.actions).toHaveLength(0);
  });

  it('should return abort when no current block', () => {
    mockRuntime.stack.current = null as any;
    const nextEvent = new NextEvent();

    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(false);
    expect(response.actions).toHaveLength(0);
  });

  it('should return abort when memory state is corrupted', () => {
    mockRuntime.memory.state = 'corrupted';
    const nextEvent = new NextEvent();

    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(true);
    expect(response.actions).toHaveLength(0);
  });

  it('should create NextAction for valid next events', () => {
    const nextEvent = new NextEvent();
    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.actions[0]).toHaveProperty('type', 'next');
  });

  it('should handle multiple calls with same handler', () => {
    const nextEvent = new NextEvent();
    const response1 = handler.handler(nextEvent, mockRuntime);
    const response2 = handler.handler(nextEvent, mockRuntime);

    expect(response1.handled).toBe(true);
    expect(response2.handled).toBe(true);
    expect(response1.actions).toHaveLength(1);
    expect(response2.actions).toHaveLength(1);
  });

  it('should handle events with data', () => {
    const eventData = { source: 'button', step: 1 };
    const nextEvent = new NextEvent(eventData);
    const response = handler.handler(nextEvent, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.actions).toHaveLength(1);
  });

  it('should have readonly id property', () => {
    expect(() => {
      (handler as any).id = 'modified';
    }).toThrow();
  });

  it('should have readonly name property', () => {
    expect(() => {
      (handler as any).name = 'modified';
    }).toThrow();
  });

  it('should create unique handlers with different IDs', () => {
    const handler1 = new NextEventHandler('handler-1');
    const handler2 = new NextEventHandler('handler-2');

    expect(handler1.id).toBe('handler-1');
    expect(handler2.id).toBe('handler-2');
    expect(handler1.name).toBe(handler2.name);
  });

  it('should handle malformed events gracefully', () => {
    const malformedEvent = { name: null, timestamp: 'invalid' };
    const response = handler.handler(malformedEvent as any, mockRuntime);

    expect(response.handled).toBe(false);
    expect(response.abort).toBe(false);
    expect(response.actions).toHaveLength(0);
  });

  it('should validate runtime interface before processing', () => {
    const incompleteRuntime = { stack: null } as any;
    const nextEvent = new NextEvent();

    const response = handler.handler(nextEvent, incompleteRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(true);
    expect(response.actions).toHaveLength(0);
  });

  it('should execute within performance targets', () => {
    const nextEvent = new NextEvent();
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      handler.handler(nextEvent, mockRuntime);
    }

    const end = performance.now();
    const avgTime = (end - start) / 100;

    expect(avgTime).toBeLessThan(10); // Target: <10ms per handler execution
  });
});