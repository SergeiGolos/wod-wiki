import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const CODEMIRROR_SINGLETON_DEPS = [
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

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@bitcobblers/wod-wiki-engine': path.resolve(rootDir, 'packages/engine/src/index.ts'),
      '@bitcobblers/wod-wiki-ui/styles.css': path.resolve(rootDir, 'packages/ui/src/styles.css'),
      '@bitcobblers/wod-wiki-ui/extensions': path.resolve(rootDir, 'packages/ui/src/extensions/index.ts'),
      '@bitcobblers/wod-wiki-ui': path.resolve(rootDir, 'packages/ui/src'),
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
    },
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
