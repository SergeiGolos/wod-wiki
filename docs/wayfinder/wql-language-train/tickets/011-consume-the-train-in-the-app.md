---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Consume the train in the app"
blocked-by: ["010-release-the-language-train"]
---
## Resolution

Landed on metric-store, commits `9832b07c` + `006a5aef`, against the released
packages (`@bitcobblers/*` ^0.10.42, bumped in `233a6552`).

1. **Bump + build green**: app suite 2421/0 (was 2418/2 — the two failures
   were stale `rows:{result:…}` expectations, now asserting the released
   ui@0.10.42 `sessionQueryInsert` output `rows:all{result:…}`); `build:app`
   green (84 route shells).
2. **C1 app side**: `HOME_ANALYTICS_WEEKS` and the `rangeStart`/`rangeEnd`
   math deleted — the six showcase queries carry `last 6w` in text; sample
   fixtures and WidgetFrame labels synced. Equivalence proven by test:
   window-in-text and the old range options produce identical series.
   **Explorer judgment call**: `?weeks=` + `QueryOptions.rangeStart` stay —
   baking `last Nw` into the submitted text breaks `sameQuery` /
   `restoredDraft` / `resultIsCurrent` (all route through `wqlToClauses`,
   which rejects windowed aggregates). Revisit with the AST composer
   (ticket 013).
3. **C2 app side**: explorer `recordsWql` emits modern syntax (source folds
   into the filter brace — `find:note{tags:pr} last 16w`, no `in all`);
   result-header chips derive scope from the `source:` filter and windows
   from `QueryWindow`; library URL test pins legacy `in <scope>` and modern
   `source:` q params restoring to identical clause state. Library/Efforts
   radios keep their clause-model values (`notes`/`efforts`) — the released
   clause model maps them to scope `all` internally; the WQL-surface rewire
   is ticket 013's composer rework.
4. **C5/C6 app side**: `ParsedQueryChips` renders per-family chips via the
   engine type guards (window + join chips added); `serializeQuery`
   delegates to the engine's total serializer (canonical `avg:tis{}`);
   `ParsedQuery` → `AnyParsedQuery` across four files; sample fixtures carry
   `family: 'aggregate'`. No retired-helper usage remains.
5. **Verified**: home-analytics numbers unchanged (equivalence test);
   dashboard fences render as before (parser/model/seeds suites green; the
   legacy `rows:{result:abc-123}` fence fixture still executes via the C2
   normalizer — kept as a compat pin).

Also fixed: `JournalDatePage` used `sessionQueryWql` without importing it —
a latent ReferenceError on the page-level completion path.

Known remaining (pre-existing, not train-caused): the app's strict `IEffort`
vs the engine's loose structural `IEffort` (identical at 0.6.36) — type-level
only, runtime green.

## Question

Bump this repo to the released packages and land **every app-side delta** the
seven changes owe (they were deferred here because the app builds against
published versions):

1. Bump to the language-train release versions; build green.
2. C1 app side: delete `HOME_ANALYTICS_WEEKS`/range math in
   `HomeAnalyticsSection.tsx`; `AnalyticsExplorerPage` composer emits
   `last Nw` text (explorer-state interplay is this ticket's judgment call).
3. C2 app side: `LibraryPage` source-radio rewire, `EffortsCatalogPage`,
   URL migrations (`useLibraryQueryState`, `useEffortsComposerState`),
   legacy `in <scope>` URLs normalize on read.
4. C5 app side: guard updates at dispatch sites; C6 app side: migrate page
   call sites off the retired clause helpers (the export retirement itself
   lands in [Composer on ASTs](013-composer-on-asts-ui-package.md)).
5. Verify: home-analytics numbers unchanged vs today; dashboard fences and
   sample queries render as before.

Store half already delivered (V16 migration live, deps on published
packages since the integration pass) — only the language deltas remain.
