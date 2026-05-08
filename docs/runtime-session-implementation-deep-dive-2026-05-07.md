# Runtime Session Implementation Deep Dive

**Date:** 2026-05-07  
**Status:** Design proposal  

---

## 1. Executive Summary

The current runtime already has the right internal pieces: `ScriptRuntime`, `ExecutionContext`, `RuntimeStack`, event handlers, stack observers, output statements, analytics, and the `SessionRootBlock`. The friction is that callers still coordinate too many of those pieces directly.

The proposed **Runtime Session Module** is a deeper module placed above `ScriptRuntime`:

```text
UI / Workbench / Cast / tests
        │
        ▼
IRuntimeSession       ← small task-focused seam
        │
        ▼
RuntimeSession        ← owns lifecycle, scheduler, status, completion, plugins
        │
        ▼
ScriptRuntime         ← action-turn engine, stack, event bus, compiler outputs
        │
        ▼
Blocks / behaviors / memory
```

The main rule: **application code controls a workout session; runtime internals execute actions.**

`ScriptRuntime` should remain as the low-level execution engine used by blocks, behaviors, compiler strategies, and advanced tests. `RuntimeSession` should become the application-facing module used by Workbench, cast orchestration, e2e-oriented tests, and future reusable runtime hosts.

---

## 2. Current State

### 2.1 Runtime internals already owned by `ScriptRuntime`

`src/runtime/ScriptRuntime.ts` currently owns:

- action turns via `do()`, `doAll()`, `handle()`
- frozen-time `ExecutionContext` for each turn
- `RuntimeStack` orchestration
- global `next` and `abort` event handlers
- stack-settled notifications after a turn completes
- output statement storage and listeners
- tracker listeners
- stack observers
- analytics engine attachment and finalization
- runtime disposal

This is valuable depth. Deleting `ScriptRuntime` would scatter real complexity.

### 2.2 Session state is currently split outside the runtime

The application-facing session lifecycle is split across several places:

- `src/runtime/compiler/RuntimeFactory.ts`
  - creates `ScriptRuntime`
  - creates stack, clock, and event bus
  - dispatches `StartSessionAction`
- `src/components/layout/RuntimeLifecycleProvider.tsx`
  - owns current runtime instance
  - creates `WorkoutTracker`
  - creates `SubscriptionManager`
  - disposes old runtimes safely
- `src/runtime/hooks/useRuntimeExecution.ts`
  - owns `idle | running | paused | completed | error`
  - owns the 20 ms tick interval
  - dispatches `TickEvent`
  - detects completion from empty stack
- `src/components/workbench/useWorkbenchRuntime.ts`
  - registers audio event handler
  - creates analytics engine and stages
  - finalizes analytics on completion/stop
  - builds `WorkoutResults`
  - handles `next`, pause/resume, browser workout events

The session concept exists, but its interface is reconstructed by each caller.

### 2.3 Important naming distinction

There is already a `SessionRootBlock`.

- **`SessionRootBlock`** is a runtime block inside the stack. It is part of workout execution.
- **`RuntimeSession`** is the application-facing module that owns a whole execution session around a `ScriptRuntime`.

Do not merge these names. The root block is an implementation detail of the runtime session.

---

## 3. Target Module

### 3.1 Module responsibility

The Runtime Session Module should own:

- creating and disposing a `ScriptRuntime`
- starting the session root action
- starting, pausing, resuming, stepping, stopping, and completing execution
- ticking via a scheduler
- deriving session status
- finalizing analytics exactly once
- collecting output logs for `WorkoutResults`
- exposing stack/output/tracker observations through a narrow interface
- bridging browser/runtime plugins such as audio without leaking event bus details to Workbench

It should not own:

- block behavior internals
- compiler strategy semantics
- metric presentation rules
- Note persistence
- Workbench layout

### 3.2 Proposed file layout

