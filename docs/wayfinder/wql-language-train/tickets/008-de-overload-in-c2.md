---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "De-overload in with compat (C2)"
blocked-by: ["007-window-module-c1"]
---
## Resolution

Landed on engine main, commits `2462ec9` + `da4c967`.

`in` de-overloaded to mean display units always (aggregates only); scope folds
into the filter brace as `source:` values (`journal | collections | collection | feeds | feed | all`,
or catalog literals `collection:<id>`, `feed:<id>`). `ParsedFindQuery.scope` and
`FindPredicate.scope` removed (clean cutover). `WQL_SCOPES` retired into
`WQL_SOURCE_VALUES`. Unknown `source:` values produce parse errors listing valid
options.

Compatibility normalizer `normalizeWql` rewrites legacy trailing `in <scope>`
on find/rows into `{source:<scope>}` and bare `rows:{…}` heads to `rows:all{…}`,
flagging deprecation advisories on `parsed.advisories`.

`QueryService.runFind` and `runFindBlock` simplified to unified source
filtering via `sourceMatches`, eliminating duplicate inline scope branches.

UI package composer supports both `legacyScope` and modern `source:` filters on
salvage, preserving `where` outer joins; diagnostics strip derives `scope`
summary from `source:` filters.

Review round (spec & standards): restored `where` outer join on find salvage,
supported `source:` in `filterFragmentToClause`, preserved `by`/`rollup` on
legacy rows queries in `normalizeWql` so downstream syntax errors fire loudly,
propagated join advisories to outer queries, corrected error messages, and
calculated `selectedCount` after `applySourceFilter`.

Verification: wql suite 260 pass (bun + vitest), tsc 0, root suite 1182 pass,
full monorepo build clean.

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
