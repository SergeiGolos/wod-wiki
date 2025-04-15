import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

// Determine the build target
const buildTarget = process.env.BUILD_TARGET || 'core';
const isCastReceiver = buildTarget === 'cast';
const isCore = buildTarget === 'core';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // Only include dts plugin for library build
    ...(isCore ? [dts({ insertTypesEntry: true })] : [])
  ],
  build: isCastReceiver ? {
    outDir: 'public/cast',
    emptyOutDir: false,
    // Define entry point specifically for cast build
    rollupOptions: {
      input: resolve(__dirname, 'src/cast/index.tsx'),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
      }
    },
  } : {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WodWikiLibrary',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'es' 
        ? 'wod-wiki-library.js'
        : 'wod-wiki-library.umd.cjs',
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
