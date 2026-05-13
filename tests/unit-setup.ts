import { vi } from 'bun:test';
import { mock } from 'bun:test';
import { JSDOM } from 'jsdom';

// ── Pre-mock Vite-specific modules ──────────────────────────────────────────
// These modules use `import.meta.glob` which is only available in Vite builds.
// Registering stubs here prevents the "import.meta.glob is not a function"
// error when these modules are loaded transitively via component imports.
// Individual tests can override these stubs with their own vi.mock() calls.

mock.module('@/repositories/wod-feeds', () => ({
  getWodFeeds: () => [],
  getWodFeed: (_slug: string) => null,
  getFeedDateKeys: (_feed: any) => [],
}));

mock.module('@/repositories/wod-collections', () => ({
  getWodCollections: () => [],
  getWodCollection: (_slug: string) => null,
}));

mock.module('@/repositories/wod-loader', () => ({
  getWodContent: (_id: string) => undefined,
  getAllWodIds: () => [],
}));

mock.module('@/repositories/page-examples', () => ({
  getTabExamples: (_page: string, _section: string) => [],
  getHomeExample: (_name: string) => '',
}));

// Some src/ tests import browser-only libraries (e.g. monaco-editor, react-dom)
// that assume `window` and `document` exist at module-evaluation time.
if (!(globalThis as any).window || !globalThis.document) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });

  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;
  (globalThis as any).location = dom.window.location as any;

  // Monaco checks these clipboard APIs; jsdom doesn't implement them.
  if (!(globalThis.document as any).queryCommandSupported) {
    (globalThis.document as any).queryCommandSupported = () => false;
  }
  if (!(globalThis.document as any).execCommand) {
    (globalThis.document as any).execCommand = () => false;
  }

  // Make common DOM globals available at global scope (e.g. UIEvent for monaco).
  for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (!(key in globalThis)) {
      Object.defineProperty(globalThis, key, {
        value: (dom.window as any)[key],
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
  }

  // Polyfill requestAnimationFrame/cancelAnimationFrame for animation-based hooks
  if (!(globalThis as any).requestAnimationFrame) {
    (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    };
  }
  if (!(globalThis as any).cancelAnimationFrame) {
    (globalThis as any).cancelAnimationFrame = (id: number): void => {
      clearTimeout(id);
    };
  }
}

// Provide vi.mocked helper for compatibility across tests
if (!(vi as any).mocked) {
  Object.defineProperty(vi as any, 'mocked', {
    value: <T>(fn: T): T => fn,
    writable: false,
    configurable: true,
  });
}