```text
src/runtime/session/
  IRuntimeSession.ts
  RuntimeSession.ts
  RuntimeSessionFactory.ts
  RuntimeScheduler.ts
  RuntimeSessionPlugin.ts
  adapters/
    IntervalRuntimeScheduler.ts
    ManualRuntimeScheduler.ts
    AudioRuntimeSessionPlugin.ts
    AnalyticsRuntimeSessionPlugin.ts
  index.ts

src/runtime/hooks/
  useRuntimeSessionSnapshot.ts     # optional React subscription helper

src/components/layout/
  RuntimeSessionProvider.tsx       # replaces RuntimeLifecycleProvider over time
  RuntimeSessionContext.tsx
  useRuntimeSession.ts
```

A narrower first step can put all files under `src/runtime/session/` and keep React providers in `src/components/layout/` for compatibility with current component organization.

---

## 4. Public Interface Shape

### 4.1 Core session contract

```typescript
export type RuntimeSessionStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'error'
  | 'disposed';

export interface RuntimeSessionSnapshot {
  status: RuntimeSessionStatus;
  startedAt: number | null;
  endedAt: number | null;
  elapsedMs: number;
  stepCount: number;
  stackDepth: number;
  stack: StackSnapshot | null;
  outputCount: number;
  error: Error | null;
}

export interface RuntimeSessionCompletion {
  results: WorkoutResults;
  reason: 'completed' | 'stopped' | 'disposed-partial' | 'error';
}

export interface IRuntimeSession {
  readonly id: string;
  readonly block: WodBlock;
  readonly runtime: IScriptRuntime; // escape hatch, see section 4.4
  readonly snapshot: RuntimeSessionSnapshot;

  start(): void;
  pause(): void;
  resume(): void;
  next(): void;
  step(): void;
  stop(): RuntimeSessionCompletion;

  onSnapshot(listener: (snapshot: RuntimeSessionSnapshot) => void): Unsubscribe;
  onOutputStatement(listener: (output: IOutputStatement) => void): Unsubscribe;
  onStackChange(listener: (snapshot: StackSnapshot) => void): Unsubscribe;
  onCompletion(listener: (completion: RuntimeSessionCompletion) => void): Unsubscribe;

  getOutputStatements(): IOutputStatement[];
  getCompletion(reason?: RuntimeSessionCompletion['reason']): RuntimeSessionCompletion;

  dispose(): void;
}
```

This interface intentionally uses workout/session verbs rather than action-engine verbs. Consumers should say `session.next()` instead of `runtime.handle(new NextEvent())`.

### 4.2 Factory contract

```typescript
export interface RuntimeSessionFactoryOptions {
  runtimeOptions?: RuntimeStackOptions;
  scheduler?: RuntimeScheduler;
  plugins?: RuntimeSessionPlugin[];
  now?: () => number;
}

export interface IRuntimeSessionFactory {
  createSession(block: WodBlock, options?: RuntimeSessionFactoryOptions): IRuntimeSession | null;
  disposeSession(session: IRuntimeSession): void;
}
```

The existing `RuntimeFactory` can be reused internally at first:

```text
RuntimeSessionFactory
  └── RuntimeFactory.createRuntime(block, options)
        └── ScriptRuntime + StartSessionAction
```

Later, session creation can absorb the `StartSessionAction` timing if needed, but phase one should avoid changing runtime creation semantics.

### 4.3 Scheduler seam

`useRuntimeExecution` currently owns `setInterval`. Move that into a session-owned scheduler seam:

```typescript
export interface RuntimeScheduler {
  start(tick: () => void, intervalMs: number): void;
  stop(): void;
  readonly isRunning: boolean;
}
```

Adapters:

- `IntervalRuntimeScheduler` — production, wraps `setInterval`.
- `ManualRuntimeScheduler` — tests, exposes `tick(n = 1)` without timers.

This is a real seam because it immediately has two adapters: production and test.

