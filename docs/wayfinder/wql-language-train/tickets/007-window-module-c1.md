---
state: open
labels: [wayfinder:task]
title: "Window module everywhere (C1)"
blocked-by: ["006-rows-in-grammar-c4"]
---

## Question

Land C1 on engine main: one window concept on every family's AST —
`{kind:'relative', size, unit}` | `{kind:'range', start, end?}`; `last` and
`from/to` mutually exclusive (validated); `FROM_TO_RE` added to the strip
order in `wqlSuffix.ts`; `effectiveTimeWindow` becomes the *only* window
predicate feeding the unified SELECT (window-first hybrid per asset 003).
Anchor stays an execution option. Engine-side only — app-side range-math
deletions ride the consumption ticket.

Spec v2 rider (ticket 003, decisions 2–3): time-dimension group keys become
local civil ISO dates — `day` → `YYYY-MM-DD` from local components, `week` →
civil Monday `YYYY-MM-DD` by component math (kills the locale-display-string
day key and the DST-unsafe `ts − N×DAY` week label). `dimValue` in
`QueryService.ts`; TZ-alignment test pins civil-ISO keys. The `$window`
dashboard token no longer exists — nothing to wire there.

