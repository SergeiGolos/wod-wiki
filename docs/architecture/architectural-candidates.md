# Architectural Deepening Candidates

Surfaced during codebase review (2026-05-08). Each candidate is a **deepening opportunity** — a place where a shallow or fuzzy module can be made deeper, more testable, and more locally reasoned about.

Use the **deletion test** to validate each: if you delete the module, does complexity concentrate (earning its keep) or scatter (pass-through)?

---

## Candidate 1 — Dual Memory Namespace: `MemoryTag` + `MemoryType`

**Files:** `src/runtime/memory/MemoryLocation.ts`, `src/runtime/memory/MemoryTypes.ts`, `src/runtime/contracts/IRuntimeBlock.ts`, `src/runtime/RuntimeBlock.ts`

**Problem:**
Two overlapping, partially-redundant type systems name block memory simultaneously. `MemoryTag` (in `MemoryLocation.ts`) includes strings like `'time'`, `'timer'`, `'round'`, `'metric:display'`, etc. `MemoryType` (in `MemoryTypes.ts`) is a narrower union (`'timer' | 'round' | 'children:status' | ...`) with a typed value registry (`MemoryTypeMap`). Worse: behaviors write with tag `'time'` (the actual tag used at runtime), but the `MemoryType` enum calls it `'timer'` — a silent mismatch. `IRuntimeBlock` still carries 3 deprecated shim methods (`getMemory`, `hasMemory`, `setMemoryValue`) using the old system. Every caller must know which API layer applies. The interface is bloated carrying both.

**Solution:**
Consolidate into a single `MemoryTag` namespace (already the direction things are heading). Remove the deprecated shims from `IRuntimeBlock` entirely. Complete the migration: align the `'time'` tag with `'timer'` or rename consistently, and eliminate `MemoryType` as a distinct type once all callsites use `MemoryTag`.

**Benefits:**
- Every caller uses one API — no "which layer am I on?" question
- `IRuntimeBlock` interface shrinks (3 fewer deprecated methods)
- `MockBlock` no longer needs to implement deprecated shims
- The `'time'` vs `'timer'` mismatch becomes a type error, not a runtime surprise
- Locality: all memory addressing decisions live in one place

---

## Candidate 2 — `ScriptRuntime` God-Object: 8 Output Emission Sites

**Files:** `src/runtime/ScriptRuntime.ts` (746 lines), `src/runtime/RuntimeBlock.ts`, `src/runtime/behaviors/ReportOutputBehavior.ts`, `src/runtime/BehaviorContext.ts`

**Problem:**
Output statements (`'segment'`, `'completion'`, `'system'`, `'event'`, `'compiler'`, `'load'`) are emitted from 8+ locations across the runtime:

| Site | Emits |
|------|-------|
| `ScriptRuntime.emitSystemOutput()` | `'system'` on push/pop |
| `ScriptRuntime.emitSegmentOutputFromResultMemory()` | `'segment'` on pop |
| `ScriptRuntime.emitLoadOutput()` | `'load'` on construction |
| `ScriptRuntime.emitEventOutput()` | `'event'` on dispatch |
| `ScriptRuntime.emitCompilerOutput()` | `'compiler'` on block push |
| `RuntimeBlock.emitNextSystemOutput()` | `'system'` on next() |
| `BehaviorContext.emitOutput()` → `runtime.addOutput()` | behavior-driven outputs |
| `ReportOutputBehavior` | `'completion'`, `'milestone'`, `'segment'` |

"What goes into the output log" is scattered. `ScriptRuntime` is also simultaneously responsible for: action execution, clock management, stack observation, output collection, analytics engine, tracker, global event handler registration, and dispose. Deletion test: delete `ScriptRuntime` — complexity doesn't concentrate, it fragments across 8 sites.

**Solution:**
Extract an `OutputEmitter` module (or `RuntimeOutputLog`) as a deep module behind a narrow interface: `add(output)`, `subscribe(listener)`, `getAll()`, `dispose()`. All current callers already converge on `addOutput()` — this is the real seam. The private emission helpers (`emitSystemOutput`, `emitLoadOutput`, etc.) become internal methods of `OutputEmitter`, not `ScriptRuntime`. Analytics enrichment and listener notification invariants live there too.

**Benefits:**
- `ScriptRuntime` slims to coordination only
- The output pipeline becomes independently testable (no runtime needed to test emission logic)
- All output invariants (analytics enrichment, listener notification, GC optimization for system outputs) are localized
- Leverage: callers call `add()`, and all the policy (enrich, skip if no listeners, notify) happens behind the seam

