import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['stories/**/*', 'src/**/*.stories.*'],
    environment: 'node',
  },
});