### 4.4 Runtime escape hatch

The first interface above includes:

```typescript
readonly runtime: IScriptRuntime;
```

This is intentional for migration. Several components and hooks currently need access to block memory, stack details, or existing runtime subscription APIs.

Rules for the escape hatch:

1. `runtime` is available but marked as low-level.
2. New UI code should prefer `IRuntimeSession` methods and observations.
3. Existing memory-driven components can keep using `IScriptRuntime` while the session seam grows.
4. After migration, expose narrower read adapters instead of raw runtime where possible.

This avoids a risky big-bang refactor.

---

## 5. How the New Session Object Is Exposed

### 5.1 Runtime layer export

Add exports from `src/runtime/session/index.ts` and re-export from `src/hooks/useRuntimeTimer.ts` because components intentionally import runtime capabilities through hook boundaries:

```typescript
// src/hooks/useRuntimeTimer.ts
export type {
  IRuntimeSession,
  RuntimeSessionSnapshot,
  RuntimeSessionStatus,
  RuntimeSessionCompletion,
} from '@/runtime/session';
export { RuntimeSessionFactory } from '@/runtime/session';
export { useRuntimeSessionSnapshot } from '@/runtime/hooks/useRuntimeSessionSnapshot';
```

### 5.2 React provider shape

Replace `RuntimeLifecycleProvider` gradually with `RuntimeSessionProvider`:

```typescript
export interface RuntimeSessionState {
  session: IRuntimeSession | null;
  runtime: IScriptRuntime | null; // compatibility alias: session?.runtime ?? null
  isInitializing: boolean;
  error: Error | null;
  initializeSession(block: WodBlock): IRuntimeSession | null;
  disposeSession(): void;
}
```

The compatibility `runtime` field allows existing consumers to keep working during migration.

### 5.3 Hook exposure

```typescript
const {
  session,
  initializeSession,
  disposeSession,
} = useRuntimeSession();

session?.start();
session?.pause();
session?.next();
session?.stop();
```

A snapshot hook avoids React components needing to wire listeners manually:

```typescript
const snapshot = useRuntimeSessionSnapshot(session);

if (snapshot.status === 'completed') {
  // render review state
}
```

### 5.4 Workbench-facing hook shape

`useWorkbenchRuntime` can shrink to an adapter over `IRuntimeSession`:

```typescript
return {
  session,
  runtime: session?.runtime ?? null, // compatibility
  initializeRuntime: initializeSession, // compatibility alias during migration
  disposeRuntime: disposeSession,
  execution: {
    status: snapshot.status,
    elapsedTime: snapshot.elapsedMs,
    stepCount: snapshot.stepCount,
    startTime: snapshot.startedAt,
    start: session.start,
    pause: session.pause,
    stop: session.stop,
    reset: dispose/recreate,
    step: session.step,
  },
  handleStart: session.start,
  handlePause: session.pause,
  handleStop: session.stop,
  handleNext: session.next,
};
```

This lets panels migrate one caller at a time.

---

## 6. RuntimeSession Implementation Sketch

### 6.1 Constructor setup

```typescript
class RuntimeSession implements IRuntimeSession {
  private status: RuntimeSessionStatus = 'ready';
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private elapsedBeforePauseMs = 0;
  private stepCount = 0;
  private completion: RuntimeSessionCompletion | null = null;
  private disposed = false;

  constructor(
    readonly id: string,
    readonly block: WodBlock,
    readonly runtime: IScriptRuntime,
    private readonly scheduler: RuntimeScheduler,
    private readonly plugins: RuntimeSessionPlugin[],
    private readonly now: () => number = Date.now,
  ) {
    // Subscribe to stack changes once.
    // Empty stack while running/paused => completed.
    // Plugin install happens here too.
  }
}
```

### 6.2 Start/resume/pause/next semantics