---

## Candidate 3 — `BlockBuilder.hasTimerBehavior()` Knows Concrete Types (Inverted Dependency)

**Files:** `src/runtime/compiler/BlockBuilder.ts`, all files in `src/runtime/compiler/strategies/`

**Problem:**
`BlockBuilder.hasTimerBehavior()` imports and names `CountdownTimerBehavior`, `CountupTimerBehavior`, and `SpanTrackingBehavior` directly to perform its guard check. This means the builder's interface leaks knowledge of *which concrete behaviors constitute "a timer"*. Adding a new timer behavior type requires editing `BlockBuilder`. The composition contract (strategies compose a builder, builder stays agnostic) inverts: the builder now knows about strategy-level decisions.

Strategies call `builder.hasTimerBehavior()` to bail early — a guard that's correct in intent but wrong in coupling.

**Solution:**
Replace type-checking with a capability/trait system. `addBehavior()` accepts an optional `traits: string[]` parameter (e.g., `'timer'`, `'rounds'`, `'container'`). `hasTrait('timer')` replaces `hasTimerBehavior()`. `hasRoundConfig()` becomes `hasTrait('rounds')`. Strategies register traits when adding behaviors; other strategies query them. The builder stays agnostic of concrete behavior classes.

**Benefits:**
- Adding a new timer behavior type never requires touching `BlockBuilder`
- The guard API is in the interface (trait strings), not the implementation (concrete types)
- Strategies become more self-contained — they declare their own capabilities
- Testability: mock strategies register traits without importing concrete behavior classes

---

## Candidate 4 — Copy-Pasted `BlockKey + BlockContext` Boilerplate in Every Strategy

**Files:** All strategy files in `src/runtime/compiler/strategies/` (7+ files)

**Problem:**
Every single strategy `apply()` begins with identical boilerplate:

```typescript
const blockKey = new BlockKey();
const context = new BlockContext(runtime, blockKey.toString(), exerciseId);
builder.setContext(context).setKey(blockKey)...
```

If a strategy forgets this, `builder.build()` throws at runtime — a required setup step enforced by convention, not by the type system. Every strategy also imports `BlockKey` and `BlockContext` directly, coupling all strategies to these implementation details.

**Solution:**
`BlockBuilder` initializes with a default `BlockKey` and lazily creates its `BlockContext` from the runtime on `build()` if none was set explicitly. Strategies that need a custom `exerciseId` call `builder.setExerciseId(id)`. The key/context creation invariant is enforced by the builder, not by convention.

**Benefits:**
- Strategy code shrinks and focuses on composition intent, not identity plumbing
- Required setup becomes impossible to forget — `build()` never throws for missing context
- Locality: key and context creation logic lives in one place (the builder)
- Strategies no longer need to import `BlockKey` or `BlockContext`

---

## Candidate 5 — `CompileChildBlockAction` Hidden Inside `ChildSelectionBehavior`

**Files:** `src/runtime/behaviors/ChildSelectionBehavior.ts`, `src/runtime/actions/stack/`

**Problem:**
`CompileChildBlockAction` is a private class defined *inside* `ChildSelectionBehavior.ts`. It directly accesses `runtime.script` and `runtime.jit` — it is the heart of the "compile a child block and push it" cycle, the critical recursive step in the entire runtime. But it is:

- **Anonymous**: no exported name, not referenced in the action type system
- **Hidden**: buried in a behavior file, not discoverable alongside other stack actions
- **Not reusable**: any future behavior needing "push a compiled child" must duplicate or depend on `ChildSelectionBehavior`
- **Untestable in isolation**: you must instantiate a full `ChildSelectionBehavior` to exercise it

The "statement IDs → compiled block → push to stack" flow is an important seam. Right now it has one hidden adapter. One adapter = hypothetical seam. Two adapters = real seam.

**Solution:**
Elevate `CompileChildBlockAction` to a first-class, exported action in `src/runtime/actions/stack/CompileAndPushBlockAction.ts` (note: a file with this name already exists — review for merge/consolidation). Give it a named `type` in the action type registry. `ChildSelectionBehavior` becomes a consumer of this action, not its owner.

**Benefits:**
- The compile-to-push cycle is independently testable without behavior scaffolding
- Any behavior or action that needs to push a compiled child can reuse it
- The action type system accurately reflects what the runtime does
- Locality: all "push something onto the stack" actions are co-located in `src/runtime/actions/stack/`
