# Action Consolidation Map

This document details how the current 15+ action types can be consolidated into the 10 actions proposed in the simplified architecture.

---

## Current Actions Inventory

### Timer Actions (4 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `StartTimerAction` | Starts a timer span | `StartTimerAction.ts` | ~50 |
| `StopTimerAction` | Stops a timer span | `StopTimerAction.ts` | ~50 |
| `StartSegmentAction` | Opens a time segment on current block | (inline) | - |
| `EndSegmentAction` | Closes time segments | (inline) | - |

### Display Actions (8 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `PushTimerDisplayAction` | Add timer to display stack | `TimerDisplayActions.ts` | ~30 |
| `PopTimerDisplayAction` | Remove timer from display stack | `TimerDisplayActions.ts` | ~30 |
| `UpdateTimerDisplayAction` | Update timer display state | `TimerDisplayActions.ts` | ~40 |
| `PushCardDisplayAction` | Add card to display stack | `CardDisplayActions.ts` | ~30 |
| `PopCardDisplayAction` | Remove card from display stack | `CardDisplayActions.ts` | ~30 |
| `UpdateCardDisplayAction` | Update card display state | `CardDisplayActions.ts` | ~40 |
| `PushStackItemAction` | Legacy display stack IDs | `StackActions.ts` | ~20 |
| `PopStackItemAction` | Legacy display stack removal | `StackActions.ts` | ~20 |

### State Actions (3 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `SetWorkoutStateAction` | Set workout run state | `WorkoutStateActions.ts` | ~40 |
| `SetRoundsDisplayAction` | Update rounds UI counters | `WorkoutStateActions.ts` | ~30 |
| `ResetDisplayStackAction` | Reset display to defaults | `WorkoutStateActions.ts` | ~30 |

### Event/Handler Actions (2 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `RegisterEventHandlerAction` | Register event handler | `RegisterEventHandlerAction.ts` | ~40 |
| `UnregisterEventHandlerAction` | Remove handler by ID | `UnregisterEventHandlerAction.ts` | ~30 |

### Control Actions (3 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `PushActionsAction` | Add action layer for UI controls | `ActionStackActions.ts` | ~40 |
| `PopActionsAction` | Remove action layer | `ActionStackActions.ts` | ~30 |
| `UpdateActionsAction` | Update action layer | `ActionStackActions.ts` | ~40 |

### Metric Actions (4 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `RecordMetricAction` | Record metric to active span | (inline/tracker) | - |
| `RecordRoundAction` | Track round progress | (inline/tracker) | - |
| `EmitMetricAction` | Append metric fragments | `EmitMetricAction.ts` | ~60 |
| (Segment metrics) | Mutates span metrics | (inline) | - |

### Utility Actions (3 types)

| Action | Purpose | File | LOC |
|--------|---------|------|-----|
| `EmitEventAction` | Emit runtime event | `EmitEventAction.ts` | ~30 |
| `PlaySoundAction` | Request sound playback | `PlaySoundAction.ts` | ~40 |
| `ErrorAction` | Push runtime error | `ErrorAction.ts` | ~50 |

**Total Current Actions: ~26 distinct action types**

---

## Proposed Actions (From Canvas)

The canvas diagram proposes exactly **10 action types**:

| Action | Proposed Purpose |
|--------|------------------|
| **Start Timer** | Start a timer |
| **Stop Timer** | Stop a timer |
| **Track** | Write a trackable execution event |
| **Display** | Send data for main display |
| **PlaySoundAction** | Play audio cue |
| **ErrorAction** | Handle errors |
| **UnregisterEventHandlerAction** | Remove event handler |
| **RegisterEventHandlerAction** | Add event handler |
| **RegisterAction** | Generic registration |
| **UnregisterAction** | Generic unregistration |

---

## Consolidation Strategy

### 1. Timer Actions → `Start Timer` + `Stop Timer`

**Current:**
```
StartTimerAction
StopTimerAction
StartSegmentAction
EndSegmentAction
```

**Proposed:**
```
StartTimerAction  →  Start Timer (with segment support built-in)
StopTimerAction   →  Stop Timer (auto-ends segments)
```

**Migration:**
- Segment tracking moves into the `Track` action
- Timer display handled by `Display` action
- Single start/stop interface for all timer operations

### 2. Display Actions → `Display`

**Current:**
```
PushTimerDisplayAction
PopTimerDisplayAction
UpdateTimerDisplayAction
PushCardDisplayAction
PopCardDisplayAction
UpdateCardDisplayAction
PushStackItemAction
PopStackItemAction
SetWorkoutStateAction
SetRoundsDisplayAction
ResetDisplayStackAction
```

**Proposed:**
```typescript
interface DisplayAction {
  type: 'display';
  target: 'timer' | 'card' | 'stack' | 'state' | 'rounds';
  operation: 'push' | 'pop' | 'update' | 'reset';
  payload: DisplayPayload;
}
```

**Single action with discriminated union for all display operations.**

### 3. Metric Actions → `Track`

**Current:**
```
RecordMetricAction
RecordRoundAction
EmitMetricAction
(Segment metrics inline)
```

**Proposed:**
```typescript
interface TrackAction {
  type: 'track';
  target: 'metric' | 'round' | 'segment' | 'span';
  operation: 'record' | 'emit' | 'start' | 'end';
  payload: TrackPayload;
}
```

**Unified tracking action for all execution records.**

### 4. Handler Actions → `RegisterEventHandler` + `UnregisterEventHandler`

**Current:**
```
RegisterEventHandlerAction
UnregisterEventHandlerAction
```

