## Action Fragments – Phased Delivery Plan

### Goal
- Formalize `[:action]` / `[:!action]` syntax and wire it through parser → compiler → runtime → UI so actions surface as runtime-driven buttons/events with parent pin inheritance.

### Scope
- Parser/fragment model, fragment compiler, runtime action state + push/pop actions, block lifecycle wiring, display surface swap to runtime-driven actions, validation/tests.
- Out of scope: broader UX redesign of clock/cards, analytics dashboards.

### Current Gaps
- Parser loses `!` (no pinned flag) and treats action as plain string.
- No runtime memory surface for available actions; buttons are manual per card/timer.
- Parent actions not inherited when children push their own actions.

### Success Criteria
- `[:foo]` and `[:!foo]` round-trip with `name`, `isPinned`, `eventName`.
- Runtime exposes a stable `ACTION_STACK_STATE` memory shape; UI renders from it; clicks emit runtime events.
- Child action pushes inherit pinned parent actions; popping restores parents without flicker.
- Tests cover parser, compiler, runtime stack behavior, and UI render/interaction.

### Phases
- **Phase 0 – Alignment & Contracts (this doc)**
  - Confirm memory shape, descriptor fields, and event emission contract.
  - Define migration path for legacy `buttons` on cards/timers.

- **Phase 1 – Syntax & Fragment Model**
  - Parser: accept `[:action]` and `[:!action]`, capture `raw`, `name`, `isPinned`.
  - Fragment: extend `ActionFragment` with `raw`, `name`, `isPinned`, `sourceLine` (from meta).
  - Tests: parser/visitor unit tests for pinned/unpinned and symbol cases.

- **Phase 2 – Runtime Action State & Actions**
  - Add `MemoryTypeEnum.ACTION_STACK_STATE` with shape `{ visible: ActionDescriptor[]; stack: ActionDescriptor[][] }`.
  - Implement `PushActionsAction`, `PopActionsAction`, `UpdateActionsAction` (recompute `visible` as `pinned parents + top`).
  - Add unit tests for push/pop/merge and pinned inheritance.

- **Phase 3 – Compilation & Block Wiring**
  - `ActionFragmentCompiler` emits `ActionDescriptor` array (id, name, eventName, isPinned, ownerId, sourceId).
  - Add behavior/util for blocks to push their actions on `mount` and pop on `unmount`; children merge pinned parents.
  - Integration tests in runtime strategies to ensure descriptors reach runtime state.

- **Phase 4 – UI Integration**
  - Clock/cards consume `ACTION_STACK_STATE.visible` to render action buttons (fallback to legacy `buttons` during migration).
  - Button click dispatches `EmitEventAction` with descriptor `eventName`/payload.
  - Storybook story showing parent-pinned + child actions stacking.

- **Phase 5 – Validation & Rollout**
  - Tests: parser, fragment compiler, runtime push/pop, UI interaction.
  - Manual: Storybook runtime test bench verifying inherited pinned actions, action clicks emit events.
  - Deprecate legacy per-entry `buttons` once consumers migrated.

### Risks / Mitigations
- Flicker or loss of parent actions when child pushes: ensure recompute merges pinned parents first.
- Event naming collisions: require `eventName` normalization (lowercase kebab) and optional payload in descriptor.
- Back-compat: keep legacy `buttons` until Phase 4 completes; guard behind presence of action state.

### Open Questions
- Should `[:!action]` also pin ordering (always first) or only visibility? (default: only visibility, stable sort by owner depth then descriptor order.)
- Do actions need payload schema now, or keep `payload?: Record<string, unknown>` optional? (default: optional.)
- Where to surface actions in non-clock contexts (e.g., inline cards preview)?

### Milestones / Owners (proposed)
- P1 Syntax/Fragment (Owner: Parser): 1 day
- P2 Runtime Action State (Owner: Runtime): 1–2 days
- P3 Compiler/Block Wiring (Owner: Runtime): 1 day
- P4 UI Integration (Owner: UI): 1–2 days
- P5 Validation (Owner: QA): 0.5 day