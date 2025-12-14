# Runtime action lifecycle map

## How actions flow
- Blocks return `IRuntimeAction[]` from lifecycle methods (`mount`, `next`, `unmount`). `RuntimeStack` executes these via `runActions`, passing the `IScriptRuntime` instance.
- Actions mutate runtime state in three places: `RuntimeMemory` (display stacks, timers, action layers), `ExecutionTracker` (spans/segments/metrics), and `EventBus` (events/handlers). Some emit side-effects (console logs, sound events) handled by UI/event listeners.

## Action catalog and impacted runtime elements
| Action                                                                          | Purpose                                    | Runtime touch points                                                  | Data mutation                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `StartSegmentAction`                                                            | Open time segment on current block         | `runtime.stack.current`, `runtime.tracker.startSegment`               | Adds `TimeSegment` to active span                                                 |
| `EndSegmentAction` / `EndAllSegmentsAction`                                     | Close one/all segments                     | `runtime.tracker.endSegment/endAllSegments`                           | Sets `endTime` on open segments                                                   |
| `RecordMetricAction`                                                            | Record metric to active span               | `runtime.tracker.recordMetric`                                        | Mutates span metrics & active segment metrics in memory                           |
| `RecordRoundAction`                                                             | Track round progress                       | `runtime.tracker.recordRound`                                         | Updates span metrics (round counters/rep scheme)                                  |
| `EmitMetricAction`                                                              | Append metric fragments + legacy collector | `runtime.tracker.appendFragments`; optional `runtime.metrics.collect` | Writes span fragments in memory; forwards metric to collector                     |
| `StartTimerAction`                                                              | Start timer span array                     | `timeSpansRef` in `RuntimeMemory`                                     | Pushes `{start, stop}` entry                                                      |
| `StopTimerAction`                                                               | Stop running timer span                    | `timeSpansRef` in `RuntimeMemory`                                     | Sets `stop` on last open span                                                     |
| `PushTimerDisplayAction` / `PopTimerDisplayAction` / `UpdateTimerDisplayAction` | Manage timer display stack                 | `RuntimeMemory` type `DISPLAY_STACK_STATE`                            | Inserts/removes/updates `timerStack` entries; resort by priority                  |
| `PushCardDisplayAction` / `PopCardDisplayAction` / `UpdateCardDisplayAction`    | Manage card display stack                  | `RuntimeMemory` type `DISPLAY_STACK_STATE`                            | Inserts/removes/updates `cardStack`; resort by priority                           |
| `SetWorkoutStateAction`                                                         | Set workout run state & global timer       | `RuntimeMemory` type `DISPLAY_STACK_STATE`; allocates global timer    | Sets `workoutState`, `totalElapsedMs`, allocates `globalTimerMemoryId` with spans |
| `SetRoundsDisplayAction`                                                        | Update rounds UI counters                  | `DISPLAY_STACK_STATE`                                                 | Mutates `currentRound`/`totalRounds`                                              |
| `ResetDisplayStackAction`                                                       | Reset display state to defaults            | `DISPLAY_STACK_STATE`                                                 | Replaces state with `createDefaultDisplayState()`                                 |
| `PushActionsAction` / `PopActionsAction` / `UpdateActionsAction`                | Manage action layers for UI controls       | `RuntimeMemory` type `ACTION_STACK_STATE`                             | Rebuilds `layers` and derived `visible` actions                                   |
| `PushStackItemAction` / `PopStackItemAction`                                    | Legacy display stack ids                   | `RuntimeMemory` type `DISPLAY_STACK`                                  | Adds/removes block IDs from array                                                 |
| `EmitEventAction`                                                               | Emit runtime event                         | `runtime.handle` → `EventBus`                                         | Dispatches `IEvent` to handlers                                                   |
| `RegisterEventHandlerAction`                                                    | Register handler                           | `eventBus.register('*', handler, owner)`                              | Adds handler keyed by owner for cleanup                                           |
| `UnregisterEventHandlerAction`                                                  | Remove handler by id                       | `eventBus.unregisterById`                                             | Detaches handler                                                                  |
| `PlaySoundAction`                                                               | Request sound playback                     | `runtime.handle` event `sound:play`                                   | UI listeners trigger audio                                                        |
| `ErrorAction`                                                                   | Push runtime error                         | `runtime.errors` array                                                | Appends `RuntimeError`, logs to console                                           |

## Runtime elements impacted
- **RuntimeMemory**: `DISPLAY_STACK_STATE`, `DISPLAY_STACK`, `ACTION_STACK_STATE`, timer span arrays, global timer refs. UI hooks (`useExecutionSpans`, display stack consumers) subscribe to memory for updates.
- **ExecutionTracker**: Holds spans/segments/metrics; actions calling tracker mutate `execution-span` entries that power history logs and analytics.
- **EventBus**: Event emission and handler registration (`EmitEventAction`, `PlaySoundAction`, register/unregister) route side effects to UI/services.
- **Legacy metric collector**: Only touched by `EmitMetricAction` if `runtime.metrics.collect` exists (compat).

## Lifecycle timing notes
- `mount` actions typically push display entries, start timers/segments, and register handlers.
- `next` actions often emit metrics/segments or update display state for transitions.
- `unmount` actions clean up: end segments, pop displays/actions, unregister handlers, stop timers.

