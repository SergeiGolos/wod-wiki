# Architecture Improvement — Deepening Opportunities

Output of an `improve-codebase-architecture` survey (2026-06-19). Each document
below is one **finding**: a cluster of shallow modules proposed for deepening —
turning them into modules with more behaviour behind a smaller interface.

Each finding has a **Diagrams** section (existing vs proposed paths) and an
**Implementation** section (target shape, ordered steps, tests, acceptance,
risks, story IDs) — enough for a mid-level dev to execute. The proposed module
*shapes* are sketched in plain English; concrete interfaces are confirmed
per-story during implementation. Naming a deepened module after a concept not
in `CONTEXT.md` should add the term to `CONTEXT.md` inline.

**To execute:** [`00-global-plan.md`](00-global-plan.md) sequences every story
across all seven findings for one dev, with cross-track dependencies and a
shared-file "toes" matrix.

## Vocabulary

Architecture terms (the skill's `LANGUAGE.md`, not in-repo): **module, interface, implementation,
depth, seam, adapter, leverage, locality.** Domain terms: see
[`CONTEXT.md`][ctx]. Key principles: the **deletion test** (deleting a
pass-through concentrates complexity; deleting a load-bearing module spreads
it), **the interface is the test surface**, and **one adapter = a hypothetical
seam; two adapters = a real seam.**

[ctx]: ../../../CONTEXT.md

## Findings (worst friction first)

| #   | Finding                                                                       | Subsystem              | Severity |
| --- | ----------------------------------------------------------------------------- | ---------------------- | -------- |
| 1   | [Workbench state layer](01-workbench-state-layer.md)                          | React state / contexts | Critical |
| 2   | [Statement→Block compile pipeline](02-compile-pipeline-statement-to-block.md) | Runtime compiler       | Critical |
| 3   | [ScriptRuntime god module](03-script-runtime-god-module.md)                   | Runtime engine         | Critical |
| 4   | [Cast session/wiring layer](04-cast-session-wiring-layer.md)                  | Cast subsystem         | High     |
| 5   | [The Dialect Stack that doesn't exist](05-dialect-stack.md)                   | Parser / dialects      | High     |
| 6   | [Storage: one decorative seam, one real](06-storage-decorative-seam.md)       | Storage / persistence  | High     |
| 7   | [Note Portability round-trip](07-note-portability-export-import.md)           | Export / import        | High     |
| 8   | [Cleanup — deletion winners](08-cleanup-deletion-winners.md)                  | cross-cutting          | Low      |

## Execution plan

[`00-global-plan.md`](00-global-plan.md) — the story-by-story path for one dev:
a story register, a dependency DAG, waves, and a shared-file "toes" matrix. Each
finding (1–7) is a parallel track; dotted arrows show where finishing one
track's story unblocks another's.

**Status (2026-06-19):** Wave 0 (9 stories: S1a, S2a, S3a, S4a, S5a, S6a, S7a, H1, H2) is complete. All gates green. See [`EXECUTION-LOG.md`](EXECUTION-LOG.md) for the file-level diff and [`00-global-plan.md`](00-global-plan.md#status-2026-06-19) for the per-story status. Wave 1 and Wave 2 are next.

## Reading order suggestions

- **Lowest naming risk / most aligned with `CONTEXT.md`:** #5 (Dialect Stack).
- **Highest AI-navigability payoff (biggest churn hotspot):** #1 (workbench).
- **Most correctness risk:** #2 (two undeclared orderings in the compiler).

## Note on ADRs

No `docs/adr/` exists in this repo. None of these findings re-litigates a
recorded decision. If a finding is rejected with a load-bearing reason,
record an ADR so future surveys don't re-suggest it.
