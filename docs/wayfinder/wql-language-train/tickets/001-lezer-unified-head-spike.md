---
state: closed 2026-08-24
assignee: serge # claimed 2026-08-24
labels: [wayfinder:prototype]
title: "Lezer unified-head conflict spike"
blocked-by: []
---

## Question

Prototype doc C4 names the one uncertain step first: can the head rule admit
rows — `Head { Aggregator (colon Metric)? }` or a dedicated Rows node — under
the single-Word-token discipline documented in `wql.grammar:14-29`, without a
Lezer conflict? If the optional metric conflicts with Filters, the
dedicated-node fallback wins.

Deliverable: a working grammar experiment (branch scratch or gist) plus a
one-page recommendation. Feeds spec v2's C4 section; unblocks ticket 006.

## Resolution

Evidence: [001-lezer-unified-head-spike.md](../assets/001-lezer-unified-head-spike.md)

One-line answer: targeted `rows:<target>` already parses natively under the
unchanged grammar — C4's primary form needs no grammar change; but every
grammar-level shape for the bare `rows:{…}` alias conflicts (`Word` ∩ `By`
after `Aggregator colon`, structural to the single-word-token discipline),
and the prototype's literal `(colon Metric)?` rule generates clean while
covering the wrong language (no-colon form). Grammar stays strict; the alias
fate is a retire-or-normalize decision recorded as spec-v2 agenda item 7
([Reconcile spec v2](003-reconcile-spec-v2-with-event-store.md)).
