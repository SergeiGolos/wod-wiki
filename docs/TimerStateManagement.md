# Timer State Management

## Overview

This document provides information about the timer state system implemented in wod.wiki. The timer state system controls how UI timers behave, including countdown vs. countup behavior, and the visual display of timer progress.

## TimerState Enum

The `TimerState` enum defines the possible states a timer can be in:

- `RUNNING_COUNTDOWN`: The timer is running with a countdown display (time decreasing)
- `RUNNING_COUNTUP`: The timer is running with a countup display (time increasing)
- `PAUSED`: The timer is temporarily paused
- `STOPPED`: The timer is stopped completely

## SetTimerStateAction

The `SetTimerStateAction` class is used to change the state of a timer. It emits a `SET_TIMER_STATE` event with the new state.

### Usage

```typescript
// Import the action and state enum
import { SetTimerStateAction, TimerState } from "../outputs/SetTimerStateAction";

// Create the action with the desired state
const action = new SetTimerStateAction(TimerState.RUNNING_COUNTDOWN, "primary");

// Apply the action to a runtime and block
runtime.apply([action], block);
```

## Timer State in Block Lifecycle

Timer state should be managed at key points in a block's lifecycle:

### EffortBlock

- `onEnter`: Set the timer state to `RUNNING_COUNTDOWN` if there's a duration, or `RUNNING_COUNTUP` if not
- `onLeave`: Set the timer state to `STOPPED`

### TimedGroupBlock

- `onBlockStart`: Set the timer state to `RUNNING_COUNTDOWN` for the group timer
- `onNext`: Reset the timer state to `RUNNING_COUNTDOWN` when starting a new interval (for EMOMs)
- `onBlockStop`: Set the timer state to `STOPPED`

## UI Timer Component Integration

The `WodTimer` component uses the timer state to control the display of timers. The state is accessed via the `ClockContext`, which provides:

- `isRunning`: Whether the timer is currently running (either countdown or countup)
- `isCountdown`: Whether the timer is specifically in countdown mode

This allows child clock components to display appropriate UI elements based on the timer's current state.