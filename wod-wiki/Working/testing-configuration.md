---
title: "Testing Configuration Guide"
date: 2025-06-26
tags: [testing, configuration, vitest, playwright, storybook]
related: ["../Core/testing-strategy.md"]
---

# Testing Configuration Guide

## Overview

This project is configured to run two different types of tests using a unified Vitest configuration:

1. **Unit Tests**: Regular Node.js tests for business logic (like `BlockKey.spec.ts`)
2. **Component Tests**: Playwright tests that run against Storybook components (like `label-anchor-component.spec.ts`)

## Test Types

### Unit Tests
- **Location**: `src/**/*.{test,spec}.{js,ts}`
- **Environment**: Node.js
- **Purpose**: Testing business logic, utilities, and non-UI components
- **Example**: `src/BlockKey.spec.ts`

### Storybook Component Tests
- **Location**: `stories/**/*.{test,spec}.{js,ts}`
- **Environment**: Browser (Playwright)
- **Purpose**: Testing React components in isolation using Storybook
- **Example**: `stories/clock/label-anchor-component.spec.ts`

## Configuration

### Vitest Projects
The configuration uses Vitest's project feature to separate test environments:

```javascript
// vitest.config.js
test: {
  projects: [
    {
      name: 'unit',
      test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['stories/**/*', 'src/**/*.stories.*'],
        environment: 'node',
      },
    },
    {
      name: 'storybook',
      test: {
        include: ['stories/**/*.{test,spec}.{js,ts}'],
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{ browser: 'chromium' }]
        },
        setupFiles: ['.storybook/vitest.setup.js'],
      },
    },
  ],
}
```

## Available Scripts

### Running All Tests
```bash
npm test                    # Run all tests (unit + storybook)
```

### Running Specific Test Types
```bash
npm run test:unit          # Run only unit tests
npm run test:storybook     # Run only Storybook component tests
```

### Watch Mode
```bash
npm run test:watch         # Watch unit tests
npm run test:storybook:watch # Watch Storybook tests
```

### Legacy E2E Tests
```bash
npm run test:e2e           # Run standalone Playwright tests
```

## Dependencies

### Required Dependencies
- `vitest`: Test runner
- `@vitest/browser`: Browser testing support
- `@storybook/addon-vitest`: Storybook integration
- `playwright`: Browser automation
- `@playwright/test`: Playwright test framework

### Setup Files
- `.storybook/vitest.setup.js`: Configures Storybook annotations for tests

## Test File Patterns

### Unit Test Example
```typescript
// src/BlockKey.spec.ts
import { describe, it, expect } from 'vitest';
import { BlockKey } from './BlockKey';

describe('BlockKey', () => {
  it('should create instance', () => {
    const key = new BlockKey('test');
    expect(key.blockId).toBe('test');
  });
});
```

### Storybook Test Example
```typescript
// stories/clock/label-anchor-component.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Label Anchor Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/clock-label-anchor--default');
  });

  test('should display component', async ({ page }) => {
    const component = page.frameLocator('iframe').locator('text=No exercise');
    await expect(component).toBeVisible();
  });
});
```

## Best Practices

### File Organization
- Keep unit tests next to source files in `src/`
- Keep component tests in `stories/` directory
- Use descriptive test file names ending in `.spec.ts`

### Test Isolation
- Unit tests should not depend on browser environment
- Component tests should test user interactions and visual behavior
- Avoid mixing test types in the same file

### Performance
- Unit tests run faster as they don't require browser setup
- Component tests provide better integration coverage
- Use appropriate test type for each scenario

## Troubleshooting

### Storybook Not Starting
Ensure Storybook is running on port 6006:
```bash
npm run storybook
```

### Browser Tests Failing
Check that Playwright browsers are installed:
```bash
npx playwright install
```

### Test Environment Issues
- Unit tests run in Node.js environment
- Component tests run in browser environment
- Use appropriate APIs for each environment

## Migration Notes

### From Previous Setup
- Unit tests remain unchanged
- Storybook tests now use the new Vitest addon
- Removed need for separate Playwright configuration for Storybook tests
- Unified test runner command

### Benefits
- Single test runner for all test types
- Consistent reporting and coverage
- Better IDE integration
- Simplified CI/CD configuration
