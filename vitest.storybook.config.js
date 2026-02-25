import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: '.storybook',
    }),
  ],
  optimizeDeps: {
    include: [
      '@storybook/test',
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
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
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
      provider: 'playwright',
      headless: true,
    },
    setupFiles: ['.storybook/vitest.setup.ts'],
  },
});