**Proposed:** No change - keep as-is.

### 5. Control Actions → `RegisterAction` + `UnregisterAction`

**Current:**
```
PushActionsAction
PopActionsAction
UpdateActionsAction
```

**Proposed:**
```typescript
interface RegisterAction {
  type: 'register';
  target: 'control' | 'action' | 'layer';
  operation: 'push' | 'pop' | 'update';
  payload: RegisterPayload;
}
```

**Generic registration pattern for UI control layers.**

### 6. Utility Actions → Keep As-Is

**Current:**
```
EmitEventAction
PlaySoundAction
ErrorAction
```

**Proposed:**
- `PlaySoundAction` - Keep
- `ErrorAction` - Keep
- `EmitEventAction` - Absorbed into `Track` or kept for custom events

---

## Consolidated Action Interface

```typescript
/**
 * Proposed unified action types
 */
type RuntimeActionType = 
  | 'start-timer'
  | 'stop-timer'
  | 'track'
  | 'display'
  | 'play-sound'
  | 'error'
  | 'register-handler'
  | 'unregister-handler'
  | 'register'
  | 'unregister';

interface IRuntimeAction {
  type: RuntimeActionType;
  target?: string;
  payload?: unknown;
  do(runtime: IScriptRuntime): void;
}

/**
 * Example: Display action covers all display operations
 */
interface DisplayAction extends IRuntimeAction {
  type: 'display';
  target: 'timer' | 'card' | 'state' | 'rounds' | 'stack';
  payload: {
    operation: 'push' | 'pop' | 'update' | 'reset';
    data: unknown;
    priority?: number;
  };
}

/**
 * Example: Track action covers all tracking operations
 */
interface TrackAction extends IRuntimeAction {
  type: 'track';
  target: 'metric' | 'round' | 'segment' | 'span' | 'fragment';
  payload: {
    operation: 'record' | 'emit' | 'start' | 'end' | 'append';
    blockId: string;
    data: unknown;
  };
}
```

---

## Migration Mapping Table

| Current Action | Maps To | Notes |
|----------------|---------|-------|
| `StartTimerAction` | `start-timer` | Direct |
| `StopTimerAction` | `stop-timer` | Direct |
| `StartSegmentAction` | `track` | `target: 'segment', operation: 'start'` |
| `EndSegmentAction` | `track` | `target: 'segment', operation: 'end'` |
| `PushTimerDisplayAction` | `display` | `target: 'timer', operation: 'push'` |
| `PopTimerDisplayAction` | `display` | `target: 'timer', operation: 'pop'` |
| `UpdateTimerDisplayAction` | `display` | `target: 'timer', operation: 'update'` |
| `PushCardDisplayAction` | `display` | `target: 'card', operation: 'push'` |
| `PopCardDisplayAction` | `display` | `target: 'card', operation: 'pop'` |
| `UpdateCardDisplayAction` | `display` | `target: 'card', operation: 'update'` |
| `SetWorkoutStateAction` | `display` | `target: 'state', operation: 'update'` |
| `SetRoundsDisplayAction` | `display` | `target: 'rounds', operation: 'update'` |
| `ResetDisplayStackAction` | `display` | `target: 'stack', operation: 'reset'` |
| `RegisterEventHandlerAction` | `register-handler` | Direct |
| `UnregisterEventHandlerAction` | `unregister-handler` | Direct |
| `PushActionsAction` | `register` | `target: 'control', operation: 'push'` |
| `PopActionsAction` | `unregister` | `target: 'control', operation: 'pop'` |
| `UpdateActionsAction` | `register` | `target: 'control', operation: 'update'` |
| `RecordMetricAction` | `track` | `target: 'metric', operation: 'record'` |
| `RecordRoundAction` | `track` | `target: 'round', operation: 'record'` |
| `EmitMetricAction` | `track` | `target: 'fragment', operation: 'emit'` |
| `EmitEventAction` | `track` | `target: 'event', operation: 'emit'` |
| `PlaySoundAction` | `play-sound` | Direct |
| `ErrorAction` | `error` | Direct |

---

## Implementation Priority

### Phase 1: Define Interfaces (Week 1)
- [ ] Create new `RuntimeActionType` union
- [ ] Define `DisplayAction` interface
- [ ] Define `TrackAction` interface
- [ ] Define `RegisterAction` interface

### Phase 2: Implement Consolidated Actions (Week 2)
- [ ] Implement `DisplayAction` with all targets
- [ ] Implement `TrackAction` with all operations
- [ ] Update action factory to create consolidated types

### Phase 3: Migrate Consumers (Week 3-4)
- [ ] Update all behaviors to use new actions
- [ ] Update UI hooks to handle consolidated actions
- [ ] Remove deprecated action classes

### Phase 4: Cleanup (Week 5)
- [ ] Remove old action files
- [ ] Update documentation
- [ ] Update tests

---

## LOC Reduction Estimate

| Category | Current LOC | Proposed LOC | Reduction |
|----------|-------------|--------------|-----------|
| Timer Actions | ~100 | ~60 | 40% |
| Display Actions | ~270 | ~80 | 70% |
| State Actions | ~100 | (merged) | 100% |
| Handler Actions | ~70 | ~70 | 0% |
| Control Actions | ~110 | ~50 | 55% |
| Metric Actions | ~60 | ~40 | 33% |
| Utility Actions | ~120 | ~100 | 17% |
| **Total** | **~830** | **~400** | **52%** |

---

*Document generated: December 2024*
*Reference: [simplify-engine.md](./simplify-engine.md)*
