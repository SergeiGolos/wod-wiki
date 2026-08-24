---
state: open
labels: [wayfinder:task]
title: "Window module everywhere (C1)"
blocked-by: ["006-rows-in-grammar-c4"]
---

## Question

Land C1 on the branch: one window concept on every family's AST —
`{kind:'relative', size, unit}` | `{kind:'range', start, end?}`; `last` and
`from/to` mutually exclusive (validated); `FROM_TO_RE` added to the strip
order in `wqlSuffix.ts`; `effectiveTimeWindow` becomes the *only* window
predicate feeding the unified SELECT (window-first hybrid per asset 003).
Anchor stays an execution option. Engine-side only — app-side range-math
deletions ride the consumption ticket.

Includes whatever the TZ rider graduated into this ticket from spec v2
(`workloadRollup.ts` local-date vs QueryService UTC bucketing).
