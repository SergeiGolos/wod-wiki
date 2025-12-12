import { vi } from 'bun:test';
import { JSDOM } from 'jsdom';

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
}

// Provide vi.mocked helper for compatibility across tests
if (!(vi as any).mocked) {
  Object.defineProperty(vi as any, 'mocked', {
    value: <T>(fn: T): T => fn,
    writable: false,
    configurable: true,
  });
}
