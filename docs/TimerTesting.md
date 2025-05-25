# WodTimer Component Testing Guide

This guide outlines the recommended approaches for testing the WodTimer component in the wod-wiki library.

## Testing Approaches

We use two main approaches for testing the WodTimer component:

1. **Unit Tests**: Testing the component's logic and rendering in isolation
2. **Storybook Interaction Tests**: Testing the component's behavior in response to user interactions

## Unit Tests

Unit tests for the WodTimer component focus on verifying that the component correctly responds to various event types and updates its internal state accordingly.

### Key Test Files:
- `src/components/clock/__tests__/WodTimer.test.tsx`

### What to Test:
- Timer state management (running, stopped, paused)
- Countdown vs. countup behavior
- Effort tracking
- Event handling

### Example: Testing Timer State

```typescript
test('should properly handle countdown timer events', () => {
  // Create mock events that simulate a countdown timer
  const events: OutputEvent[] = [
    {
      eventType: 'SET_CLOCK',
      bag: { 
        target: 'primary', 
        duration: { /* duration object */ } 
      },
      timestamp: new Date()
    },
    {
      eventType: 'SET_TIMER_STATE',
      bag: { 
        target: 'primary', 
        state: TimerState.RUNNING_COUNTDOWN
      },
      timestamp: new Date()
    }
  ];

  render(
    <WodTimer events={events}>
      <TestClockDisplay />
    </WodTimer>
  );

  expect(screen.getByTestId('is-running').textContent).toBe('true');
  expect(screen.getByTestId('is-countdown').textContent).toBe('true');
});
```

## Storybook Interaction Tests

Storybook tests provide an interactive environment to test the WodTimer component with a more realistic user experience.

### Key Story Files:
- `src/stories/WodTimer.stories.tsx`

### What to Test:
- User interactions (start, pause, reset)
- Timer progression and completion
- Visual feedback
- Integration with other components

### Example: Testing Timer Interactions

```typescript
export const InteractionTest: FiveSecondTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    
    // Step 1: Verify initial state
    await step('Verify initial state', async () => {
      const startButton = canvas.getByTestId('start-button');
      expect(startButton).toBeEnabled();
    });
    
    // Step 2: Start the timer
    await step('Start the timer', async () => {
      const startButton = canvas.getByTestId('start-button');
      await userEvent.click(startButton);
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('running');
    });
    
    // Step 3: Wait for timer completion
    await step('Wait for timer to complete', async () => {
      await waitFor(() => {
        const timerStatus = canvas.getByTestId('timer-status');
        expect(timerStatus.textContent).toContain('completed');
      }, { timeout: 6000 });
    });
  },
};
```

## Testing Simple Timer Scripts

For testing simple timer scripts like `:05 Work`, use the `FiveSecondTimer` component in the Storybook stories. This demonstrates:

1. How to properly configure the WodTimer for a simple timer
2. How to generate events to control the timer
3. How to test different timer states

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Break tests into logical steps** for better error reporting
3. **Test real user interactions** rather than just internal state
4. **Include timeouts for async operations** when waiting for timers
5. **Mock minimal requirements** to isolate component behavior

## Troubleshooting

If tests are failing:

1. Check if the ClockContext mock includes all required properties (durations, states, efforts)
2. Verify that mock events are correctly formatted
3. Ensure test timeouts are appropriate for the timer duration
4. Check that data-testid attributes match between tests and components