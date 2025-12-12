import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { NextEventHandler } from '../NextEventHandler';
import { NextEvent } from '../NextEvent';
import { IEventHandler } from '../IEventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { ErrorAction } from '../actions/ErrorAction';

/**
 * NEW EVENT HANDLER PATTERN:
 * - handler() returns IRuntimeAction[] directly (not EventHandlerResponse)
 * - Empty array [] = "not handled" or "no error"
 * - [NextAction] = "successfully handled"
 * - [ErrorAction] = "handled with error/abort"
 */
describe('NextEventHandler', () => {
  let handler: NextEventHandler;
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    handler = new NextEventHandler('test-handler-id');
    const mockErrors: any[] = [];
    mockRuntime = {
      stack: {
        current: {
          key: { toString: () => 'test-block' },
          next: vi.fn().mockReturnValue([])
        },
        blocks: []
      },
      eventBus: { register: vi.fn(), unregisterById: vi.fn(), unregisterByOwner: vi.fn(), dispatch: vi.fn() },
      memory: {
        allocate: vi.fn(),
        deallocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        search: vi.fn().mockReturnValue([]),
        release: vi.fn()
      },
      get errors() { return mockErrors; },
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
    const actions = handler.handler(nextEvent, mockRuntime);

    // Successfully handled - returns NextAction
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveProperty('type', 'next');
  });

  it('should ignore non-next events', () => {
    const otherEvent = { name: 'other', timestamp: new Date() };
    const actions = handler.handler(otherEvent, mockRuntime);

    // Not handled - returns empty array
    expect(actions).toHaveLength(0);
  });

  it('should return error action when runtime has errors', () => {
    mockRuntime.errors!.push({ 
      error: new Error('Existing error'), 
      source: 'test',
      timestamp: new Date()
    });
    const nextEvent = new NextEvent();

    const actions = handler.handler(nextEvent, mockRuntime);

    // Abort with error - returns ErrorAction
    expect(actions).toHaveLength(1);
    expect(actions[0]).toBeInstanceOf(ErrorAction);
  });

  it('should return empty array when no current block', () => {
    (mockRuntime.stack as any).current = null;
    const nextEvent = new NextEvent();

    const actions = handler.handler(nextEvent, mockRuntime);

    // No current block - returns empty array (no error)
    expect(actions).toHaveLength(0);
  });

  it('should return error action when stack is invalid', () => {
    (mockRuntime as any).stack = null;
    const nextEvent = new NextEvent();

    const actions = handler.handler(nextEvent, mockRuntime);

    // Invalid stack - returns ErrorAction
    expect(actions).toHaveLength(1);
    expect(actions[0]).toBeInstanceOf(ErrorAction);
  });

  it('should create NextAction for valid next events', () => {
    const nextEvent = new NextEvent();
    const actions = handler.handler(nextEvent, mockRuntime);

    expect(actions[0]).toHaveProperty('type', 'next');
  });

  it('should handle multiple calls with same handler', () => {
    const nextEvent = new NextEvent();
    const actions1 = handler.handler(nextEvent, mockRuntime);
    const actions2 = handler.handler(nextEvent, mockRuntime);

    expect(actions1).toHaveLength(1);
    expect(actions2).toHaveLength(1);
  });

  it('should handle events with data', () => {
    const eventData = { source: 'button', step: 1 };
    const nextEvent = new NextEvent(eventData);
    const actions = handler.handler(nextEvent, mockRuntime);

    expect(actions).toHaveLength(1);
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
    const actions = handler.handler(malformedEvent as any, mockRuntime);

    // Malformed event not handled - returns empty array
    expect(actions).toHaveLength(0);
  });

  it('should validate runtime interface before processing', () => {
    const incompleteRuntime = { stack: null } as any;
    const nextEvent = new NextEvent();

    const actions = handler.handler(nextEvent, incompleteRuntime);

    // Invalid runtime - returns ErrorAction
    expect(actions).toHaveLength(1);
    expect(actions[0]).toBeInstanceOf(ErrorAction);
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
