/**
 * bun test setup — the bun runner equivalent of the vitest workspace config.
 *
 * vitest gives each package its own environment (packages/ui runs under
 * jsdom; contract tests run in node) and aliases workspace imports to
 * source. bun test has one global environment, so this preload:
 *
 *  1. registers jsdom DOM globals (React suites render against them; pure
 *     logic suites ignore them) — same pattern as the wod-wiki app repo's
 *     tests/unit-setup.ts;
 *  2. stubs ResizeObserver (jsdom lacks it; recharts' ResponsiveContainer
 *     and CodeMirror expect it — packages/ui/test/setup.ts parity);
 *  3. shims vitest's `it.fails` onto bun's `test.failing` (same inverted
 *     semantics: the test passes when its body throws).
 */
import { it, test } from 'bun:test';
import { JSDOM } from 'jsdom';

// ── 1. DOM globals ─────────────────────────────────────────────────────────
if (!(globalThis as { window?: unknown }).window || !globalThis.document) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    // jsdom only implements requestAnimationFrame with pretendToBeVisual —
    // CodeMirror's EditorView grabs rAF off the jsdom window itself
    // (view.win), not off globalThis.
    pretendToBeVisual: true,
  });

  (globalThis as Record<string, unknown>).window = dom.window;
  (globalThis as Record<string, unknown>).document = dom.window.document;
  (globalThis as Record<string, unknown>).navigator = dom.window.navigator;
  (globalThis as Record<string, unknown>).location = dom.window.location;

  // Expose every window global (HTMLElement, Node, UIEvent, …) that suites
  // and libraries reference at module-evaluation time.
  for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (!(key in globalThis)) {
      Object.defineProperty(globalThis, key, {
        value: (dom.window as unknown as Record<string, unknown>)[key],
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
  }

  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number;
  }
  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = (id: number): void => clearTimeout(id);
  }
}

// ── 2. ResizeObserver stub (packages/ui/test/setup.ts parity) ─────────────
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// ── 3. vitest `it.fails` → bun `test.failing` ──────────────────────────────
// Bun (1.3) has no `it.fails`; `test.failing` is the same expected-failure
// semantics, so the vitest-authored dialect suites run unmodified.
const itApi = it as unknown as Record<string, unknown>;
if (!('fails' in itApi)) itApi.fails = (test as unknown as { failing: unknown }).failing;
