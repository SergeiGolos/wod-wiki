# Home Page Redesign — Handoff Spec

*Terminal artifact of [Wayfinder Map: Home Page Redesign](https://github.com/SergeiGolos/wod-wiki/issues/753) — locked 2026-07-28. Source evidence: `docs/wodwiki_teaching.agent.final.md`; fact bases: `docs/research/home-page-audit-2026-07-28.md`, `docs/research/telemetry-seams-2026-07-28.md`; wireframe + section script: `playground/src/tour/prototype/` (commit `a3926771`).*

## 1. The page's job (#756)

A **deliberate split**: an interactive playground hero that acts immediately, plus intent-routing areas that each carry their own one-beat pitch. Marketing exists only as the areas' promises — no standalone marketing layer. One proof section is permitted after the areas but is **not used** (no fabricatable proof pre-launch).

**Success = hero interaction (edit/run/share the demo) or a drop-off click.** Tab close without either is failure. Scroll depth and time-on-page are not goals.

**Section admissibility test:** every section must interact or route.

## 2. Page structure (#757, #758, #765)

Desktop (≥1024px) keeps the **parallax runway with the sticky morphing window** — execution re-scripts the existing `HomeTour` mechanics; it does not rebuild them. Mobile (<1024px, the app's own `MOBILE_BREAKPOINT_PX = 1023`) renders the same sections as a **static card stack**. The tour's bespoke 1060px breakpoint is retired; the governing rule at all three breakpoints (mobile / small desktop / large desktop with 3rd column) is: **nothing goes off-screen.**

Section order (locked) — full element script in `playground/src/tour/prototype/HOME_SCRIPT.md`:

| # | Section | Form | Verdict origin |
|---|---|---|---|
| 1 | **Hero** — headline + live `welcome-1.md` demo in one viewport, Run-in-place, Share | interactive | Editor stage merged into hero (#758) |
| 2 | **Short-circuit strip** — "Know where you're going? Jump to the Library · New note — or keep scrolling." | text-only | Library stage collapsed (#757, #758) |
| 3 | **Learn the Language** — start-line + quest progress + chapter links | static area | quests panel collapsed in (#758) |
| 4 | **What Happens When It Runs** — sticky-window WallClock (desktop) / card (mobile) | tour stage | Timer stage upgraded (#758) |
| 5 | **Explore Your Data** — analytics visual (desktop: ReviewGrid+scorecard fake data; mobile: single stat/sparkline) | tour stage | Analytics stage upgraded (#758, #764) |
| 6 | **The Movement Registry** — discipline/MET teaser | static area (new) | split from Analytics (#757) |
| 7 | **Quick Reference** — docked cheat-sheet block + ⌘/ palette | static area | reference promoted (#757) |

**Per-area promises (locked copy direction):**
- Learn the Language — "From first `wod` line to fluency — Lesson 1 is 3 minutes, runnable in place."
- What Happens When It Runs — "The script becomes the clock."
- Explore Your Data — "Query what you just did."
- The Movement Registry — "Every movement your metrics speak in."
- Quick Reference — "Look it up in seconds."

**Cut:** outro "Jump Right In" CTAs, Library stage rows, Run-a-Ready-Workout as an area (the strip does its job), proof section. **Deleted in execution:** `HomeWelcome` component, old `markdown/canvas/home/README.md` prose (lines 108–197); the README's chapter/quest metadata stays (quest source of truth).

## 3. Drop-offs and funnel events (#759)

One primary drop-off per element; ≤2 secondaries. All events fire on the greenfield telemetry seam (§6).

| Element | Primary drop-off | Lands on | Primary event | Secondaries |
|---|---|---|---|---|
| Hero | Open in editor | `/journal/<today>`, demo note cloned | `home:demo_opened` | Run → `home:demo_run`; edit → `home:demo_edited`; share → `home:demo_shared` (in-place interactions) |
| Strip | Jump to the Library | `/collections` (Start-here shelf, §5) | `home:library_opened` | New note → fresh empty note in `/journal/<today>` · `home:note_created` |
| Learn the Language | Start Lesson 1 | `/guide/syntax/basics` (Core Concepts L1) | `home:lesson_started` | Cheat sheet · `home:cheatsheet_opened` |
| What Happens When It Runs | Read the behaviors explainer | `/guide/behaviors` (§4) | `home:behaviors_opened` | — |
| Explore Your Data | Run a pre-filled query | `/analytics/explorer?query=…` | `home:explorer_opened` | Dashboard · `home:dashboard_viewed` |
| The Movement Registry | Browse the registry | `/efforts` | `home:efforts_opened` | — |
| Quick Reference | Open the cheat sheet | docked cheat-sheet block | `home:reference_opened` | — |

**No home route to `/feeds`.** Standing direction: feeds + collections merge into a unified **Library of predefined resources** (external, markdown-loaded) in a later product change; the journal owns the dated/"today" dimension.

**Chapter links** in Learn the Language mirror the current sidebar order; the learn-difficulty re-order is the curriculum effort's and will fix home + sidebar together.

## 4. New construction: `/guide/behaviors` (#761)

The map's only new content surface — the guide's second pillar beside `/guide/syntax/*`:

| Page | Route | Content |
|---|---|---|
| Overview | `/guide/behaviors` | Script → timeline: what the compiler produces, how the runtime schedules it |
| Timers & Protocols | `/guide/behaviors/timers` | AMRAP = countdown + count rounds; EMOM/Tabata = interval clocks; for-time = countup with cap |
| Rounds & Structure | `/guide/behaviors/rounds` | `21-15-9` = implicit descending rounds; rest blocks; nesting |
| Capture & Feedback | `/guide/behaviors/capture` | Sound cues + `:?` record-actual, `?lb` load prompts, post-workout RPE |

**Demo model (owner):** during the parallax scroll the clock lives in the tour's sticky window; **Run from the scroll experience goes fullscreen and persists as a playground entry + result.** This pressures the G7 fog item — persistence can no longer be "everything is session-local."

Copy note: Variant B's inline example block (`AMRAP 10 → countdown 10:00, count rounds`) is the approved idiom for the behaviors area and explainer.

## 5. Landing-surface specs (dependencies)

**Collections / the Library (#763):** `/collections` gains a pinned **Start-here shelf** above the list — named benchmarks (Fran, Cindy, Annie…) with one-line descriptions and Play. The full list + filters + search serve domain-fluent visitors. **Play keeps clone-to-journal-first** (ownership action, unlike anonymous tour runs). No dated dimension in the Library.

**Analytics empty states (#762):** both `/analytics/explorer` and `/analytics/dashboard` get the same pattern — (1) explain where facts come from (run a workout → segments become facts), (2) one primary action **"Load sample data"** — opt-in, tagged `sample`, shared dataset serving both surfaces, visible banner with **one-click purge** (user facts never touched). Secondary on Explorer: "Run a workout instead" → Library. Wipe-all reset was rejected.

**Learn target repairs (execution scope, from #760):** fix the Custom Metrics prev/next mis-wiring and the Dialects dead-end (G5) — the drop-off can't promise fluency into a broken chain.

## 6. Telemetry seam (#755, #759)

No instrumentation exists today (placeholder gtag loads unconditionally; zero consent handling). Build a standalone **`TelemetryService`**: wrap the `SimpleEventBus<T>` pattern, record to a dedicated telemetry IndexedDB store, expose `record()` + `useTelemetry()`. **Local-always recording; external forwarding (gtag) is consent-gated** — the anonymous funnel stays measurable on-device. Do **not** reuse the workout fact store (schema is workout-metric-specific). The 11 `home:*` events in §3 are the full launch taxonomy; the ~40-event full taxonomy is a later effort.

Implementation sites: `playground/src/tour/HomeTour.tsx` (hero CTAs), `playground/src/tour/TourOutro.tsx` (strip successors), `src/services/telemetry/TelemetryService.ts` (new), `src/services/db/IndexedDBService.ts` (new store), `playground/index.html` (consent-gated gtag).

## 7. Execution checklist (assembled scope)

1. Re-script `HomeTour` per `HOME_SCRIPT.md`: hero merge, Library stage → strip, drop-offs on Timer/Analytics stages, append Learn/Registry/Reference areas.
2. Mobile card stack + breakpoint alignment (retire 1060 → app tiers); off-screen audit at all three triggers.
3. Strip exits: Library routing; new-note → fresh empty note in today's journal.
4. `/guide/behaviors` — 4 pages (overview + 3 families).
5. Collections Start-here shelf.
6. Analytics empty states + tagged sample dataset + purge lifecycle.
7. `TelemetryService` + 11 `home:*` events + consent gating.
8. G5 wiring repairs (Custom Metrics prev/next, Dialects dead-end).
9. Delete `HomeWelcome` + old home README prose.
10. Absorb or delete the wireframe prototype (`playground/src/tour/prototype/`, marked throwaway).

**Frozen surfaces (doctrine from #725):** editor and timer experiences unchanged.

## 8. Fog carried forward (not this effort's)

- Returning-user home state (resume-last, week summary).
- Zero to Hero handoff: Learn's interim target → guided path; chapter order re-sequencing (home + sidebar together).
- Playground-link persistence (G7) — pressured by the demo-model decision: tour runs persist as playground entries + results.
- Full ~40-event instrumentation taxonomy.
- Dashboard-as-note surfacing on home (from #725).
- Feeds + collections → unified Library merge (product direction recorded; execution elsewhere).

## 9. Out of scope (ruled at chart time)

Curriculum build (Zero to Hero, WQL track, Notation Challenge); syntax/guide system rebuild (annotation panel, docked tiered reference, named errors); editor/timer surface changes; analytics instrumentation beyond the home funnel; a separate marketing/SEO landing site.
