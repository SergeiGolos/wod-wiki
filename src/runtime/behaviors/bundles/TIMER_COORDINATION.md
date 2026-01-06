# Timer State Coordination Guide

## Overview

This document describes the timer state management architecture and how TimerBundle provides coordinated timer behavior composition to prevent race conditions and state conflicts.

## Problem Statement

Prior to consolidation, timer state was manipulated by multiple behaviors:
- `TimerBehavior` - Core timer logic
- `TimerStateManager` - Memory synchronization  
- `TimerPauseResumeBehavior` - Pause/resume handling
- `IntervalTimerRestartBehavior` - EMOM-specific restarts
- `SoundBehavior` - Sound cues based on timer state

This led to:
- **Race conditions** when multiple behaviors modified timer state
- **Implicit dependencies** between behaviors
- **Fragile ordering** requirements
- **Difficult debugging** with multiple sources of truth

## Solution: TimerBundle Coordination

`TimerBundle` provides a coordinated set of timer behaviors that work together safely.

### Architecture

```
TimerBundle.create(config)
    ↓
[TimerBehavior] ← Core timer state (single source of truth)
    ↑ references
[TimerPauseResumeBehavior] ← Pause/resume coordination
    ↑ queries
[SoundBehavior] ← Sound cues
    ↑ checks completion
[CompletionBehavior] ← Completion detection
```

### Key Principles

1. **Single Timer Instance**: Only one TimerBehavior per block
2. **Coordinated References**: Other behaviors reference the timer, not manipulate it directly
3. **Ordered Initialization**: Timer behavior is first so others can reference it
4. **Explicit Configuration**: All timer features configured through bundle config

### Usage

#### Basic Timer

```typescript
// Simple countdown
const behaviors = [
    ...TimerBundle.create({
        direction: 'down',
        durationMs: 60000
    })
];
```

#### Full-Featured Timer

```typescript
// Countdown with sound, pause/resume
const behaviors = [
    ...TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enableSound: true,
        enablePauseResume: true,
        label: 'Work'
    })
];
```

#### EMOM/Interval Timers

For intervals that restart on each round:

```typescript
const behaviors = [
    ...TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enableSound: true
    }),
    new RoundPerNextBehavior(),
    new IntervalTimerRestartBehavior()  // Add AFTER TimerBundle
];
```

**Important**: `IntervalTimerRestartBehavior` must be added AFTER TimerBundle so it can reference the timer instance.

## Remaining Timer Behaviors

### When to Use Outside TimerBundle

Some timer-related behaviors have specialized responsibilities and should be added separately:

#### IntervalTimerRestartBehavior
- **Purpose**: Restarts timer at the start of each round (EMOM workouts)
- **When to use**: EMOM/interval workouts with repeating timer cycles
- **Placement**: After TimerBundle and round tracking behaviors

#### LapTimerBehavior
- **Purpose**: Tracks lap times for each round
- **When to use**: Workouts where round split times matter
- **Placement**: With LoopBundle (already included)

### TimerStateManager

`TimerStateManager` is an internal coordination class used by `TimerBehavior`. Do not use it directly.

## Migration Guide

### Before (Manual Composition)

```typescript
// Old approach - multiple behaviors, implicit dependencies
const timer = new BoundTimerBehavior(60000, 'down');
behaviors.push(timer);
behaviors.push(new TimerPauseResumeBehavior());
behaviors.push(new SoundBehavior({...}));
behaviors.push(new CompletionBehavior(
    (_block, now) => timer.isComplete(now),
    ['timer:tick', 'timer:complete']
));
```

Problems:
- Manual coordination required
- Easy to forget behaviors
- Fragile ordering
- `timer` reference must be maintained

### After (TimerBundle)

```typescript
// New approach - coordinated bundle
behaviors.push(...TimerBundle.create({
    direction: 'down',
    durationMs: 60000,
    enableSound: true,
    enablePauseResume: true
}));
```

Benefits:
- ✅ Single configuration point
- ✅ Coordinated initialization
- ✅ Correct ordering guaranteed
- ✅ No manual reference management

## Best Practices

1. **Always use TimerBundle** for timer-based blocks
2. **Never add multiple TimerBehavior instances** to the same block
3. **Add specialized behaviors after TimerBundle** (e.g., IntervalTimerRestartBehavior)
4. **Document timer requirements** in strategy comments
5. **Test timer coordination** with integration tests

## Testing

When testing blocks with timers:

```typescript
import { RuntimeTestBuilder } from '../harness';

it('should coordinate timer behaviors', () => {
    const harness = new RuntimeTestBuilder()
        .withScript('1:00 Work')
        .build();
    
    const block = harness.pushStatement(0);
    harness.mount();
    
    // Timer should be running
    const timer = block.getBehavior(TimerBehavior);
    expect(timer?.isRunning()).toBe(true);
    
    // Pause/resume should work
    harness.simulateEvent('timer:pause');
    expect(timer?.isPaused()).toBe(true);
});
```

## Troubleshooting

### Timer not starting
- Check that TimerBundle is in the behaviors array
- Verify mount() was called on the block

### Pause/resume not working
- Ensure `enablePauseResume` is true (default)
- Check that timer:pause/timer:resume events are being dispatched

### Multiple timers conflicting
- Remove manual TimerBehavior instances
- Use only TimerBundle for timer setup

### Sound cues not playing
- Verify `enableSound: true` in config
- Check that `direction: 'down'` and `durationMs` is set
- Ensure SoundCue configuration is correct

## Related Documentation

- [Behavior Overlap Assessment](../../../../docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md)
- [Behavior Bundles Overview](./index.ts)
- [Runtime Architecture](../../../../docs/jit-strategies-overview.md)
