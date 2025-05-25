# WodTimer Component Testing Guide

This guide outlines the recommended approaches for testing the WodTimer component in the wod-wiki library.

## Testing Approaches

We use two main approaches for testing the WodTimer component:

1. **Unit Tests**: Testing the component's logic and rendering in isolation
2. **Storybook Interaction Tests**: Testing the component's behavior in response to user interactions

## Unit Testing

Unit tests for the WodTimer component focus on verifying that the component correctly responds to various event types and updates its internal state accordingly.

### Key Test Files:
- `src/components/clock/__tests__/WodTimer.test.tsx`

### What to Test:
- Timer state management (running, stopped, paused)
- Countdown vs. countup behavior
- Effort tracking
- Event handling

## Storybook Interaction Testing

Storybook tests provide an interactive environment to test the WodTimer component with a more realistic user experience.

### Key Story Files:
- `src/stories/SimpleWorkTimer.stories.tsx` - Tests a basic ":05 Work" timer
- `src/stories/WodTimer.stories.tsx` - More comprehensive timer tests

### What to Test:
- User interactions (start, pause, reset)
- Timer progression and completion
- Visual feedback
- Integration with other components

## Testing ":05 Work" Timer Example

The `SimpleWorkTimer.stories.tsx` file demonstrates how to test a simple 5-second work timer, which is equivalent to the script `:05 Work`:

```typescript
// Example: Testing a simple 5-second timer in Storybook
export const TimerTest: SimpleWorkTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    
    // Step 1: Verify initial state
    await step('Verify initial state', async () => {
      const runButton = canvas.getByTestId('run-button');
      expect(runButton).toBeEnabled();
    });
    
    // Step 2: Start the timer
    await step('Start the timer', async () => {
      const runButton = canvas.getByTestId('run-button');
      await userEvent.click(runButton);
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Running');
    });
    
    // Step 3: Wait for the timer to complete
    await step('Wait for timer to complete', async () => {
      await waitFor(() => {
        const timerStatus = canvas.getByTestId('timer-status');
        expect(timerStatus.textContent).toContain('Completed');
      }, { timeout: 6000 });
    });
  },
};
```

## Creating a Timer Component for Testing

When testing the WodTimer component, you need to:

1. **Create output events**: Generate the correct sequence of events for various timer states
2. **Manage event timings**: Update events at appropriate intervals to simulate timer progress
3. **Track timer state**: Maintain the timer state for proper UI feedback

### Example: Creating a Simple Timer for Testing

```typescript
const SimpleWorkTimer = () => {
  const [events, setEvents] = useState<OutputEvent[]>([]);
  const [timerState, setTimerState] = useState<'ready' | 'running' | 'completed'>('ready');

  // Initial timer setup
  useEffect(() => {
    setEvents([
      {
        eventType: 'SET_CLOCK',
        bag: {
          target: 'primary',
          duration: createSpanDuration(5000, 0, 5000, '-'), // 5 seconds
          effort: 'Work'
        },
        timestamp: new Date()
      }
    ]);
  }, []);

  // Start timer function
  const startTimer = () => {
    setEvents(prev => [
      ...prev,
      {
        eventType: 'SET_TIMER_STATE',
        bag: {
          target: 'primary',
          state: TimerState.RUNNING_COUNTDOWN
        },
        timestamp: new Date()
      }
    ]);
    setTimerState('running');
    
    // Update timer every second...
  };

  return (
    <div>
      <WodTimer events={events}>
        <DefaultClockLayout label="Work" />
      </WodTimer>
      <button onClick={startTimer}>Start</button>
    </div>
  );
};
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Break tests into logical steps** for better error reporting
3. **Test real user interactions** rather than just internal state
4. **Include timeouts for async operations** when waiting for timers
5. **Test all timer states**: ready, running, completed
6. **Verify button states** are properly updated based on timer state

## Common Timer Events

The WodTimer component responds to these key event types:

1. **SET_CLOCK**: Updates the timer duration and display
   ```typescript
   {
     eventType: 'SET_CLOCK',
     bag: {
       target: 'primary',
       duration: { /* ISpanDuration object */ },
       effort: 'Work' // Optional effort name
     },
     timestamp: new Date()
   }
   ```

2. **SET_TIMER_STATE**: Changes the timer state
   ```typescript
   {
     eventType: 'SET_TIMER_STATE',
     bag: {
       target: 'primary',
       state: TimerState.RUNNING_COUNTDOWN // or other states
     },
     timestamp: new Date()
   }
   ```

3. **SET_EFFORT**: Sets the current effort label
   ```typescript
   {
     eventType: 'SET_EFFORT',
     bag: {
       target: 'primary',
       effort: 'Work'
     },
     timestamp: new Date()
   }
   ```

## Troubleshooting

If tests are failing:

1. Check that events are properly formatted and include all required properties
2. Verify that the timer duration calculations are correct
3. Ensure timeouts are sufficient for timer completion
4. Check that events are being passed correctly to the WodTimer component
5. Use console.log to debug timer state and events during testing