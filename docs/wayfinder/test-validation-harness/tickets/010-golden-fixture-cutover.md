---
state: open
labels: [wayfinder:task]
title: "Golden fixture cutover"
blocked-by: ["005-seed-fake-data-corpus"]
---

## Question

1. Engine CLI corpus loader (`loadQueryData`,
   `packages/engine/src/cli/query.ts`) accepts `kind: "event-journal"`
   payloads (records → UnifiedEventStore inputs). Grounded caveat:
   `loadQueryData` today **silently ignores** unknown envelope kinds — the
   cutover makes unrecognized kinds an explicit error (reviewer-verified),
   so a mistyped corpus fails loudly.
2. Engine parity tests (`packages/engine/tests/parity.test.ts`) run against
   the corpus journal covering the old golden's queries — and the legacy
   fact-set ingestion path keeps an equivalent inline pin (cutover verifies,
   doesn't silently drop).
3. Storybook `LanguageWorkbench` story + test switch to the corpus via
   `inMemoryEventStore(records)`; the `inMemoryFactStore` legacy adapter and
   `as never[]` casts drop from the story.
4. Delete `packages/engine/fixtures/golden/` and
   `apps/storybook/fixtures/golden/`.

Verification: engine suite + storybook test green; no reference to
`multi-week-journal` remains; `bun run build:packages` clean.
