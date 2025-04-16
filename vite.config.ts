import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

// Determine the build target
const buildTarget = process.env.BUILD_TARGET || 'core';const isCastReceiver = buildTarget === 'cast';
const isCore = buildTarget === 'core';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // Only include dts plugin for library build
    ...(isCore ? [dts({ insertTypesEntry: true })] : [])
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BitCobblersWodWikiLibrary',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'es' 
        ? 'index.js'
        : 'index.umd.cjs',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'monaco-editor'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'monaco-editor': 'monaco'
        },
      },
    },
  },
});
