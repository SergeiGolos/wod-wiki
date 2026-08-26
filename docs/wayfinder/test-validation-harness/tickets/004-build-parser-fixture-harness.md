---
state: open
labels: [wayfinder:task]
title: "Build the parser fixture harness"
blocked-by: ["001-parser-fixture-file-format"]
---

## Question

Land the goal-1 harness in-repo, implementing 001's spec:

1. Glob-discovery of the fixture catalog in the owning package's vitest
   project — creating a new fixture file adds a test with zero TS changes.
2. Semantic comparator implementing 001's comparison rules (subset/exact,
   ordering, ignored meta fields, error cases).
3. Wiring into `bun run test:packages` (root workspace stays green).
4. Harness unit tests (comparator rules, discovery, malformed-fixture
   diagnostics that name file + section).
5. Initial fixture set: the approved examples from 001 plus coverage of the
   syntax-reference basics (`docs/02-syntax-reference.md`).

Verification: root suite green; adding a fixture file without touching any
TS adds a visible passing/failing test; a deliberately wrong expectation
fails with a readable diff naming the fixture.
