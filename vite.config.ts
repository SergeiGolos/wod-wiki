import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }),
    tsconfigPaths(),
  ],
  build: {
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
