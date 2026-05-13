# WOD Wiki Architecture Backlog Walkthrough

**Parent backlog:** [WOD-213](paperclip://issues/WOD-213) — WOD Wiki architecture improvement backlog  
**Purpose:** Give a practical walkthrough of each ticket in the architecture backlog, including why it matters, what it improves, and what to watch out for during refactoring.

---

## How to use this document

Treat each ticket as an incremental architecture move, not a rewrite. The goal is to reduce coupling, cut dead surface area, and make the codebase easier to reason about without destabilizing the editor/runtime experience.

For each item below:
- **Benefit** = what gets better if the work lands
- **Tradeoff** = what may get worse or cost more in the short term
- **Refactoring concern** = the risk to watch while changing it

---

## WOD-214 — Audit and decommission or rewire `runtime-test-bench`

### What this ticket is about
The architecture report shows `runtime-test-bench/` has high dead-code concentration and weak alignment with the active entry points. This ticket asks whether the subsystem still has a real runtime purpose or is mostly historical scaffolding.

### Why it matters
- Removes orphaned architecture that new contributors can accidentally depend on
- Shrinks the mental model for runtime-related code
- Clarifies what is actually production-facing versus experimental/test-only

### Benefits
- Less dead surface area in the repo
- Fewer confusing imports and exports
- Easier dependency graph to reason about
- Better chance of simplifying `runtime/` and `testing/` boundaries

### Tradeoffs
- If the subsystem still has hidden consumers, removal could break workflows
- Rewiring it may require adding explicit integration tests first
- Some code may need to stay for historical or test harness reasons even if it looks unused

### Refactoring concerns
- Verify whether any Storybook stories, tests, or internal tools still rely on it
- Check for indirect imports through barrel files
- Distinguish "unused by madge/knip" from "safe to delete"
- Prefer decommissioning in small slices rather than deleting whole directories at once

### Suggested approach
1. Inventory actual consumers.
2. Separate test-only code from runtime-facing code.
3. Remove dead pieces first.
4. If remaining pieces still matter, rewire them into a clearer boundary.

---

## WOD-216 — Reduce `components` layer fan-out

### What this ticket is about
The `components` layer imports from many top-level modules: `runtime`, `services`, `parser`, `types`, `panels`, `hooks`, `nav`, `repositories`, and more. That is a classic sign of a god-layer, where UI composition also becomes an architecture coordination layer.

### Why it matters
- UI code should usually compose lower-level features, not own all feature orchestration
- Wide fan-out makes `components` hard to refactor safely
- Too many cross-layer imports increase coupling and regressions

### Benefits
- Cleaner layering boundaries
- Easier to isolate feature-specific behavior
- Lower risk of accidental cross-module dependency cycles
- Components become more reusable and testable

### Tradeoffs
- Refactoring may initially add more wrapper/facade modules
- Some imports may need to move one layer up or down, which can feel like churn
- There may be short-term duplication while boundaries are clarified

### Refactoring concerns
- Avoid creating a new abstraction just to move imports around
- Watch for components that are secretly doing domain logic or runtime orchestration
- Be careful not to over-normalize and make simple components harder to use

### Suggested approach
1. Identify the top 5 most coupled component areas.
2. Split feature orchestration from presentation.
3. Introduce local facades or feature modules only where they reduce coupling.
4. Keep pure UI components dependency-light.

---

## WOD-219 — Consolidate duplicate types between `core` and `runtime` contracts

### What this ticket is about
The report shows type duplication between `core/types/` and `runtime/contracts/`. That usually means the domain model is leaking into multiple layers with slightly different interpretations.

### Why it matters
- Duplicate types drift over time
- Different layers start encoding the same concept in different shapes
- Type changes become expensive because you have to update multiple sources of truth

### Benefits
- One canonical definition for shared concepts
- Less rename/retype churn across the repo
- Easier API compatibility between runtime and core
- Better autocomplete and more trustworthy TS inference

### Tradeoffs
- Consolidation can cause widespread compile errors at first
- Some consumers may need adapter code to bridge old/new shapes
- Type-only refactors can feel slow because they touch many files without visible runtime changes

### Refactoring concerns
- Don't collapse types too aggressively if runtime and core actually need different invariants
- Preserve semantic intent; shared names do not always mean shared shape
- Be cautious with barrel exports if they hide which layer owns a type

### Suggested approach
1. Identify truly shared primitives versus layer-specific variants.
2. Move shared primitives into one canonical contract location.
3. Replace duplicates with re-exports or adapters as needed.
4. Add type tests or compile checks to lock the shape down.

---

## WOD-221 — Trim barrel exports and dead re-exports

### What this ticket is about
The architecture report shows several barrels exporting a lot of unused surface, especially `runtime/compiler/metrics/index.ts` and `runtime/events/index.ts`. Barrels are convenient, but they can become a hiding place for stale API surface.

### Why it matters
- Excess exports create false signals about what the module supports
- Barrels make refactors riskier because consumers may depend on accidental public APIs
- Dead re-exports increase maintenance cost even when runtime code is unchanged

### Benefits
- Smaller public API surface
- Easier to see which symbols are actually supported
- Better tree-shaking opportunities in some build paths
- Less accidental coupling to internal module structure

### Tradeoffs
- Consumers may need import path updates
- Some external-looking exports might still be needed for internal convenience
- Over-trimming can make common imports noisier

### Refactoring concerns
- Watch for hidden imports via barrels in tests and Storybook stories
- Avoid deleting exports before checking if they are used in docs or demos
- Keep intentionally public module entry points stable

### Suggested approach
1. Identify truly unused exports.
2. Remove only the dead ones first.
3. Keep the barrel if it still serves a clear public API role.
4. Add lint or CI checks to prevent re-accumulation.

---

## WOD-222 — Add Storybook dependency hygiene and CI guardrails

### What this ticket is about
The report flagged `@storybook/react` as appearing like a dependency-scope problem. This ticket is about making sure Storybook-related packages live where they belong and that the repo has guardrails to prevent future structural debt from creeping back in.

### Why it matters
- Dependency placement affects install size, maintainability, and build clarity
- CI guardrails turn architecture hygiene into a repeatable practice
- The team gets early warning when dead exports or cycles reappear

### Benefits
- Cleaner `package.json`
- Better dependency ownership
- Less chance of accidental runtime bundling of tooling-only packages
- More durable architecture discipline over time

### Tradeoffs
- Adding checks can slow CI a bit
- Dependency cleanup may require aligning Storybook config or test tooling
- Guardrails can create noisy failures if they are too strict too early

### Refactoring concerns
- Make sure Storybook still boots after dependency changes
- Avoid mixing product dependencies and tooling dependencies
- If you add `ts-prune`, `madge`, or similar checks, keep thresholds realistic

### Suggested approach
1. Fix the package scope issue.
2. Add a small structural check to CI.
3. Start with warnings or informational output if the repo is currently noisy.
4. Tighten enforcement once the baseline is stable.

---

## WOD-223 — Add architecture regression checks to the repo

### What this ticket is about
This ticket is the systemic version of the backlog: rather than fixing one cycle, one barrel, or one duplicated type at a time, it adds guardrails so the repo stops drifting back into the same shape.

### Why it matters
- Architecture debt tends to recur unless it is measured
- A regression check makes structural quality part of normal development
- Prevents backsliding after the backlog is reduced

### Benefits
- Durable protection against cycles and dead exports
- Less future cleanup work
- Safer refactors because regressions are visible quickly
- Creates a measurable architecture standard

### Tradeoffs
- Requires deciding what counts as a real regression versus acceptable noise
- Can be annoying if the rules are too broad or too brittle
- Extra maintenance whenever the repo structure legitimately changes

### Refactoring concerns
- Keep the check focused on high-signal issues only
- Do not encode every preference into CI
- Prefer targeted checks over huge one-size-fits-all lint rules

### Suggested approach
1. Pick the smallest useful set of checks.
2. Run them in CI with clear failure output.
3. Document how to fix violations.
4. Revisit thresholds once the baseline is under control.

---

## Cross-ticket themes

### 1. Layer discipline
The biggest theme is to restore clear boundaries:
- `core` should own stable shared concepts
- `runtime` should own execution logic
- `components` should compose, not orchestrate everything
- `testing` and `runtime-test-bench` should stay clearly scoped

### 2. Reduce accidental public API
Barrels and type re-exports make internal code look public. The backlog is partly about shrinking that accidental surface.

### 3. Prefer incremental refactors
These tickets should not be treated as a rewrite. Each one can land independently if you keep the blast radius small.

### 4. Stabilize with tests and CI
If you remove coupling without adding guardrails, the same patterns will return later.

---

## Refactoring order recommendation

If you want the least risky sequence, I’d do them in this order:

1. **WOD-221** — trim dead barrel exports
2. **WOD-219** — consolidate truly shared types
3. **WOD-216** — reduce component fan-out
4. **WOD-214** — audit or remove runtime-test-bench
5. **WOD-222** — fix dependency hygiene and add lightweight guardrails
6. **WOD-223** — formalize architecture regression checks

That order starts with the lowest-risk cleanup and ends with the broader protection layer.

---

## Bottom line

The architecture backlog is really about three things:

- stop the bleeding with guardrails,
- remove duplication and dead surface, and
- re-establish clear ownership boundaries between core, runtime, and UI.

If you want, I can also turn this into a more opinionated step-by-step implementation plan with recommended file targets and sequence of refactors.
