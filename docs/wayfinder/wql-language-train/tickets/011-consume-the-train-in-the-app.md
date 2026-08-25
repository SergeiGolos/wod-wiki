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
