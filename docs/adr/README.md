# ADRs — Architecture Decision Records

Architecture Decision Records (ADRs) capture load-bearing decisions that
shape the codebase: the kind that, if rejected without rationale, would
be reintroduced by an unsuspecting maintainer.

## Format

Each ADR follows [`0000-template.md`](./0000-template.md):

- **Status:** proposed → accepted → (superseded | deprecated)
- **Context:** the issue, the facts that constrain the decision.
- **Decision:** what was decided, and why.
- **Consequences:** what follows — positive, negative, neutral.
- **Related:** links to findings, code, and other ADRs.

## Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0000](0000-template.md) | Template | template | — |
| [0001](0001-workbench-session-single-store.md) | Workbench state is one Workbench Session, not domain-split stores | accepted | 2026-06-20 |
| [0002](0002-workbench-session-observes-runtime-via-observer-seams.md) | Workbench Session observes the runtime via output + stack observer seams; it does not poll | accepted | 2026-06-20 |

## When to write an ADR

Write one when a decision:

- Rejected a finding in `docs/gml/improve/` with a load-bearing reason.
- Locked in an invariant that should not be silently inverted (e.g. a
  post-mount snapshot rule, a dialect-stage ordering rule).
- Locked in a port/adapter choice that materially changed the seam shape.

Skip one for routine refactors, deletions, and tests. The decisions that
belong here are the ones a future maintainer could quietly undo.
