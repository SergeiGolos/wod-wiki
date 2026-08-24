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
Engine-side only; UI/page rewires ride the consumption ticket.
