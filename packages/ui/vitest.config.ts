import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * @wod-wiki/ui tests render React components (CodeMirror widgets, dashboard
 * views, composer), so they run under jsdom. Cross-package imports resolve to
 * source so tests exercise the in-repo implementation, never a stale dist.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@wod-wiki/core': resolve(__dirname, '../core/src'),
      '@wod-wiki/lang': resolve(__dirname, '../lang/src'),
      '@wod-wiki/wql': resolve(__dirname, '../wql/src'),
    },
  },
});
