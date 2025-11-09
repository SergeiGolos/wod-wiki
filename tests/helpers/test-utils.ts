import { vi } from 'vitest';
import { IScriptRuntime } from '../../src/runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { IEvent } from '../../src/runtime/IEvent';
import { IRuntimeAction } from '../../src/runtime/IRuntimeAction';
import { WodScript } from '../../src/WodScript';
import { ICodeStatement } from '../../src/CodeStatement';

/**
 * Shared test utilities for runtime testing
 */

/**
 * Creates a mock WodScript with proper ID resolution for testing
 */
export function createMockScript(statements: ICodeStatement[]): WodScript {
  return new WodScript('mock source', statements, []);
}

/**
 * Creates a mock IScriptRuntime for testing
 */
export function createMockRuntime(): IScriptRuntime {
  const memoryStore = new Map<string, any>();
  
  const mockRuntime = {
    stack: {
      push: vi.fn(),
      pop: vi.fn(),
      peek: vi.fn(() => null),
      isEmpty: vi.fn(() => true),
      graph: vi.fn(() => []),
      dispose: vi.fn(),
    },
    memory: {
      allocate: vi.fn((type: string, ownerId: string, value: any) => {
        const id = `ref-${Math.random()}`;
        const ref = {
          id,
          type,
          ownerId,
          get: () => memoryStore.get(id) ?? value,
          set: (newValue: any) => memoryStore.set(id, newValue),
        };
        memoryStore.set(id, value);
        return ref;
      }),
      get: vi.fn((ref: any) => {
        if (ref && typeof ref.get === 'function') {
          return ref.get();
        }
        return ref?.value;
      }),
      set: vi.fn((ref: any, value: any) => {
        if (ref && typeof ref.set === 'function') {
          ref.set(value);
        }
      }),
      release: vi.fn(),
      search: vi.fn(() => []),
      subscribe: vi.fn(() => () => {}),
      dispose: vi.fn(),
    },
    handle: vi.fn((event: IEvent) => []),
    compile: vi.fn(),
    errors: [],
  };

  return mockRuntime as any;
}

/**
 * Creates a mock IRuntimeBlock for testing
 */
export function createMockBlock(overrides: Partial<IRuntimeBlock> = {}): IRuntimeBlock {
  return {
    key: { toString: () => 'mock-block' },
    mount: vi.fn(() => []),
    next: vi.fn(() => undefined),
    dispose: vi.fn(),
    ...overrides,
  } as any;
}

/**
 * Mocks performance.now() for timer testing
 */
export function mockPerformanceNow() {
  let currentTime = 0;
  const originalNow = performance.now;

  const timer = {
    advance: (ms: number) => {
      currentTime += ms;
    },
    set: (ms: number) => {
      currentTime = ms;
    },
    get current() {
      return currentTime;
    },
  };

  performance.now = vi.fn(() => currentTime);

  return {
    timer,
    cleanup: () => {
      performance.now = originalNow;
    },
  };
}

/**
 * Creates an event capture utility for testing event emissions
 */
export function createEventCapture() {
  const events: IEvent[] = [];

  return {
    capture: (event: IEvent) => {
      events.push(event);
    },
    get events() {
      return [...events];
    },
    findByName: (name: string) => {
      return events.filter(e => e.name === name);
    },
    clear: () => {
      events.length = 0;
    },
  };
}