```typescript
start(): void {
  if (this.status === 'running') return;
  if (this.status === 'completed' || this.status === 'disposed') return;

  if (this.startedAt === null) {
    this.startedAt = this.now();
  }

  if (this.status === 'paused') {
    this.runtime.handle({ name: 'timer:resume', timestamp: new Date(), data: {} });
  }

  this.status = 'running';
  this.scheduler.start(() => this.tick(), 20);
  this.emitSnapshot();
}

pause(): void {
  if (this.status !== 'running') return;
  this.scheduler.stop();
  this.runtime.handle({ name: 'timer:pause', timestamp: new Date(), data: {} });
  this.status = 'paused';
  this.emitSnapshot();
}

next(): void {
  if (this.status === 'completed' || this.status === 'disposed') return;
  this.runtime.handle(new NextEvent());
  if (this.status !== 'running') this.start();
}

step(): void {
  if (this.status === 'running') return;
  this.status = 'paused';
  this.tick();
}

private tick(): void {
  try {
    this.runtime.handle(new TickEvent());
    this.stepCount += 1;
    this.emitSnapshot();
  } catch (error) {
    this.fail(error);
  }
}
```

### 6.3 Completion detection

Current completion detection lives in `useRuntimeExecution`: an empty stack while running or paused means completed. Move that rule into `RuntimeSession`.

```typescript
private handleStack(snapshot: StackSnapshot): void {
  this.latestStack = snapshot;

  if (
    snapshot.blocks.length === 0 &&
    (this.status === 'running' || this.status === 'paused')
  ) {
    this.complete('completed');
  }

  this.emitStack(snapshot);
  this.emitSnapshot();
}
```

This concentrates an important invariant: **stack exhaustion completes the session exactly once.**

### 6.4 Stop and dispose semantics

`stop()` should mean user-ended completion, not silent disposal.

```typescript
stop(): RuntimeSessionCompletion {
  if (this.completion) return this.completion;

  this.scheduler.stop();
  this.runtime.handle({ name: 'workout:stop', timestamp: new Date(), data: {} });
  return this.complete('stopped');
}

dispose(): void {
  if (this.disposed) return;

  if (!this.completion && (this.status === 'running' || this.status === 'paused')) {
    this.complete('disposed-partial');
  }

  this.scheduler.stop();
  this.uninstallPlugins();
  this.runtime.dispose();
  this.status = 'disposed';
  this.disposed = true;
  this.emitSnapshot();
}
```

This replaces the current Workbench-specific unmount effect that manually saves partial results.

---

## 7. Analytics, Audio, and Other Side Effects

### 7.1 Plugin seam

Instead of `useWorkbenchRuntime` directly registering global audio and analytics every time a runtime appears, make those session plugins:

```typescript
export interface RuntimeSessionPlugin {
  readonly id: string;
  install(session: IRuntimeSession): Unsubscribe | void;
}
```

Production plugins:

- `AudioRuntimeSessionPlugin`
  - registers `sound:play` handler against `session.runtime.eventBus`
  - calls `audioService.playSound()`
- `AnalyticsRuntimeSessionPlugin`
  - creates `AnalyticsEngine`
  - adds pace, power, rep, distance, volume, session load, and MET-minute stages
  - attaches tracker
  - calls `runtime.setAnalyticsEngine(engine)`
  - finalizes on session completion
- optional later: `BrowserWorkoutEventsPlugin`
  - maps browser-level workout events into session methods

### 7.2 Why plugins instead of hardcoding into RuntimeSession?

A session should be reusable in tests, Storybook, cast sender/receiver contexts, and future runtime hosts. Audio is browser-specific. Analytics is domain-specific but optional in some tests. Plugins keep the session interface deep without making every test mock sound playback and analytics stages.

### 7.3 Finalization rule

Analytics finalization should happen exactly once, inside session completion:

