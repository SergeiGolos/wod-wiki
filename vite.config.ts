/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), dts({
    // Generate TypeScript declaration files
    rollupTypes: false,
    // Disable rollup to avoid api-extractor issues
    // Include types from src directory
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    // Exclude test files and stories
    exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'stories/**/*'],
    // Preserve module structure
    insertTypesEntry: true
  })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    // Library mode configuration - single entry for simplicity
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    // Generate source maps for production builds
    sourcemap: true,
    rollupOptions: {
      // Externalize peer dependencies
      external: ['react', 'react-dom', 'react/jsx-runtime',
      // Also externalize all node_modules for tree-shaking
      /^@?[a-z]/],
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // Global variables for potential UMD build
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    },
    // Ensure CSS is bundled
    cssCodeSplit: false
  },
  // Ensure source maps are generated in development
  css: {
    devSourcemap: true
  },
  // Optimize dependencies for better debugging
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: ['react', 'react-dom']
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});