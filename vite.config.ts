import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      fileName: (format) => `mylib.${format}.js`
    },
    rollupOptions: {
      external: ['monaco-editor'],
      output: {
        globals: {
          'monaco-editor': 'monaco'
        }
      }
    }
  },
  worker: {
    format: 'es',    
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
  resolve: {
    alias: {
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    },
  }
});