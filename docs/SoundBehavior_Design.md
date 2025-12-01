# SoundBehavior Design Document

## Overview

This document outlines the design for a `SoundBehavior` that allows audio cues to be played during workout execution, synchronized with timer events. The behavior supports configurable sound triggers at specific time intervals relative to timer completion.

## Problem Statement

Workout applications need audio feedback to:
1. Alert users when a timer is about to complete (countdown warnings)
2. Signal timer completion (beeps, buzzes)
3. Provide interval markers (e.g., every minute)
4. Support multiple concurrent sound cues at different time thresholds

## Architecture

### Component Diagram

```mermaid
flowchart TD
    subgraph Runtime
        TB[TimerBehavior] -->|timer:tick| EH[Event Handler]
        TB -->|timer:complete| EH
        SB[SoundBehavior] -->|registers| EH
        EH -->|triggers| SB
    end
    
    subgraph Actions
        SB -->|returns| PSA[PlaySoundAction]
        PSA -->|do()| SP[Sound Player]
    end
    
    subgraph UI
        SP -->|plays| Audio[Audio Context]
    end
```

### Design Principles

1. **Declarative Sound Configuration**: Sound cues are configured declaratively with time thresholds
2. **Timer Synchronization**: Sounds are triggered based on `timer:tick` events, not wall-clock time
3. **Composable Behavior**: Works alongside other behaviors (TimerBehavior, CompletionBehavior)
4. **Action-Based Architecture**: Returns `PlaySoundAction` for consistent runtime patterns
5. **Multiple Cue Support**: Multiple sounds can be configured for different time points
6. **Deduplication**: Each cue triggers only once per timer lifecycle

## Detailed Design

### 1. SoundCue Configuration

```typescript
/**
 * Configuration for a single sound cue.
 */
interface SoundCue {
  /** Unique identifier for this cue */
  id: string;
  
  /** Time remaining (in ms) when this cue should trigger. 
   *  For countdown timers: triggers when remainingMs <= threshold
   *  For count-up timers: triggers when elapsedMs >= threshold
   */
  threshold: number;
  
  /** Sound to play (URL, base64, or predefined sound name) */
  sound: string;
  
  /** Volume level (0.0 to 1.0) */
  volume?: number;
  
  /** Duration override for the sound (ms) */
  duration?: number;
}
```

### 2. SoundBehavior Interface

```typescript
interface SoundBehaviorConfig {
  /** Direction of the timer ('up' or 'down') */
  direction: 'up' | 'down';
  
  /** Total duration for countdown timers (required for 'down') */
  durationMs?: number;
  
  /** Array of sound cues to trigger */
  cues: SoundCue[];
}

class SoundBehavior implements IRuntimeBehavior {
  constructor(config: SoundBehaviorConfig);
  
  /** Called when block is pushed - registers event handlers */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  
  /** Called when block is popped - cleanup */
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  
  /** Called on disposal - release resources */
  onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void;
}
```

### 3. PlaySoundAction

```typescript
/**
 * Action to play a sound through the runtime's audio system.
 */
class PlaySoundAction implements IRuntimeAction {
  readonly type = 'play-sound';
  
  constructor(
    /** Sound identifier (URL, name, or base64) */
    public readonly sound: string,
    /** Volume level (0.0 to 1.0) */
    public readonly volume?: number,
    /** Duration cap in milliseconds */
    public readonly duration?: number
  );
  
  /** Executes the sound playback */
  do(runtime: IScriptRuntime): void;
}
```

### 4. Timer Event Integration

The `SoundBehavior` listens to `timer:tick` events which contain:

```typescript
interface TimerTickEventData {
  blockId: string;
  elapsedMs: number;
  displayTime: number;
  direction: 'up' | 'down';
  remainingMs?: number; // Only for countdown timers
}
```

### 5. Synchronization Strategy

#### Countdown Timer (AMRAP style)
```
Timer Duration: 10 minutes (600,000ms)
Cues:
  - id: "30-sec-warning" → threshold: 30000ms → plays when 30 seconds remain
  - id: "10-sec-warning" → threshold: 10000ms → plays when 10 seconds remain
  - id: "3-2-1-countdown" → threshold: 3000ms  → plays countdown beeps
  - id: "complete" → threshold: 0ms → plays completion sound
```

#### Count-up Timer (For Time style)
```
Cues:
  - id: "1-min-mark" → threshold: 60000ms  → plays at 1 minute
  - id: "5-min-mark" → threshold: 300000ms → plays at 5 minutes
```

### 6. Deduplication Logic

Each cue has a `triggered` flag tracked in memory:

```typescript
interface SoundCueState {
  cueId: string;
  triggered: boolean;
  triggeredAt?: number;
}
```

On each `timer:tick`:
1. Check if cue threshold is met
2. Check if cue has already triggered
3. If valid, mark as triggered and return `PlaySoundAction`

### 7. Memory Model

