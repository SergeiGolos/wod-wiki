import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const codemirrorSingletonDeps = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  '@lezer/markdown',
];

// Root config: shared vitest workspace (vitest.glob.config.ts extends from
// this) and the local dev fallback. The playground app builds via
// playground/vite.config.ts; the old library build and the Storybook vitest
// project lived here and moved to the wod-wiki-engine repo with the packages.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: codemirrorSingletonDeps,
    alias: {
      '@': resolve(dirname, 'src')
    }
  },
  // Ensure source maps are generated in development
  css: {
    devSourcemap: true
  },
  // Optimize dependencies for better debugging
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: ['react', 'react-dom'],
    exclude: ['@lezer/common']
  },
});
