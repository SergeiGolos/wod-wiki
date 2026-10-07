# Runtime REPL Loop — Design Plan

Status: draft plan, 2026-10-06. Engine support for a session that waits for
the next request instead of ending when its blocks run out, with a session
timer that runs independently of the blocks being executed.

## Where the engine stands today (verified in code)

- `ScriptRuntime` (`packages/lang/src/runtime`) is purely reactive — it has
  no internal loop. `handle(event)` dispatches through the event bus and runs
  the resulting actions as a "turn" (`do()` / `doAll()`); time is frozen
  during a turn.
- The driver lives in React: `useRuntimeExecution` sends a `TickEvent` every
  20 ms. **Completion is inferred**: when a stack snapshot shows an empty
  stack while running/paused, the hook sets status `completed` and clears
  the interval.
- `RuntimeClock` is span-based (start/stop open and close `TimeSpan`s,
  `elapsed` sums closed + open spans). It starts at runtime construction and
  stops at `dispose()` — it is already independent of individual blocks.
- Sessions today are fixed programs: `StartSessionAction` builds child
  groups once from the script's top-level statements and pushes a
  `SessionRootBlock` (CountupTimerBehavior for session elapsed,
  ChildSelectionBehavior for sequencing, WaitingToStartInjectorBehavior).
  `WaitingToStartBlock` is an idle gate: it sits on the stack and pops on
  the `next` event via `ExitBehavior`.
- Blocks can already be pushed at any time (`runtime.pushBlock`, `PushBlockAction`),
  and the JIT compiles statement groups into blocks on demand
  (`IJitCompiler.compile(nodes, runtime)`).

## Concept

REPL mode is a session whose root block never completes on its own:

1. A `ReplRootBlock` (SessionRootBlock variant) sits at the bottom of the
   stack for the whole session. Its child queue is **open** — groups can be
   appended at any time, not fixed at start.
2. When the queue drains, the root pushes a `WaitingForRequestBlock` (the
   WaitingToStart gate generalized) and idles. The stack never empties, so
   the session stays alive.
3. New work arrives as an enqueue request; the wait block pops and the new
   blocks go on the stack.
4. The session ends only on an explicit finish (or the existing `abort`).

## The separate timer

Two clocks, kept distinct:

- **Session timer** — the root's CountupTimerBehavior over `RuntimeClock`
  spans. Starts when the REPL session starts, runs through waits and work,
  stops only at finish. Waits do not close the span, so elapsed includes
  idle time (it is a wall-clock session timer). `timer:pause` still closes
  the span and `timer:resume` opens a new one, so paused time stays excluded
  from `elapsed` exactly as today.
- **Block timers** — per-block timer memory, unchanged: they start and stop
  with their blocks and know nothing about the REPL wait state.

## Enqueue semantics ("putting more blocks on the stack")

- New API on the runtime: `enqueue(source)` plus an `EnqueueBlocksAction`
  and a `repl:enqueue` event, so both direct calls and event-driven callers
  (scroll sections, cast) can feed the loop.
- Input is raw markdown text: parse → statements → JIT compile → append the
  resulting child groups to the root's queue. (Text-in matches the editor
  model; the REPL session owns a mutable statement registry because
  `runtime.script` is fixed at construction.)
- If the wait block is on top: pop it, push the new work.
- If work is running: groups queue behind the current children (FIFO at the
  root level). Enqueue never interrupts the current block; an
  `interrupt: true` variant can come later if a caller needs it.
