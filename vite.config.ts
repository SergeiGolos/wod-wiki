import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Generate source maps for production builds
    sourcemap: true,
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
