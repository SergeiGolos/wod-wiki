# Architecture Findings — deepening opportunities

A fresh `improve-codebase-architecture` pass over the codebase, run
**2026-06-20**. Each document below is one **finding**: a walk-through of a
cluster of shallow modules proposed for **deepening** — turning them into
modules with more behaviour behind a smaller interface, so the codebase becomes
more testable and more AI-navigable.

This pass is **informed by, not bound to**, the two prior surveys
(`docs/gml/improve/`, `docs/minimax/improve/`). Three refactor sessions have
since shipped most of that work (compile pipeline, Cast, Dialect Stack,
Storage, Note Portability, ScriptRuntime symptoms, cleanup). What's here is the
**verified-current** remainder plus two findings the prior surveys missed.

## How to read a finding

Each finding walks through:

- **Modules involved** — the files, with current line counts.
- **Problem** — why the current shape causes friction, in locality / leverage /
  depth terms.
- **Deletion test** — would deleting the module concentrate complexity
  (load-bearing) or just move it (shallow pass-through)?
- **Solution** — the deepening *direction* in plain English. **No interfaces are
  proposed yet** — those are pinned in the grilling loop once you pick one.
- **Benefits** — locality, leverage, and how tests improve.
- **Evidence** — file:line citations for every claim.

## Vocabulary

Architecture terms (the skill's `LANGUAGE.md`): **module**, **interface**,
**implementation**, **depth** (deep = high leverage; shallow = interface nearly
as complex as the implementation), **seam**, **adapter**, **leverage**,
**locality**. Domain terms (Statement, Metric, Origin, Cast Backend…) live in
[`CONTEXT.md`](../../CONTEXT.md).

Key principles: the **deletion test** (deleting a pass-through moves
complexity; deleting a load-bearing module spreads it), **the interface is the
test surface**, and **one adapter = a hypothetical seam; two adapters = a real
seam**.

## Findings (worst friction first)

| # | Finding | Subsystem | Severity | New? |
| --- | --- | --- | --- | --- |
| 01 | [Workbench state layer — three carriers, no locality](01-workbench-state-layer.md) | React state / contexts | **Critical** | carries GML #1 (S1b/S1c open) |
| 02 | [`playground/src/App.tsx` is a god component](02-playground-app-god-component.md) | playground shell | **High** | **new** (repo's #1 churn hotspot) |
| 03 | [`ScriptRuntime` is still a god module — the interface never narrowed](03-script-runtime-god-interface.md) | runtime engine | **High** | carries GML #3 (S3 leverage half deferred) |
| 04 | [`MarkdownCanvasPage` does five sub-jobs the hook already half-owns](04-canvas-page-decomposition.md) | playground canvas | Medium | carries GML G2 (open) |
| 05 | [`receiver-rpc.tsx` has three init paths — and a bug they hid](05-receiver-init-paths-and-boot-bug.md) | cast receiver | Medium | carries GML #4 S4c + **a new latent bug** |
| 06 | [Dead code cleanup — with a correction to the prior survey](06-dead-code-cleanup.md) | cross-cutting | Low | re-verifies CD2; **3 items were wrongly flagged dead** |

## Decided / ready to implement

- **Finding 01 → [implementation handoff](01-implementation-handoff.md)** (paste-ready for a fresh session). Design decisions recorded in [ADR-0001](../adr/0001-workbench-session-single-store.md) (consolidate, not decompose) and [ADR-0002](../adr/0002-workbench-session-observes-runtime-via-observer-seams.md) (reactive output + stack observer seams). Findings 02–06 are surveyed but not yet grilled.
- **Finding 02 → [implementation handoff](02-implementation-handoff.md)** (paste-ready). Decompose `App.tsx` into routing+layout by extracting three deduped seams: `workoutIndex` (module + `useWorkoutItems` hook, props preserved), `useCreateJournalEntry`, `usePageScrollSync`. Finding 04 is insulated (props unchanged). Findings 03–06 are surveyed but not yet grilled.
- **Finding 04 → [implementation handoff](04-implementation-handoff.md)** (paste-ready). Decompose `MarkdownCanvasPage` into focused hooks: `useCanvasRuntime` unchanged, new `useCanvasEditorSource` + `useMobileRunOverride`, `<CanvasPanelContent>` component. **Decoupled from 01/03, insulated from 02.** Corrects a load-bearing error in the finding: `contentOverride` is LIVE (HomeView uses it), not dead — preserved, not deleted. Findings 03, 05, 06 are surveyed but not yet grilled.
- **Finding 05 → [implementation handoff](05-implementation-handoff.md)** (paste-ready). Unify the receiver's 3 init paths (shared wiring helper for paths 1&2; CAF boot isolated, not moved into `ReceiverSessionManager`) **and fix the `bootTimeoutRef` bug** (declared-missing ref → device-only `ReferenceError`; one-line fix, ships first). Receiver is insulated from 01/03 at the init-path level (consumes `WorkbenchDisplayState` over the wire; proxy's `IScriptRuntime` surface is 03's job). Findings 03, 06 are surveyed but not yet grilled.
- **Finding 03 → [implementation handoff](03-implementation-handoff.md)** (paste-ready, **highest blast radius** — code health 1.0/10). Extract a **shared `RuntimeObservers` collaborator** (subscriber Sets + `subscribe*`/notify + immediate-initial snapshot + the G3 post-mount contract) that **both `ScriptRuntime` and `ChromecastProxyRuntime` compose.** The `IScriptRuntime` interface stays for subscribers (they need the `subscribe*` methods); only the implementation deepens. Lands **after 01** (preserves its reactive subscriptions per ADR-0002); touches the proxy (05's runtime, by prior agreement). Compliance suite is the gate. Only Finding 06 remains un-grilled.

## Reading-order suggestions

- **Biggest AI-navigability payoff:** #01 (workbench is the app's heart) and
  #02 (App.tsx is the repo's single highest-churn file).
- **Most correctness risk:** #03 (worst code health in the repo, 1.0/10) and
  #05 (a real `ReferenceError` hiding on the Chromecast-only path).
- **Lowest risk / do-first:** #06 (pure deletions, once the product question on
  `CommandContext` is answered).
- **Most localised win:** #04 (self-contained playground refactor).

## What is NOT here (already shipped — do not re-suggest)

The following are **done** across the prior three sessions and are deliberately
not re-listed: the compile-pipeline dedup and explicit behaviour ordering
(GML #2 / S2); the snapshot-constructor merge and `OutputEmitter`
internalization (GML #3 / S3a–S3b — #03 is the *deferred leverage half* of this,
not a re-suggestion of the shipped work); the Cast outbound centralization and
`ReceiverSessionManager` (GML #4 / S4a–S4c — #05 is the *receiver-side tail*);
the real `DialectStack` and sport-Dialect wiring (GML #5 / S5); the Storage
seam collapse (GML #6 / S6); the Note Portability round-trip and port-layer
collapse (GML #7 / S7); the projection-engine move, post-mount invariant, and
ADR scaffolding (G1 / G3 / G4).

## ADRs

Only a template exists in `docs/adr/` (no recorded decisions yet). No finding
here re-litigates a recorded decision. If a finding is rejected with a
load-bearing reason, record an ADR so a future pass does not re-suggest it —
the strongest candidates for a first real ADR are the **post-mount snapshot
contract** (from #03) and the **`IScriptRuntime` width** (also #03, if the wide
interface is kept deliberately).