```typescript
// Memory reference for sound state
const SOUND_STATE_TYPE = 'sound-state';

interface SoundState {
  blockId: string;
  cues: SoundCueState[];
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `SoundCue` interface in `src/runtime/models/SoundModels.ts`
2. Create `PlaySoundAction` in `src/runtime/actions/PlaySoundAction.ts`
3. Create `SoundBehavior` in `src/runtime/behaviors/SoundBehavior.ts`

### Phase 2: Event Integration
1. Add event handler registration in `onPush()`
2. Implement `timer:tick` listener with threshold checking
3. Implement `timer:complete` listener for final sound
4. Add deduplication via memory state

### Phase 3: Testing
1. Unit tests for `SoundBehavior`
2. Unit tests for `PlaySoundAction`
3. Integration tests with `TimerBehavior`

### Phase 4: UI Integration
1. Create audio playback service for `PlaySoundAction.do()`
2. Add predefined sounds (beep, buzzer, countdown)
3. Storybook story demonstrating sound behavior

## Predefined Sounds

| Name | Description | Use Case |
|------|-------------|----------|
| `beep` | Short single beep | Countdown tick |
| `buzzer` | Long buzz | Timer complete |
| `chime` | Pleasant chime | Milestone reached |
| `tick` | Clock tick | Each second warning |
| `countdown-3` | "3-2-1" voice | Final countdown |

## Usage Examples

### Example 1: AMRAP Timer with Countdown Beeps

```typescript
const soundBehavior = new SoundBehavior({
  direction: 'down',
  durationMs: 600000, // 10 minutes
  cues: [
    { id: 'one-min', threshold: 60000, sound: 'chime' },
    { id: 'thirty-sec', threshold: 30000, sound: 'beep' },
    { id: 'ten-sec', threshold: 10000, sound: 'beep' },
    { id: 'three', threshold: 3000, sound: 'tick' },
    { id: 'two', threshold: 2000, sound: 'tick' },
    { id: 'one', threshold: 1000, sound: 'tick' },
    { id: 'complete', threshold: 0, sound: 'buzzer' }
  ]
});
```

### Example 2: For Time with Progress Markers

```typescript
const soundBehavior = new SoundBehavior({
  direction: 'up',
  cues: [
    { id: 'min-1', threshold: 60000, sound: 'chime' },
    { id: 'min-5', threshold: 300000, sound: 'chime' },
    { id: 'min-10', threshold: 600000, sound: 'chime' }
  ]
});
```

### Example 3: EMOM Interval Markers

```typescript
// Combined with LoopCoordinatorBehavior for intervals
const soundBehavior = new SoundBehavior({
  direction: 'down',
  durationMs: 60000, // 1 minute interval
  cues: [
    { id: 'ten-sec', threshold: 10000, sound: 'beep' },
    { id: 'complete', threshold: 0, sound: 'buzzer' }
  ]
});
```

## Edge Cases

### 1. Timer Paused/Resumed
- Sound cues should not re-trigger on resume
- State persists across pause/resume cycles

### 2. Timer Reset
- All cue states should reset to `triggered: false`
- Implement `reset()` method on SoundBehavior

### 3. Multiple SoundBehaviors
- Each behavior has its own state in memory
- No conflicts between concurrent timers

### 4. Sound Overlap
- Audio system should handle overlapping sounds
- Consider `interrupt` vs `stack` mode

### 5. Browser Tab Inactive
- Web Audio API may be suspended
- Resume audio context on user interaction

## Performance Considerations

1. **Tick Interval**: Timer ticks at ~100ms, so threshold precision is ±100ms
2. **Memory Efficiency**: Only store cue states, not full configurations
3. **Event Handler Registration**: Register once on push, not on every tick
4. **Audio Preloading**: Preload sounds on mount to avoid latency

## Security Considerations

1. **Sound Source Validation**: Only allow predefined sounds or trusted URLs
2. **Volume Limits**: Cap maximum volume to prevent audio abuse
3. **No User Data in Sounds**: Don't encode sensitive data in sound URLs

## Future Enhancements

1. **Custom Sound Upload**: Allow users to upload custom sounds
2. **Voice Announcements**: Text-to-speech for workout cues
3. **Haptic Feedback**: Vibration patterns for mobile devices
4. **Sound Themes**: Preset sound packs (gym, sports, gaming)
5. **Accessibility**: Visual indicators alongside audio cues

## File Structure

```
src/runtime/
├── behaviors/
│   ├── SoundBehavior.ts          # Main behavior implementation
│   └── SoundBehavior.test.ts     # Unit tests
├── actions/
│   └── PlaySoundAction.ts        # Sound playback action
├── models/
│   └── SoundModels.ts            # Type definitions
└── index.ts                      # Export updates

stories/
└── runtime/
    └── SoundBehavior.stories.tsx # Storybook demonstration
```

## Dependencies

- No new external dependencies required
- Uses Web Audio API (browser built-in)
- Uses existing runtime infrastructure (memory, events, actions)

## Conclusion

The `SoundBehavior` provides a composable, declarative way to add audio feedback to workout timers. By leveraging the existing event system and action architecture, it integrates seamlessly with the WodWiki runtime while maintaining clean separation of concerns.
