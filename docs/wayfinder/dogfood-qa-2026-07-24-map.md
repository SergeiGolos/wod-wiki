---
labels: [wayfinder:map]
title: "Dogfood QA fixes (2026-07-24 report) — superseded"
map: "#706"
open_tickets: ["#706 (map)"]
status: "Superseded by #1004 — recommend closing the map"
audited: 2026-09-01
---

# Wayfinder Map — Dogfood QA fixes, 2026-07-24 report (#706)

## Why superseded

- The cited report (`docs/report.md`) no longer exists; the only dogfood report
  on disk is `e2e/dogfood-reports/journal-workflows-report.md`.
- A newer dogfood round (map #1004, 2026-08-30 session) covers the same
  surfaces and has already landed 8 of its 13 fixes.
- Spot-checks of this map's items: debug gating exists (`DebugModeContext`);
  the onboarding/tutorial store exists (`useTutorialStore`); the one clearly
  unfinished item — a user-facing date-language override beyond the UI-language
  default — is adjacent to #1012 (landed) and belongs with #1015's pending
  decisions in the #1004 map.

## Still open

Nothing actionable under this map's original scope.

## Recommendation

Close the map. If the date-language override is still wanted, re-raise it as a
task under #1004 rather than reviving this one.
