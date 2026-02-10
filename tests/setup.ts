import '@testing-library/jest-dom';
import { afterAll, beforeAll, vi } from 'bun:test';

// Vitest <2 compatibility: provide vi.mocked helper used across tests
if (!(vi as any).mocked) {
  Object.defineProperty(vi as any, 'mocked', {
    value: <T>(fn: T): T => fn,
    writable: false,
    configurable: true,
  });
}

// Mock React 18 createRoot if not available
if (!globalThis.document) {
  globalThis.document = {
    createElement: vi.fn(),
    head: {},
    body: {},
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any;
}

// Mock performance API if not available
if (!globalThis.performance) {
  globalThis.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  } as any;
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn((...args: unknown[]) => {
    // Allow certain expected errors
    const errorMsg = args.join(' ');
    if (
      errorMsg.includes('Warning: ReactDOM.render is no longer supported') ||
      errorMsg.includes('act(...) is not supported')
    ) {
      return;
    }
    originalError(...args);
  });

  console.warn = vi.fn((...args: unknown[]) => {
    const warnMsg = args.join(' ');
    if (warnMsg.includes('componentWillReceiveProps')) {
      return;
    }
    originalWarn(...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
