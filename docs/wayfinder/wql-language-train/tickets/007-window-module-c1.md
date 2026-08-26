---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "Window module everywhere (C1)"
blocked-by: ["006-rows-in-grammar-c4"]
---

## Resolution

Landed on engine main, commits `7549814` + `499a7d6`.

`QueryWindow` (`{relative, size, unit}` | `{range, start, end?}`) on every
family; `ParsedFindQuery.last`/`ParsedRowsQuery.last` folded in (clean
cutover). `last` strips for all families; new `from <date> [to <date>]`
civil ranges; one window per query — duplicates and `last`+`from` mixes are
C3-style conflicts naming both spans; impossible dates (02-30, 13-01)
reject at parse. `windowRange` is the single window→range mapping
(relative cuts from anchorNow ?? now; ranges local-midnight→end-of-day by
component math). `run`/`runJoined` feed the by-timestamp SELECT from the
parsed window when range options are absent; `effectiveTimeWindow` is the
one predicate. Join halves keep relative `last` only (v2 §1.3); range
windows on join halves are a parse error.

Rider landed: `by {day}/{week}` bucket on the LOCAL CIVIL calendar —
component math only (epoch floors aligned weeks to UTC Thursdays and split
DST days); point instants are local noon of the civil day / civil Monday.
Golden corpora updated: the old goldens encoded epoch-Thursday buckets
(5 points, partial edges); civil weeks give 4 full calendar weeks, values
conserved exactly (34302 = 34302).

Review round (4 findings, all fixed): composer salvage silently dropped
relative windows on aggregates (apply rewrote `sum:tis{} last 6w` to
`sum:tis{}`) — metrics-plane salvage now rejects any window; range
end-of-day `+DAY−1` was off by an hour on DST days; join-half ranges
dropped silently; vitest import restored in QueryService.test.ts (file was
dropped under the vitest runner).

Verification: wql 247/247 under bun **and** vitest, TZ matrix
(UTC/NY/Tokyo/London) green, root suite 1168/1168, all tsc zero, full
build clean. The user-reported golden-corpus failures were the old
epoch-week goldens — updated, not reverted.

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

