---
state: open
labels: [wayfinder:task]
title: "Consume the train in the app"
blocked-by: ["010-release-the-language-train"]
---

## Question

Bump this repo to the released packages and land **every app-side delta** the
seven changes owe (they were deferred here because the app builds against
published versions):

1. Version bump to the released `^` versions; build green.
2. C1 app side: delete `HOME_ANALYTICS_WEEKS`/range math in
   `HomeAnalyticsSection.tsx`; `AnalyticsExplorerPage` composer emits
   `last Nw`; `$window` token emits the clause per spec v2's verified
   mechanism.
3. C2 app side: `LibraryPage` source-radio rewire, `EffortsCatalogPage`,
   URL migrations (`useLibraryQueryState`, `useEffortsComposerState`),
   legacy `in <scope>` URLs normalize on read.
4. C5/C6 app side: guard updates, composer mutates ASTs;
   retire `clausesToWql`/`wqlToClauses`/`pivotClauses`/`CLAUSE_META`.
5. Verify: home-analytics numbers unchanged vs today; dashboard fences and
   sample queries render as before.

Note: this ticket sequences after the external V16 store migration lands in
the app only in release order — it does not execute that migration.
