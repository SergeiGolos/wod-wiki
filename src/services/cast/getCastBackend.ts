/**
 * getCastBackend — factory that returns the build's `ICastBackend` instance.
 *
 * The selection is based on `CAST_BACKEND` (resolved from `VITE_CAST_BACKEND`
 * with the `'auto'` heuristic in `config.ts`). The factory memoizes its
 * result, so repeated calls return the same instance.
 *
 * Why a factory instead of a module-level singleton?
 * --------------------------------------------------
 * - Bundle splitting: `ChromecastBackend` and `LocalTabBackend` are imported
 *   lazily, so the unused adapter (and its dependencies) is tree-shaken
 *   out of the build.
 * - Test injection: tests can call `__setCastBackendForTest(backend)` to
 *   substitute a fake adapter (e.g. `FakeCastBackend`) without monkey-patching
 *   the singleton.
 *
 * The factory is the *only* place in the codebase that imports both
 * adapters. Everything else (the button, the view session, the bridges)
 * imports from this file or from `ICastBackend.ts`.
 */

import { CAST_BACKEND } from './config';
import { ChromecastBackend } from './adapters/ChromecastBackend';
import { LocalTabBackend } from './adapters/LocalTabBackend';
import type { ICastBackend } from './ICastBackend';
import type { CastBackendKind } from './config';

let _instance: ICastBackend | null = null;

/**
 * Pure selection helper — given a backend kind, return a fresh adapter
 * instance. Exposed for testing; production code uses `getCastBackend()`.
 */
export function createBackend(kind: Exclude<CastBackendKind, 'auto'>): ICastBackend {
    if (kind === 'chromecast') return new ChromecastBackend();
    return new LocalTabBackend();
}

/**
 * Return the build's `ICastBackend` instance, constructing it on the first
 * call. Subsequent calls return the same instance.
 */
export function getCastBackend(): ICastBackend {
    if (_instance) return _instance;
    _instance = createBackend(CAST_BACKEND);
    return _instance;
}

/**
 * Test-only escape hatch. Replaces the memoized instance; subsequent
 * `getCastBackend()` calls return the supplied backend until the next call
 * to `__resetCastBackendForTest()`.
 *
 * Not exported from the production barrel.
 */
export function __setCastBackendForTest(backend: ICastBackend | null): void {
    if (_instance && _instance !== backend) {
        try {
            _instance.dispose();
        } catch {
            // ignore
        }
    }
    _instance = backend;
}

/**
 * Test-only escape hatch. Clears the memoized instance; the next
 * `getCastBackend()` call will re-construct from `CAST_BACKEND`.
 */
export function __resetCastBackendForTest(): void {
    _instance = null;
}
