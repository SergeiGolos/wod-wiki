import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This config lives at the repo root, so its own directory IS the root.
const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  test: {
    include: ['playground/src/lib/workoutIndex.test.ts'],
    environment: 'node',
  },
})
