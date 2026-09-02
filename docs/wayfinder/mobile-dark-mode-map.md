---
labels: [wayfinder:map]
title: "Mobile & dark-mode support — completion record"
map: "#990"
open_tickets: []
status: "Complete — recommend closing the map"
audited: 2026-09-01
---

# Wayfinder Map — Mobile & dark-mode support (#990)

## Delivered (all child work landed)

- Session outputs on phones: `packages/ui/src/widgets/OutputStatementsTable.tsx`
  renders a Card list below `sm` (`sm:hidden`) and the 9-col table at `sm+`
  (`hidden sm:block`) — landed via #992/#997. `RowsTable` and the Storybook
  LanguageWorkbench inherit it.
- Dark theme everywhere: `@theme inline` token bridge in
  `packages/ui/src/styles.css:149` + pre-paint boot script
  (`apps/playground/index.html`, `data-theme-boot`) setting `.dark` on
  `documentElement` before first paint — landed via #998/#999. Covers
  playground, Storybook, and shared widgets.
- Enforcement: `e2e/gates/journal.dark.smoke`, `journal.mobile.smoke`,
  `e2e/storybook.dark.smoke`, `storybook.mobile.smoke` — matching the map's
  acceptance gate, and actively run (fresh results in `test-results/`).

## Still open

Nothing. Only cosmetic residue: stale analytics stage ids survive as fixtures
in `HomeTour.ambient.test.tsx:195-212` — sweep during any touch of that file.

## Recommendation

Close the map.
