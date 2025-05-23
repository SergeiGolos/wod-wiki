# ResultSpan -> Timer Update System

## Overview

This document explains the implementation of the ResultSpan -> Timer Update system, which provides a more direct integration between ResultSpan tracking and UI components.

## Components

1. **SetResultSpanAction**
   - Extends `OutputAction` to update a named clock with a ResultSpan
   - Sends a `SET_CLOCK` event with the ResultSpan's timeSpans converted into a TimeSpanDuration
   - Includes the original ResultSpan in the event payload for additional context

2. **useClockRegistry Hook**
   - Maintains a map of clock names to their current ISpanDuration objects
   - Listens for `SET_CLOCK` events and updates the registry accordingly
   - Provides access to the current state of all clocks

3. **WodTimer Component Updates**
   - Now accepts an `events` prop for integration with useClockRegistry
   - Prioritizes clock values from the registry over direct props
   - Provides smooth, continuous updates from multiple sources

4. **RuntimeBlock Changes**
   - Implements the `spans()` and `addSpan()` methods from the `IRuntimeBlock` interface
   - Stores spans in a private `_spans` property

## Integration Points

1. **StartTimerAction**
   - Creates and updates RuntimeSpans with proper TimeSpan records
   - Pushes ResultSpan updates using SetResultSpanAction
   - Registers spans in the ResultSpanRegistry

2. **StopTimerAction**
   - Updates the last TimeSpan with a stop timestamp
   - Pushes ResultSpan updates using SetResultSpanAction
   - Updates the ResultSpanRegistry

3. **TimerRuntime**
   - Maintains a ResultSpanRegistry instance
   - Registers spans from blocks when pushing/popping

## Usage

To use the ResultSpan -> Timer Update system in a component:

```tsx
import { useTimerRuntime } from '@/hooks';
import { WodTimer } from '@/components/clock';

const MyComponent = () => {
  const { output$ } = useTimerRuntime();
  
  return (
    <WodTimer
      label="My Timer"
      primary={somePrimaryDuration}
      total={someTotalDuration}
      events={output$}
    />
  );
};
```

This will display a timer that updates based on both direct prop values and any ResultSpan-based updates pushed through the runtime system.