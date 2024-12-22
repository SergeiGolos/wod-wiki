import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], 
    exclude: ['stories/**/*'],   
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
      ],
      exclude: [
        'stories/**/*',
        '**/*.stories.ts',
        '**/*.spec.ts',
        'node_modules/**',
        '.storybook/**'
      ]
    },
  },
});
