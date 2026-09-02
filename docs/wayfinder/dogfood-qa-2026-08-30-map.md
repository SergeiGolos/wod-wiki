---
labels: [wayfinder:map]
title: "Dogfood QA fixes (2026-08-30 session) — remaining open work"
map: "#1004"
open_tickets: ["#1004 (map)", "#1013", "#1015", "#1016", "#1017"]
status: "8 of 13 landed; remaining tail is 1 verification + 2 defects + 1 decision"
audited: 2026-09-01
---

# Wayfinder Map — Dogfood QA fixes, 2026-08-30 session (#1004)

## Already delivered in this wayfinder (closed 2026-09-01)

All eight H-fixes from the session landed in the tree within ~2 days:

- #1005 route normalization (`canvasRoutes.ts` keyed by `normalizePathname`)
- #1006 empty-session guard (`HomeTour.tsx` "Nothing to log" toast)
- #1007 dashboard empty state (`SampleDataPrompt` with both CTAs)
- #1008 read-mode markdown + Edit toggle (`JournalDatePage`, `WorkoutEditorPage`)
- #1009 WQL relative windows anchored to now + git-dated catalogue rows
  (`packages/wql/src/QueryService.ts`, `generate-static-block-index.ts`)
- #1010 live palette filtering (debounced pending-text search)
- #1011 tour ring chip clamp on phones (`TourRing.tsx`)
- #1012 Auto date locale follows UI language (`dateLocale.ts`)

## Still open — what each ticket would change

### #1013 — Verify the dogfood fixes on a deployed build

- No code change. A verification checklist: exercise the eight landed fixes on
  the deployed build. Gates the map's closure — nothing else here is closable
  before this passes.

### #1015 — Decide the Library landing default window (decision)

- Today: `apps/playground/app/hooks/useLibraryQueryState.ts:17` —
  `DEFAULT_LIBRARY_QUERY` is still `'find:note last 2w'`; the calendar
  anchoring from #1009 exists but the landing default was never re-pointed.
- Change if done: Library landing shows the grilling-chosen window instead of a
  blind trailing-2-weeks slice. Alters first-content-seen on the highest-traffic
  surface. Pure decision + one-line change.

### #1016 — Repoint mobile tour stage anchors

- Today: `TourMobileRunway.tsx` drives stages from card visibility
  (IntersectionObserver over the reading zone), but `TourRing` still resolves
  **desktop registry keys** on mobile — rings can target elements that are not
  the ones on screen (the "circling empty space" symptom).
- Change if done: a per-form-factor anchor table so mobile rings point at the
  actually-visible mobile elements. Changes tour correctness on phones only.

### #1017 — Label or filter the mount-emitted segment rows (decision + small code)

- Today: `packages/lang/src/runtime/blocks/WaitingToStartBlock.ts:64` emits on
  mount with label "Ready to Start" — so every never-started session produces a
  zero-duration row in the Workout Log. The label exists; the log side neither
  styles it as a marker nor filters it.
- Change if done: decides between (a) rendering the row as a visual
  session-start marker, or (b) filtering zero-duration mount segments from the
  log. Changes Workout Log semantics for empty sessions.

## Fold-in

Map #706 (2026-07-24 dogfood QA) is superseded by this map; its one possibly
live item (a date-language override beyond #1012's Auto-by-UI-language) should
be re-raised here if wanted.

## Next step

Run #1013; make the #1015 and #1017 calls; bundle #1016 with #1017's log pass.