```typescript
private complete(reason: RuntimeSessionCompletion['reason']): RuntimeSessionCompletion {
  if (this.completion) return this.completion;

  this.scheduler.stop();
  this.endedAt = this.now();

  // Either plugin finalizes analytics, or RuntimeSession calls runtime.finalizeAnalytics().
  // Prefer plugin so tests can omit analytics.

  this.completion = {
    reason,
    results: this.buildWorkoutResults(reason),
  };

  this.status = reason === 'completed' ? 'completed' : 'stopped';
  this.emitCompletion(this.completion);
  this.emitSnapshot();
  return this.completion;
}
```

---

## 8. WorkoutResults Construction

Move result construction out of `useWorkbenchRuntime` and into `RuntimeSession`:

```typescript
private buildWorkoutResults(reason: RuntimeSessionCompletion['reason']): WorkoutResults {
  const endTime = this.endedAt ?? this.now();
  const startTime = this.startedAt ?? endTime;

  return {
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
    metrics: [],
    logs: this.runtime.getOutputStatements(),
    completed: reason === 'completed' || reason === 'stopped',
  };
}
```

Open design question: should `stopped` produce `completed: true` or `completed: false`?

Current `handleStop()` saves `completed: true`, while unmount partial save uses `completed: false`. Preserve that behavior in phase one:

| Reason | `WorkoutResults.completed` |
|--------|----------------------------|
| `completed` | `true` |
| `stopped` | `true` |
| `disposed-partial` | `false` |
| `error` | `false` |

---

## 9. Testing Impact

### 9.1 What remains unchanged

Behavior-level tests should not change.

Keep using:

- `BehaviorTestHarness`
- `MockBlock`
- behavior-specific unit tests
- direct `IScriptRuntime`/`ExecutionContext` tests where the test is about action turn semantics

These tests target lower-level interfaces. The session module should not hide behavior internals from tests that intentionally test behavior internals.

### 9.2 What gets added

Add a session-level harness:

```typescript
const session = new RuntimeSessionTestBuilder()
  .withScript('10:00 Run')
  .withManualScheduler()
  .withAnalytics(false)
  .build();

session.start();
session.scheduler.tick(1);
session.next();

expect(session.snapshot.status).toBe('running');
expect(session.getOutputStatements()).toContainOutputType('event');
```

Suggested files:

```text
src/runtime/session/__tests__/
  RuntimeSession.lifecycle.test.ts
  RuntimeSession.completion.test.ts
  RuntimeSession.output.test.ts
  RuntimeSession.dispose.test.ts
  RuntimeSession.plugins.test.ts

src/testing/harness/
  RuntimeSessionTestBuilder.ts
```

### 9.3 Tests that become simpler

Current tests that manually coordinate `ScriptRuntime`, `useRuntimeExecution`, output logs, analytics finalization, and stack completion can move to session tests.

Examples of session tests:

1. **Start starts scheduler**
   - create session with manual scheduler
   - call `start()`
   - assert status `running`

2. **Pause emits timer pause**
   - subscribe to output or event handler
   - call `pause()`
   - assert status `paused`

3. **Next starts a not-yet-running session**
   - call `next()` while `ready`
   - assert `NextEvent` dispatched and status `running`

4. **Empty stack completes once**
   - force stack to empty or run through a tiny block
   - assert one completion event
   - assert scheduler stopped
   - assert analytics finalized once

5. **Dispose while running creates partial completion**
   - start session
   - dispose
   - assert completion reason `disposed-partial`
   - assert `results.completed === false`

6. **Stop produces user-ended results**
   - start session
   - stop
   - assert reason `stopped`
   - assert `results.completed === true`
   - assert output logs are included

### 9.4 Workbench tests

Workbench tests should stop mocking `IScriptRuntime` internals directly. They should mock `IRuntimeSession`:

```typescript
const session = new FakeRuntimeSession()
  .withStatus('ready')
  .withOutput(loadOutput);

render(<RuntimeHost session={session} />);

await user.click(screen.getByRole('button', { name: /start/i }));
expect(session.start).toHaveBeenCalled();
```

