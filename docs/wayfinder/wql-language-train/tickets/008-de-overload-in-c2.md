---
state: open
labels: [wayfinder:task]
title: "De-overload in with compat (C2)"
blocked-by: ["007-window-module-c1"]
---

## Question

Land C2 on the branch: `in` means units, always; scope folds into the filter
brace as `source:` values (`journal | playground | collection | feed | all`,
defaulting to all). Remove `ParsedFindQuery.scope` / `FindPredicate.scope`;
retire `WQL_SCOPES` into the source vocabulary; unknown `source:` values are
parse errors.

Ship behind the compatibility normalizer: legacy trailing `in <scope>` on
find/rows parses, normalizes into a `source:` filter, flags an advisory —
required because dashboards are user-owned markdown and URLs carry `?q=`.

Spec v2 addition (ticket 003, decision 1): the bare `rows:{…}` → `rows:all`
rewrite rides the same normalizer — one compat pass rewrites ` in <scope>`
and bare rows heads; `WQL_ROWS_TARGETS` gains `all` (no-narrowing
pseudo-target). C4 retires the bare alias at parse; this normalizer keeps
stored documents and `?q=` URLs migrating cleanly until the hard-drop minor.
Engine-side only; UI/page rewires ride the consumption ticket.
