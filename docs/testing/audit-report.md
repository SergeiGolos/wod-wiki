# Domain Model Audit Report: Testing & Runtime Alignment

**Date:** 2026-01-24
**Status:** Complete

## Executive Summary
The audit compared existing tests and runtime implementation against the `docs/domain-model` specifications. While the Parser layer is functionally robust for individual fragments, there is a significant architectural misalignment in the Runtime and Layer 3/4 interactions. The system is currently in a "Hybrid" state (Behavior-owned and Memory-owned state) rather than the target "Option D" (Block-owned state).

---

## 🧪 Test Point 1: Parser Contract (`Text → ICodeStatement[]`)
**Contract:** `docs/domain-model/contracts/ICodeStatement.md`

### Findings
- **Fragment Coverage:** ✅ Excellent. Dedicated tests exist for Timer, Rep, Action, Effort, Distance, Resistance, Increment, and Lap fragments.
- **Value Parsing:** ✅ Correct. MS conversion for timers and numeric values for reps are verified.
- **Errors:** ✅ Semantic errors (e.g., invalid seconds) are reported correctly.

### Identified Gaps
- **Hierarchy Assertions:** ❌ Missing. Existing tests (`timer-fragment.parser.test.ts`, etc.) primarily assert `statements[0]`. No tests verify `parent` IDs or `children` ID arrays for nested workout structures.
- **Metadata Validation:** ❌ Minimal. Source offsets and line numbers are not strictly asserted in existing test suites.

---

## 🧪 Test Point 2: Compiler Contract (`Statement[] → IRuntimeBlock`)
**Contract:** `docs/domain-model/contracts/IRuntimeBlock.md`

### Findings
- **Strategy Matching:** ✅ Dialect hints correctly trigger specific strategies (e.g., CrossFit dialect hints matched by `JitCompiler`).
- **Block Identification:** ✅ `blockType` (Timer, AMRAP, etc.) is correctly assigned.

### Identified Gaps
- **Schema Compliance:** ❌ The compiler tests do not assert the presence of the event system (`on`/`emit`) or the initialization of typed state properties on the block itself.

---

## 🧪 Test Point 3: Runtime Contract (`Block Lifecycle → State`)
**Contract:** `docs/domain-model/contracts/IRuntimeMemory.md`

### Findings
- **Behavior Logic:** ✅ `TimerBehavior` and `RoundPerNextBehavior` correctly manage internal state transitions.
- **Lifecycle Events:** ✅ Stack push/pop hooks are sequenced as expected.

### Identified Gaps
- **Block-Owned State (Option D):** 🔴 **Major Gap.** `IRuntimeBlock.ts` (Interface) is missing `timerState` and `roundState` properties. Implementation relies on behaviors storing state in private properties or the deprecated `IRuntimeMemory` system.
- **Event-Driven UI Readiness:** ❌ Blocks do not yet implement `on()` and `emit()` as the primary state synchronization mechanism.

---

## 🧪 Test Point 4: UI Contract (`Memory → Display`)
**Contract:** `docs/domain-model/layers/05-ui-layer.md`

### Findings
- **Static Rendering:** ✅ `FragmentVisualizer` correctly renders fragment groups and colors based on type.

### Identified Gaps
- **Live Binding:** ❌ Missing. No existing components are tested with the `block.on('tick', handler)` subscription pattern. Existing displays are primarily static or legacy-bound.

---

## 📋 Recommended Alignment Steps

1. **[CRITICAL] Refactor `IRuntimeBlock`**: Update the interface to include `timerState`, `roundState`, `on()`, and `emit()`.
2. **Behavior Migration**: Update `TimerBehavior` and `RoundPerNextBehavior` to write state directly to the block properties instead of private values.
3. **Parser Hierarchy Tests**: Add a dedicated `hierarchy.parser.test.ts` to verify parent/child ID mapping.
4. **UI Subscription Utils**: Create a `useBlockEvent` hook to standardize the `block.on` pattern and add RTL tests for it.