This is the primary testability gain: UI tests verify user intent maps to session verbs, not event bus/action details.

### 9.5 E2E acceptance coverage

For UI/layout/interaction work, keep Playwright coverage at the Workbench or Runtime Host level. New acceptance criteria:

- launching a WOD creates one session
- Start transitions `ready → running`
- Pause transitions `running → paused`
- Next advances the visible stack/current block
- completion transitions to Review and persists logs/results
- leaving the page while running saves a partial result

---

## 10. Migration Plan

### Phase 0 — Lock terminology

Add this distinction to docs and code comments:

- Runtime Session: application-facing workout execution module.
- Session Root Block: top-level runtime block inside the stack.
- Script Runtime: low-level action/stack/event execution engine.

### Phase 1 — Introduce session wrapper without changing behavior

Create:

- `src/runtime/session/IRuntimeSession.ts`
- `src/runtime/session/RuntimeSession.ts`
- `src/runtime/session/RuntimeScheduler.ts`
- `src/runtime/session/adapters/IntervalRuntimeScheduler.ts`
- `src/runtime/session/adapters/ManualRuntimeScheduler.ts`
- `src/runtime/session/RuntimeSessionFactory.ts`

`RuntimeSessionFactory` should call the existing `RuntimeFactory.createRuntime()`.

No UI migration yet. Add pure runtime session tests first.

### Phase 2 — Add React provider alongside existing provider

Create `RuntimeSessionProvider` with compatibility fields:

```typescript
{
  session,
  runtime: session?.runtime ?? null,
  initializeSession,
  initializeRuntime: initializeSession, // temporary alias
  disposeSession,
  disposeRuntime: disposeSession,       // temporary alias
}
```

This allows incremental replacement of `RuntimeLifecycleProvider`.

### Phase 3 — Move `useRuntimeExecution` behavior into RuntimeSession

Replace UI usage of `useRuntimeExecution(runtime)` with `useRuntimeSessionSnapshot(session)`.

Keep `useRuntimeExecution` temporarily as a compatibility adapter:

```typescript
export function useRuntimeExecution(runtime: ScriptRuntime | null) {
  // deprecated: retained only until panels migrate
}
```

Or create a new adapter:

```typescript
export function useRuntimeSessionExecution(session: IRuntimeSession | null) {
  // returns old UseRuntimeExecutionReturn shape
}
```

### Phase 4 — Move Workbench side effects into plugins

Move from `useWorkbenchRuntime` into plugins:

- audio registration
- analytics engine setup
- analytics finalization
- browser workout event mapping if useful

`useWorkbenchRuntime` becomes mostly naming compatibility.

### Phase 5 — Update Runtime Host / Workbench composition

This aligns with [`decoupling-planner-workbench.md`](./decoupling-planner-workbench.md):

- Planner passes a `WodBlock` to Runtime Host.
- Runtime Host creates an `IRuntimeSession`.
- Runtime Host exposes session controls and completion callback.
- Workbench composition saves `RuntimeSessionCompletion.results` through the Note lifecycle/persistence layer.

### Phase 6 — Reduce raw runtime exposure

After consumers migrate:

- keep `session.runtime` for advanced internal use
- prefer read-only session observations for UI
- consider moving memory/stack-specific read needs behind session read adapters

Do this only after real caller pressure identifies the right narrower interface.

---

## 11. Compatibility Matrix

| Current consumer | Initial change | Final shape |
|------------------|----------------|-------------|
| `RuntimeLifecycleProvider` | wrap/create `IRuntimeSession`; expose `runtime` alias | replaced by `RuntimeSessionProvider` |
| `useWorkbenchRuntime` | delegate controls to session | removed or becomes thin adapter |
| `useRuntimeExecution` | unchanged initially | replaced by session scheduler/snapshot hook |
| Timer panels reading runtime memory | use `session.runtime` temporarily | use session/read adapter if needed |
| Cast subscription | subscribe through session stack/output methods | no direct runtime construction |
| Unit behavior tests | no change | no change |
| Runtime integration tests | add session-level tests | use `RuntimeSessionTestBuilder` for user flows |
| E2E tests | no immediate change | assert session-visible behavior through UI |

