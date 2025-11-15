import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      // Generate TypeScript declaration files
      rollupTypes: false, // Disable rollup to avoid api-extractor issues
      // Include types from src directory
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // Exclude test files and stories
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'stories/**/*'],
      // Preserve module structure
      insertTypesEntry: true,
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Library mode configuration - single entry for simplicity
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    // Generate source maps for production builds
    sourcemap: true,
    rollupOptions: {
      // Externalize peer dependencies
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'monaco-editor',
        '@monaco-editor/react',
        // Also externalize all node_modules for tree-shaking
        /^@?[a-z]/
      ],
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // Global variables for potential UMD build
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    // Ensure CSS is bundled
    cssCodeSplit: false,
  },
  // Ensure source maps are generated in development
  css: {
    devSourcemap: true,
  },
  // Optimize dependencies for better debugging
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: ['react', 'react-dom'],
  },
})
