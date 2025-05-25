# Storybook Testing

## Overview

This project uses Storybook's test runner to perform interaction tests on components. The test runner uses Playwright to interact with Storybook stories to verify component functionality.

## Prerequisites

- Node.js 16 or later
- npm or yarn

## Installation

The Storybook test runner is already included as a development dependency. It was installed using:

```bash
npm install --save-dev @storybook/test-runner
```

## Running Tests

1. Start the Storybook development server:

```bash
npm run dev
```

2. In a separate terminal, run the test runner:

```bash
npm run test-storybook
```

## Writing Tests

Tests are written using the `play` function in Storybook stories. The `play` function receives a context object that includes utilities for interacting with the story canvas.

### Example: Timer Test

The `TimerTest.stories.tsx` file contains an example of an interaction test that:

1. Validates a timer component is initially in the correct state
2. Clicks a button to start the timer
3. Waits for the timer to complete
4. Verifies the timer has stopped and efforts/sets are recorded correctly

```tsx
export const TimerInteractionTest: SimpleTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    
    await step('Verify initial state', async () => {
      // Test initial component state
    });
    
    await step('Click run button to start timer', async () => {
      // Interact with the component
    });
    
    await step('Wait for timer to complete', async () => {
      // Wait for async operations
    });
    
    await step('Verify effort summary', async () => {
      // Validate final state
    });
  },
}
```

## Key Testing Utilities

- `within()`: Creates a testing instance for a specific DOM element
- `userEvent`: Simulates user interactions like clicks, typing, etc.
- `waitFor()`: Waits for conditions to be true
- `expect()`: Assertion function to verify conditions
- `step()`: Groups test steps for better error reporting

## Best Practices

1. Use data-testid attributes to select elements reliably
2. Break tests into logical steps using the `step()` function
3. Include timeouts for async operations
4. Test real user interactions rather than internal implementation
5. Keep stories focused on specific functionality

## Troubleshooting

If tests are failing, check:

1. Is Storybook running?
2. Are there any console errors in the Storybook UI?
3. Are the selectors (like data-testid) correctly matching DOM elements?
4. For timing issues, try increasing the timeout in `waitFor()`