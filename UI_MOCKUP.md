# UI Mockup - Track and Log Buttons with Timer Dialog

## Context Panel with Action Buttons

```
┌─────────────────────────────────────────┐
│  WOD Block Context                      │
│  Lines 6 - 10                           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐           │  ← NEW ACTION BUTTONS
│  │ ▶ Track  │  │ 📖 Log   │           │
│  └──────────┘  └──────────┘           │
│                                         │
├─────────────────────────────────────────┤
│  Workout                                │
│                                         │
│  ⏱ 20:00 AMRAP                         │
│    └─ + 5 Pullups                      │
│    └─ + 10 Pushups                     │
│    └─ + 15 Squats                      │
│                                         │
├─────────────────────────────────────────┤
│  Block Information                      │
│  State: parsed                          │
│  Statements: 4                          │
│  Content Length: 67 chars               │
└─────────────────────────────────────────┘
```

## Workout Timer Dialog (Opened by Track Button)

```
┌───────────────────────────────────────────────────────────┐
│  Workout Timer                                      [×]    │
│  Lines 6 - 10                                            │
├───────────────────────────────────────────────────────────┤
│                                                           │
│                                                           │
│                      00:00.00                            │  ← LARGE TIMER
│                       Stopped                            │    (NOT RUNNING INITIALLY)
│                                                           │
│                                                           │
│                                                           │
│          ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│          │ ▶ Start │  │ ◼ Stop  │  │ ↻ Reset │         │  ← TIMER CONTROLS
│          └─────────┘  └─────────┘  └─────────┘         │
│                                                           │
├───────────────────────────────────────────────────────────┤
│  Workout                                                  │
│                                                           │
│  20:00 AMRAP                                             │  ← WORKOUT CONTENT
│    + 5 Pullups                                           │
│    + 10 Pushups                                          │
│    + 15 Squats                                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Timer Dialog - Running State

```
┌───────────────────────────────────────────────────────────┐
│  Workout Timer                                      [×]    │
│  Lines 6 - 10                                            │
├───────────────────────────────────────────────────────────┤
│                                                           │
│                                                           │
│                      03:24.57                            │  ← TIMER RUNNING
│                       Running                            │    (Updates every 10ms)
│                                                           │
│                                                           │
│                                                           │
│          ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│          │ ⏸ Pause │  │ ◼ Stop  │  │ ↻ Reset │         │  ← PAUSE BUTTON
│          └─────────┘  └─────────┘  └─────────┘         │    (Reset disabled)
│                                                           │
├───────────────────────────────────────────────────────────┤
│  Workout                                                  │
│                                                           │
│  20:00 AMRAP                                             │
│    + 5 Pullups                                           │
│    + 10 Pushups                                          │
│    + 15 Squats                                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Timer Dialog - Paused State

```
┌───────────────────────────────────────────────────────────┐
│  Workout Timer                                      [×]    │
│  Lines 6 - 10                                            │
├───────────────────────────────────────────────────────────┤
│                                                           │
│                                                           │
│                      03:24.57                            │  ← TIMER PAUSED
│                       Stopped                            │    (Time preserved)
│                                                           │
│                                                           │
│                                                           │
│          ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│          │ ▶ Resume│  │ ◼ Stop  │  │ ↻ Reset │         │  ← RESUME BUTTON
│          └─────────┘  └─────────┘  └─────────┘         │    (Reset enabled)
│                                                           │
├───────────────────────────────────────────────────────────┤
│  Workout                                                  │
│                                                           │
│  20:00 AMRAP                                             │
│    + 5 Pullups                                           │
│    + 10 Pushups                                          │
│    + 15 Squats                                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## User Flow

1. **User opens markdown editor** with WOD blocks
2. **User clicks on a WOD block** → Context overlay appears
3. **Context overlay shows Track and Log buttons** (only if block is parsed successfully)
4. **User clicks "Track" button** → Timer dialog opens
5. **Timer shows 00:00.00 (NOT running)** ✅ (as required)
6. **User clicks "Start"** → Timer starts counting up
7. **User can pause** → Timer stops, time preserved
8. **User can resume** → Timer continues from paused time
9. **User can reset** → Timer goes back to 00:00.00 (only when stopped)
10. **User clicks "Stop"** → Dialog closes, timer resets

## Button States

### Track Button
- **Enabled**: When block has statements and no parse errors
- **Disabled**: When block is empty or has errors
- **Action**: Opens WorkoutTimerDialog

### Log Button
- **Enabled**: When block has statements and no parse errors
- **Disabled**: When block is empty or has errors
- **Action**: Placeholder (logs to console)
- **Future**: Save workout results to history

### Timer Controls
- **Start**: Begins timer from 00:00.00
- **Resume**: Continues timer from paused time
- **Pause**: Stops timer, preserves elapsed time
- **Stop**: Closes dialog and resets timer
- **Reset**: Resets timer to 00:00.00 (disabled while running)

## Technical Details

### Timer Format
- **Format**: `MM:SS.CS`
- **MM**: Minutes (00-99)
- **SS**: Seconds (00-59)
- **CS**: Centiseconds (00-99)
- **Update Rate**: 10ms for smooth display

### Dialog Behavior
- **Opens**: Centered on screen with overlay
- **Closes**: Click Stop, click outside (if enabled), or press Escape
- **Initial State**: Timer at 00:00.00, not running
- **On Close**: Timer resets completely

### Responsive Design
- Dialog width: 600px max
- Buttons: Full width on mobile, side-by-side on desktop
- Timer: Large font (6xl) visible from distance
- Works on all screen sizes

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (Radix UI primitives)
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ High contrast support

## Future Enhancements

1. **Round tracking** - Show current round for rounds-based workouts
2. **Rep counting** - Manual increment buttons for reps
3. **Interval support** - EMOM and Tabata timers
4. **Audio cues** - Beep at intervals/rounds
5. **Progress bars** - Visual feedback for timed workouts
6. **Results saving** - Log button saves to workout history
7. **Split times** - Record lap/round times
8. **Runtime integration** - Full ScriptRuntime execution