---

## 12. Main Risks and Mitigations

### Risk: Too much hidden behind session too early

Mitigation: keep `session.runtime` escape hatch during migration. Do not remove `IScriptRuntime` from internal modules.

### Risk: React state and runtime disposal warnings return

Current `RuntimeLifecycleProvider` has careful comments about not disposing inside React state updaters. Preserve this by keeping disposal synchronous and ref-driven in the provider. The session should own runtime disposal, but the provider should still call it outside render/updater paths.

### Risk: Analytics finalization changes result logs

Mitigation: add session completion tests that assert `runtime.finalizeAnalytics()`/plugin finalization occurs before `WorkoutResults.logs` are captured.

### Risk: Duplicate completion events

Mitigation: session stores `completion: RuntimeSessionCompletion | null`; completion is idempotent. Test stop-after-complete, dispose-after-complete, and empty-stack notifications firing multiple times.

### Risk: Existing cast snapshots rely on stack-settled notification

Mitigation: do not move `_notifyStackSettled()` out of `ScriptRuntime` initially. RuntimeSession subscribes to `runtime.subscribeToStack()` and benefits from existing settled snapshots.

### Risk: Confusion between `SessionRootBlock` and `RuntimeSession`

Mitigation: document and enforce naming. Avoid exporting a generic `Session` type.

---

## 13. Recommended First PR

Keep the first PR small and non-invasive:

1. Add `RuntimeScheduler` plus `IntervalRuntimeScheduler` and `ManualRuntimeScheduler`.
2. Add `IRuntimeSession` and `RuntimeSession` wrapping an existing `IScriptRuntime`.
3. Add `RuntimeSessionFactory` that delegates to existing `RuntimeFactory`.
4. Add session tests for:
   - start/pause/resume status
   - manual tick dispatch
   - next starts session
   - empty stack completion idempotency
   - dispose while running emits partial completion
5. Export session contracts from `src/runtime/session/index.ts` and `src/hooks/useRuntimeTimer.ts`.
6. Do **not** migrate Workbench yet.

This proves the seam without touching UI, persistence, cast, or existing runtime behavior tests.

---

## 14. Open Decisions

1. Should `stop()` mean `completed: true` forever, or should it become a separate persisted outcome?
   - Phase-one recommendation: preserve current behavior (`true`).

2. Should analytics finalization be a built-in `RuntimeSession` responsibility or a plugin?
   - Recommendation: plugin, because tests and non-browser runtime hosts may omit it.

3. Should `RuntimeSessionFactory` replace `RuntimeFactory`, or sit above it?
   - Recommendation: sit above it first; replacement can happen later if duplication remains.

4. Should `RuntimeSession` expose `runtime` forever?
   - Recommendation: expose as an escape hatch initially; reduce only when callers reveal better read interfaces.

5. Should session creation happen in `src/runtime/` or `src/components/layout/`?
   - Recommendation: runtime/session owns core behavior; React provider owns component lifecycle only.

---

## 15. Success Criteria

The Runtime Session Module is earning its depth when:

- Workbench controls call `session.start/pause/next/stop`, not `runtime.handle(...)`.
- Completion and partial-save semantics are tested once at the session seam.
- Analytics finalization is no longer duplicated between stop and completion paths.
- Tests can run a session with `ManualRuntimeScheduler` without React hooks or fake timers.
- Behavior tests remain unchanged.
- `ScriptRuntime` remains the deep internal action engine, but most application code no longer needs to understand action turns, stack observers, or event bus wiring.
