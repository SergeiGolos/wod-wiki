import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
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

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: '.storybook',
    }),
  ],
  optimizeDeps: {
    include: [
      'storybook/test',
      '@storybook/react-vite',
      'react-router-dom',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'tailwind-merge',
      'clsx',
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
    exclude: ['@lezer/common'],
  },
  resolve: {
    dedupe: ['react', 'react-dom', ...codemirrorSingletonDeps],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      react: path.resolve(process.cwd(), 'node_modules/react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
    },
  },
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      instances: [
        { browser: 'chromium' },
      ],
      provider: playwright(),
      headless: true,
    },
    fileParallelism: false,
    sequence: { sequential: true },
    setupFiles: ['.storybook/vitest.setup.ts'],
    reporters: process.env.CI
      ? [['default'], ['junit', { outputFile: 'test-results/storybook-junit.xml' }]]
      : ['default'],
  },
});
