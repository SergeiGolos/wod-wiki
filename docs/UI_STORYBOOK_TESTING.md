# UI Storybook Testing

This document details the strategy for testing the application's user interface and high-level interaction flows using Storybook and Playwright.

## Goal
The primary goal of UI testing is to validate that the interface responds correctly to user actions and reflects the expected state of the workout. These tests focus on the **User Experience** and **Happy Paths** across various workout types.

## Core Principles
1.  **Validate the "Happy Path"**: Ensure users can start, progress through, and complete different types of workouts (Fran, Cindy, EMOMs, etc.).
2.  **UI Feedback**: Confirm that buttons (e.g., "Next Block", "Start") appear, disappear, or change labels according to the application state.
3.  **Visual Consistency**: Use screenshots to ensure no visual regressions occur in the workout display, timer, or progress indicators.
4.  **Decoupling**: These tests should *not* deep-dive into internal engine logic or stack validation unless it directly affects the UI (e.g., showing the correct exercise name).

## Infrastructure

### 1. Page Object Model (POM)
**File:** `e2e/pages/JitCompilerDemoPage.ts`

The POM provides a clean API for interacting with the workout components in Storybook:
- `gotoWorkout(name)`: Navigates to a specific workout story.
- `clickNextBlock()`: Simulates the primary user action to advance the workout.
- `setScript(content)`: Allows testing custom workout scripts.
- `waitForProcessingComplete()`: Handles the asynchronous nature of block transitions.

### 2. Standardized Selectors
Use `data-testid` and ARIA roles to keep tests resilient to styling changes:
- `page.getByRole('button', { name: /Next Block/i })`
- `page.locator('[data-testid="timer-display"]')`

## What to Validate in UI Tests

### Interaction Logic
- **Button Availability**: Does the "Next" button appear when an exercise is active?
- **Workflow Completion**: Can the user reach the "Workout Complete" screen?
- **Script Loading**: Does the UI correctly render the blocks for a given script?

### UI State Reflection
- **Exercise Names**: Is the current exercise name displayed correctly in the main viewport?
- **Timer Display**: Is the timer visible and showing the correct formatted time (e.g., `20:00`)?
- **Progress Indicators**: Are rounds or rep schemes visible to the user?

### Visual Regressions
Use Playwright's screenshot capabilities to capture the state at critical milestones:
```typescript
await demoPage.takeScreenshot('fran-round-1-thrusters');
```

## Best Practices
- **Focus on the "What"**: Test what the user sees and does, not how the engine calculates it.
- **Keep it High-Level**: If a test requires checking deep nested stack depth or specific memory IDs, it likely belongs in a **Runtime Integration Test** instead.
- **Use Storybook IDs**: Target specific stories to isolate features (e.g., `/iframe.html?id=runtime-crossfit--fran`).
