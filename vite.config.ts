import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

// Determine if we're building the cast receiver
const isCastReceiver = process.env.BUILD_TARGET === 'cast';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // Only include dts plugin for library build
    ...(!isCastReceiver ? [dts({ insertTypesEntry: true })] : [])
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
      fileName: (format) => `wod-wiki-library.${format}.js`,
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
