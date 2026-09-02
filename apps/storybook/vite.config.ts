import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CODEMIRROR_SINGLETON_DEPS, workspaceAliases } from './aliases.ts';

const rootDir = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
    alias: workspaceAliases(rootDir),
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'recharts',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      ...CODEMIRROR_SINGLETON_DEPS,
    ],
    exclude: ['@lezer/common'],
  },
});
