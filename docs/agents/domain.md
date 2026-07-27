# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout: multi-context

This repo uses a multi-context layout. The root `CONTEXT.md` carries shared
language (Statement, Metric, Origin, Unit, Block, etc.) that applies to every
context. Context-specific `CONTEXT.md` files live next to their top-level
directory and are indexed by `CONTEXT-MAP.md` at the repo root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root for the shared glossary.
- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per
  context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
  In multi-context repos, also check `src/<context>/docs/adr/` and
  `playground/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence;
don't suggest creating them upfront. The producer skill (`grill-with-docs`)
creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (this repo):

```
/
├── CONTEXT.md                       ← shared glossary (Statement, Metric, …)
├── CONTEXT-MAP.md                   ← index of per-context CONTEXT.md files
├── docs/adr/                        ← system-wide decisions
├── src/
│   └── CONTEXT.md                   ← library / runtime context
│       └── docs/adr/                ← library-specific decisions
└── playground/
    └── CONTEXT.md                   ← playground-app context (routes, persistence)
        └── docs/adr/                ← playground-specific decisions
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal,
a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift
to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either
you're inventing language the project doesn't use (reconsider) or there's a real
gap (note it for `grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_