import { vi } from 'bun:test';
import { mock } from 'bun:test';
import { JSDOM } from 'jsdom';

// ── JSDOM setup ─────────────────────────────────────────────────────────────
// MUST run before any module imports so React and other DOM-sensitive packages
// initialize with window/document present.
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

// ── IndexedDB polyfill ──────────────────────────────────────────────────────
import 'fake-indexeddb/auto';
// ── Pre-mock Vite-specific modules ──────────────────────────────────────────
// These modules use `import.meta.glob` which is only available in Vite builds.
// Registering stubs here prevents the "import.meta.glob is not a function"
// error when these modules are loaded transitively via component imports.
// Individual tests can override these stubs with their own vi.mock() calls.

// The real adapter is import-safe (glob calls are deferred), so spread it to
// keep pure helpers (getFeedDateKeys, getScriptFeedItem) exercising real code
// while the glob-backed readers stay stubbed.
const realScriptFeeds = await import('@/repositories/script-feeds');
mock.module('@/repositories/script-feeds', () => ({
  ...realScriptFeeds,
  getScriptFeeds: () => [],
  getScriptFeed: (_slug: string) => null,
}));

mock.module('@/repositories/script-collections', () => ({
  getScriptCollections: () => [],
  getScriptCollection: (_slug: string) => null,
}));

mock.module('@/repositories/script-loader', () => ({
  getScriptContent: (_id: string) => undefined,
  getAllScriptIds: () => [],
}));

mock.module('@/repositories/page-examples', () => ({
  getTabExamples: (_page: string, _section: string) => [],
  getHomeExample: (_name: string) => '',
}));

// The real module is import-safe (glob calls are deferred), so spread it to
// keep the pure document-format functions (effortToDocument, documentToEffort,
// parseEffortFile) exercising real code while the glob-backed readers stay
// stubbed.
const realEffortMarkdown = await import('@/repositories/effort-markdown');
mock.module('@/repositories/effort-markdown', () => ({
  ...realEffortMarkdown,
  getBundledEfforts: () => [
    {
      id: 'effort-bundled-rowing',
      slug: 'rowing',
      label: 'Rowing',
      aliases: ['row', 'rower', 'erg'],
      baseAttributes: { met: 7.0, discipline: 'rowing', intensityTier: 'high' },
      registrySource: 'bundled',
    },
    {
      id: 'effort-bundled-burpee',
      slug: 'burpee',
      label: 'Burpee',
      aliases: ['burpees'],
      baseAttributes: { met: 10.0, discipline: 'bodyweight', intensityTier: 'high' },
      registrySource: 'bundled',
    },
    {
      id: 'effort-bundled-running-6mph',
      slug: 'running-6-mph',
      label: 'Running (6 mph)',
      aliases: ['run', 'jogging', 'treadmill'],
      baseAttributes: { met: 9.8, discipline: 'running', intensityTier: 'moderate' },
      registrySource: 'bundled',
    },
  ],
  getBundledEffortCount: () => 3,
  getEffortMarkdown: (_slug: string) => null,
}));


// Provide vi.mocked helper for compatibility across tests
if (!(vi as any).mocked) {
  Object.defineProperty(vi as any, 'mocked', {
    value: <T>(fn: T): T => fn,
    writable: false,
    configurable: true,
  });
}
// ── Pre-mock workbenchSyncStore for components that use useUserOverrides ──────
mock.module('@/stores/workbenchSyncStore', () => {
  const overrides = new Map();
  return {
    useWorkbenchSyncStore: (selector: any) => {
      const state = { 
        userOutputOverrides: overrides,
        viewMode: 'track',
        execution: { status: 'idle' },
      };
      return selector ? selector(state) : state;
    },
    create: () => ({
      getState: () => ({ userOutputOverrides: overrides }),
      setState: () => {},
      subscribe: () => () => {},
    }),
  };
});
