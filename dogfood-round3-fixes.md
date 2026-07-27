# Dogfood Round 3 — Remaining Issues Fix Plan

## Goal
Fix the 8 outstanding issues from the 2026-07-28 dogfood report (R3-C, R3-D, #5, #7, #8, N8, N9, R3-E). All root causes confirmed by code inspection.

## Priority note
N9 is promoted from Low → **first**: duplicates are write-side (persisted in `WorkoutResult.data.logs`) and double-write analytics fact rows, silently corrupting the store R3-B just made visible.

## Tasks

### Wave 1 — data integrity + timezone (independent, parallelizable)
- [x] **N9 — duplicate Tier-2 outputs.** `AnalyticsEngine.run()` live-emits projection outputs per segment; `finalize()` re-emits the identical set at session end; both land in persisted logs (`AnalyticsEngine.ts:46-60`, `OutputEmitter.ts:165-186`). Fix engine-side: cache signature (name+value+unit+type, timestamps ignored) of last live emission in `run()`; `finalize()` returns [] when unchanged. Add read-side dedupe (keep-last by label+value) in `getAnalyticsFromLogs`/`normalizeSummaryFacts` for existing v12 rows. → Verify: engine test live-then-finalize dedupe; complete a workout, log + summary cards show each metric once; explorer sums not doubled.
- [x] **#5 — UTC playground naming.** `src/lib/playgroundDisplay.ts`: `formatPlaygroundTimestampId` (getUTC* getters, :5-18), `formatPlaygroundTimestampLabel` (`timeZone:'UTC'`, :20-36), `timestampFromMatch` (`Date.UTC`, :42-51) → all local time. Single-file fix; all creation/display paths route through these. Update `playgroundDisplay.test.ts:15-35` + `historyAdapter.test.ts:33` (pass today only because test TZ=UTC). → Verify: tests pass with `TZ=Asia/Shanghai bun test`; new playground title matches local journal date.
- [x] **R3-E — stale anatomy panel.** `AnalyticsExplorerPage.tsx`: live-parse draft (`useMemo(() => parseQuery(draft), [draft])` — parser is pure); render `ParsedQueryChips` from live parse unless `result.parsed.raw === draft`; show `PipelineAnatomy` telemetry only post-run ('—' counts otherwise). → Verify: remove a tag filter → anatomy chips update before Run Query; telemetry appears after run.

### Wave 2 — playground lifecycle + collections (independent, parallelizable)
- [x] **N8 — multiplying playgrounds.** `PlaygroundRedirect.tsx:13-33` unconditionally mints a fresh note per `/playground` visit (double under StrictMode). Fix: query `playgroundContent.getPagesByCategory('playground')`, navigate to most-recent if one exists; create only when none (gate on first-run wizard completed — ADR-0010). Zip-load (`useZipProcessor.ts`) keeps minting (share links must not clobber). → Verify: visit `/playground` twice → same page id; fresh profile still gets wizard + first playground.
- [x] **R3-C — collection row click.** Index links (`routeView.ts` deriveNav) carry raw Vite glob id `workout-../../markdown/...`; primary click scrolls to nonexistent anchor + pushes broken `?s=`; navigation buried in icon. Fix: primary click navigates when link has `onRun`/`runIcon:'link'`, in all three surfaces — `CanvasPage.tsx`, `PageNavDropdown.tsx`, `mapIndexToL3` (`pageUtils.ts`). → Verify: click EVENT-01 row in TOC/dropdown/actions menu → workout page opens; no `?s=workout-../..`.
- [x] **R3-D — raw markdown in rows.** `CollectionWorkoutsList.getWorkoutPreview`: strip inline markdown (`**`, links) from preview text; skip `---` delimiter lines (second in-body frontmatter blocks, e.g. ZombieFit). → Verify: collection list shows `Category: Competition` plain; no frontmatter blob rows.

### Wave 3 — shell
- [x] **#7 — stale tab title.** No route-level title management; leaf writers (`EffortDetailPage.tsx:227`, `PlaygroundNotePage.tsx:271`) never reset. Fix: `<DocumentTitleSync>` inside BrowserRouter (`App.tsx:341`), pathname → base title via ROUTE_PATTERNS; exempt `/effort/:slug` + `/playground/:id` (async leaf writers win); unify default brand `Wod.Wiki` (fix `index.html:7`). → Verify: Air Squat → navigate Journal/Collections/Analytics → title follows each page.
- [x] **#8 — onboarding modal a11y.** Markup is actually correct (headlessui role=dialog, real buttons, Esc) — the "invisible" symptom is `useInertOthers` setting aria-hidden+inert on the app root while the body-portaled dialog is open; audits scoped to the app root see nothing. Real gaps: no ✕ close button, DialogPanel not `relative`. Fix: wizard-local ✕ `aria-label="Close dialog"` → onClose(false) (don't touch shared Dialog consumers or gate semantics); add `relative` to DialogPanel. → Verify: a11y audit from `document.body` finds dialog + all controls; ✕/Esc/Skip all dismiss.

### Wave 4 — verification (LAST)
- [x] Full suite: `bun run test:all` + `bun test ./playground/src --preload ./tests/unit-setup.ts`; `tsc --noEmit`.
- [x] Browser smoke on dev server: N9 (one row per metric), #5 (local-date playground title), N8 (resume), R3-C/D (collections), #7 (titles), #8 (wizard), R3-E (live anatomy).

## Done When
- [x] All 8 issues verified fixed in browser; no regressions in test suite.

## Notes
- N9 write-side fix prevents new duplicates only; existing user profiles keep old dupes — acceptable (local-first, disposable fact rows per V10 doctrine; `rederiveResultAnalytics` can regenerate).
- #5 changes id semantics for pre-fix UTC ids — cosmetic re-parse shift only; ids stay unique (ms + provider suffix).
- N8 leaves existing orphan pages in place; a `deletePage`-based prune is available but out of scope.