- Each enqueue is a segment boundary in the output stream — the pop handler
  already emits a segment from result memory per block, so per-request
  analytics fall out of the existing contract (history persistence stays the
  workbench's job, reading the output stream).

## Completion becomes explicit

- In REPL mode the driver gains a `waiting` status: stack = root + wait
  block reads as *waiting*, never `completed`.
- Finish is `runtime.finish()` / a `repl:finish` event: pop the wait block,
  complete and pop the root. The root's ReportOutputBehavior emits the final
  segment with the completion reason — that emission is the save point the
  workbench already listens for.
- Non-REPL sessions are untouched: empty stack still means completed.
- `abort` remains the hard stop from any state, including waiting.

## Tick loop while waiting

Keep the 20 ms tick running while waiting. Ticks that produce no actions
are already dropped cheaply in `ScriptRuntime.handle()` (no output
flooding), and the session-timer display updates off the same loop.
Parking the interval while waiting (wake on enqueue/next) is a possible
later optimization, not needed for v1.

## The three ways metrics get generated

The engine has (or gains) three entry modes that all converge on the same
output stream → analytics → metrics pipeline:

| Mode | Fence | How metrics are produced |
| --- | --- | --- |
| **Log** | ` ```log ` | Statements are entered as a record of what was done. The engine turns the statements into metrics directly — no timer session, no live execution. |
| **Time** | ` ```time ` | A fixed program runs under the timer runtime; blocks execute live and the runtime generates metrics from the run (durations measured, not declared). |
| **Track** | ` ```track ` | REPL mode (below). The session stays open; the user adds statements over time and each addition runs as it arrives. Downtime between additions is treated as rest, so the timeline — and its metrics — stay continuous. |

`log` and `time` already exist as the app's two fence tags and both already
feed the analytics processors (`fenceTypes = ['time', 'log']`). `track` is
the new third tag: same statement language, same metric output, different
session shape — open-ended instead of fixed.

## REPL mode as ` ```track `

A `track` fence opens a REPL session instead of a fixed program:

1. **Open.** Starting a track block creates the runtime with a
   `ReplRootBlock` and the session timer starts. The root immediately
   pushes the wait gate — the session is *waiting* before anything is added.
2. **Add.** The user appends statements to the track text and submits them
   (the enqueue API). The statements JIT-compile and go on the stack; they
   run under the normal timer machinery, so a tracked set accrues the same
   duration/effort metrics a `time` block would produce.
3. **Rest.** When the added work drains, the session returns to waiting.
   The gap is not dead air: on the next enqueue (or on finish), the wait
   is closed out as a **measured rest segment** — a segment in the output
   stream carrying the rest duration, indistinguishable downstream from a
   prescribed rest. The timeline has no holes: work, rest, work, rest,
   for as long as the session stays open.
4. **Finish.** An explicit finish closes any open wait (as a final rest
   segment), completes the root, and emits the final segment — the save
   point for the session's metrics, same as a `time` session.

Key difference from the existing `RestBlock`: a prescribed rest has a
duration up front and counts *down* to auto-pop. Track rest is open-ended —
it starts when work drains and its duration is whatever elapsed until the
next request closes it. Implementation-wise the wait gate is a
WaitingToStart-style block (no countdown behavior) that records its start
timestamp; closing it emits the rest segment with the measured duration.

Editing model: track is **append-only** from the engine's side. The editor
text can grow freely, but the engine consumes statements past a cursor —
what already ran is history and isn't recompiled. (Re-running an edited
earlier statement is just a new enqueue.)

## Decisions to settle

1. Does `timer:pause` during a wait pause the session timer? (Recommend:
   yes — one pause concept for the user.)
2. Enqueue while paused: queue only, or auto-resume? (Recommend: queue
   only; resume stays an explicit user action.)
3. `next` while waiting with an empty queue: no-op? (Recommend: no-op.)
4. Does `workout:stop` have a runtime handler today? The session root's
   Stop button emits it; a handler was not found in the runtime during this
   review. If finish replaces it in REPL mode, say so explicitly.
5. Track rest threshold: very short gaps (a few seconds between rapid
   additions) — emit as rest segments anyway, or merge into the
   surrounding work below a minimum (e.g. 5 s)? (Recommend: emit all, let
   WQL filter; merging loses information.)
6. Track and pause: does `timer:pause` during a track wait suspend rest
   accrual too, or does rest keep accruing while paused? (Recommend: pause
   suspends both — the paused gap is neither work nor rest.)

## Implementation steps

1. Open-queue child selection: extend `ChildSelectionBehavior` with
   `appendGroups()` (or a `ReplChildSelectionBehavior` subclass) and build
   `ReplRootBlock` + `WaitingForRequestBlock`.
2. `StartReplAction`, `EnqueueBlocksAction`, `repl:enqueue` / `repl:finish`
   event handlers; mutable session statement registry for text-in enqueue.
3. Driver: `waiting` status and explicit-finish completion in
   `useRuntimeExecution` (REPL mode only).
4. Session-clock wiring: root timer spans across waits; finish closes the
   span; verify `elapsed` continuity in tests.
5. Tests in the runtime-compliance style: enqueue → run → drain → wait →
   enqueue → finish; session-timer continuity across a wait; pause during
   wait; abort from wait; non-REPL completion behavior unchanged.

## Motivating use case

The homepage single-session model: a sticky editor whose text sections
enqueue blocks into one long-lived session (Run scrolls to the runtime,
scroll actions raise events, Stop finishes the session and hands its
output stream to metrics). The REPL loop is the engine piece that lets
that session sit waiting between pushes while its timer runs.
