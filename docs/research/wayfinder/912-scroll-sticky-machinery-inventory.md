# Inventory: scroll & sticky machinery for the mobile home runway

> **Wayfinder ticket:** [#912 — Inventory scroll & sticky machinery for the mobile runway](https://github.com/SergeiGolos/wod-wiki/issues/912)
> **Map:** [#911 — Wayfinder map: Mobile home sticky-editor tour](https://github.com/SergeiGolos/wod-wiki/issues/911)
> **Date:** 2026-08-04

What the mobile sticky runway can reuse, adapt, or must leave alone. Each entry: what it does, its DOM/scroll assumptions, and the reuse verdict.

---

## 1. Desktop runway section — `HomeTourInner` (`playground/src/tour/HomeTour.tsx:728-839`)

**What it does.** The desktop-only scroll walkthrough: hero → strip → runway → Learn/Registry/Reference. The runway is `<section ref={runwayRef} style={{height: TOUR_RUNWAY_HEIGHT}}>` (`860vh`, from `tourStages.ts`) containing a `sticky top-[104px] h-[calc(100vh-104px)]` window. Inside the window: a stage bar (stage label + per-stage progress dots), the tour canvas, and the caption column.

**The tour canvas is a fixed 1200×720 design space** (`TOUR_CANVAS_WIDTH`/`TOUR_CANVAS_HEIGHT`) scaled by `transform: scale()` to fit `w-[min(920px,calc(100vw-440px))]` (resize effect at `HomeTour.tsx:637-648`). Inside it: `MacOSChrome` wrapper, the three screens lazy-mounted (`entered` state) and cross-faded (`Screen` wrapper, opacity transition), `TourTvCard` (parallax, fixed 960×540 receiver mirror), and `TourRing` (highlight ring positioned in pre-scale coordinates — all measurements divide by the canvas scale).

**Scroll assumptions.**
- Sticky offset `104px` hardcoded (equals `STICKY_NAV_HEIGHT`, the desktop app header — but the literal is used, not the constant).
- Window height `calc(100vh - 104px)`; runway progress math uses `window.innerHeight` (`useTourScroll.measure`).
- Canvas width formula `calc(100vw - 440px)` presumes the caption column (330px) + gaps fit — desktop widths only.
- `TourRing`/`TourTvCard` live inside the scaled coordinate space; their measurement code divides by scale. Both are decorative desktop machinery.

**Verdict: desktop-only.** The scaled-canvas approach, ring, TV card, stage bar, and side-by-side canvas+captions layout cannot transfer to a phone. **But** the `Screen` cross-fade + lazy-mount pattern and the stage-bar *concept* are cheap to re-express for mobile.

## 2. Stage machine — `tourStages.ts`

**What it does.** Pure contract: `TourScreen` (`editor | timer | analytics`), 7 `TOUR_STAGES` with progress ranges — `editor-blank` [0, .15), `editor-metrics` [.15, .30), `editor-run` [.30, .45), `timer-wallclock` [.45, .60), `timer-next` [.60, .72), `analytics-scorecard` [.72, .86), `analytics-grid` [.86, 1.0]. `resolveStage(progress)` → `{index, stage, t, ring}`; clamps; unit-tested. Also `TOUR_RUNWAY_HEIGHT = '860vh'`, `TOUR_CANVAS_WIDTH/HEIGHT`.

**Assumptions.** None — pure functions and constants. Ring targets (`ringA`/`ringB`) are desktop decoration but ride along harmlessly.

**Verdict: reuse as-is.** The mobile runway should resolve against the same 7 stages so stage ids (and quest mapping) stay identical across form factors. Runway *height* for mobile is a separate number (860vh is a desktop pacing choice — the prototype ticket should size mobile pacing).

## 3. Scroll driver — `useTourScroll` (`playground/src/tour/useTourScroll.ts`)

**What it does.** Tracks runway progress and resolves the stage machine. Progress = `-rect.top / (runway.height − viewport.height)`, clamped 0..1; `runwayReached = rect.top <= 0`. Two consumption channels: (a) `slice` React state — updates only on discrete stage/ring change; (b) `subscribe(cb)` — imperative per-frame callbacks for scrubbed visuals (transform/opacity DOM mutations via refs, no re-render per frame). `interactive` flag freezes scroll sync (playground mode). `resync()` re-measures.

**Scroll assumptions.**
- **Capture-phase `window` scroll listener** (`{passive: true, capture: true}`) — deliberately catches the app shell's container-div scroller (the app scrolls a container, not `window`). Also listens to `resize`. rAF-throttled.
- Geometry via `getBoundingClientRect()` + `window.innerHeight` — no fixed offsets baked in.

**Verdict: reuse as-is.** Nothing desktop-specific. The docstring already lists "mobile pan" among intended subscriber uses — the mobile runway was anticipated here and never built. Pass the mobile runway element's ref; stage resolution and `runwayReached` come for free.

## 4. Canvas `scroll` DSL siblings — `scrollRunway.ts`, `useScrollRunway.ts`, `useScrollTypewriter.ts`, `useScrollQuests.ts` (`playground/src/canvas/`)

**What they do.** A near-copy of the tour's driver pair for markdown ` ```scroll ` DSL pages (rendered by `ScrollCanvasPage` when a page's frontmatter sets `scroll:`): `resolveScrollStage` (pure, clamps declared ranges), `useScrollRunway` (same two-channel contract, stages parsed from markdown), `useScrollTypewriter` (per-stage scroll-scrubbed typewriter with user-divergence guard), `useScrollQuests` (stage→quest map from parsed stages).

**Relevance to home: none directly.** The home page is not a ` ```scroll ` page — `App.tsx` renders route `/` via `HomeView` before the `page.scroll` branch is even consulted. These files are pattern evidence that the repo already maintains *two* parallel runway drivers (tour constants vs parsed stages).

**Verdict: don't touch; pattern reference only.** A third driver is not justified — the mobile runway wants the *tour* stage machine, so `useTourScroll` is the right driver. If the architecture ticket reaches for "shared primitive" (option c), this duplication is the cautionary tale: the siblings diverged deliberately to keep the home page untouched.

## 5. Scroll quests — `useTourScrollQuests` (`playground/src/hooks/useTourScrollQuests.ts`)

**What it does.** Pure callback factory: `markStageViewed(stageId)` maps stage id → quest id via `TOUR_STAGE_QUEST_IDS` and marks it complete in the page quest ledger (monotonic). Interaction-gated validations (`workout-complete`, `run-started`) are excluded — scroll alone never completes them.

**Quest map today:** `editor`, `timer`, `timer-wallclock`, `timer-next`, `analytics`, `analytics-scorecard`, `analytics-grid`, `library` → `qs-tour-*`.

**⚠️ Gotcha: `editor-blank`, `editor-metrics`, `editor-run` are NOT keys in the map.** On desktop, `markStageViewed(slice.stage.id)` receives exactly those ids during the editor stages — so `qs-tour-editor` is never fired by runway scrolling today (only the generic `editor` id is mapped, and no stage uses it). Whatever the mobile runway does, this mapping gap decides whether its editor stages fire `qs-tour-editor`. **Decision needed** (handed to the stage-mapping ticket #915).

**Verdict: reuse as-is** — same callback, fired from the mobile runway's `slice` changes (the locked destination already requires `qs-tour-*` to fire on mobile). No DOM coupling whatsoever.

## 6. The syntax-guides sticky pattern — `MarkdownCanvasPage` + `CanvasProsePanel` + `CanvasEditorPanel`

The reference behavior the mobile home must match. Syntax guide pages = `markdown/canvas/syntax/*.md` (`template: canvas`, no `scroll:`) → `MarkdownCanvasPage`.

**What it does.**
- **Desktop:** `CanvasProsePanel` renders an `lg:flex` row; `CanvasEditorPanel variant="desktop"` is the sticky side column — `self-start sticky hidden lg:flex`, `top: STICKY_NAV_HEIGHT (104px)`, `height: calc(100vh − 104px)`, inner chrome capped at `max-h-[72vh] min-h-[400px]`.
- **Mobile (<1024px):** `CanvasEditorPanel variant="mobile"` rendered **in-flow before the prose sections**: `lg:hidden sticky z-20 shrink-0`, `top: MOBILE_STICKY_TOP (65px)`, `height: calc(50vh − 32.5px)`. Prose scrolls beneath in the remaining ~half viewport. This is exactly the "sticky editor window with text below it" the user sees on `/guide/syntax`.
- **Spy adaptation:** `MarkdownCanvasPage` detects the mobile panel via `document.querySelector('.lg\\:hidden.sticky')` and shifts its IntersectionObserver rootMargin / scroll offsets (`viewportHeight/2 + MOBILE_STICKY_TOP/2`) so active-section tracking works below the half-viewport panel.

**Constants (`canvasUtils.ts`):** `STICKY_NAV_HEIGHT = 104`, `MOBILE_STICKY_TOP = 65`, `MOBILE_BREAKPOINT_PX = 1023` — the same breakpoint as `useIsMobile` (Tailwind `lg`). One width band rules both surfaces; no tablet gap.

**Verdict: adapt the geometry, not the component.** The mobile pattern to replicate is: *in-flow panel + `lg:hidden sticky z-20`, top 65px, ~50vh height, scrolling content beneath*. `CanvasEditorPanel` itself is coupled to canvas-page chrome (source pickers, pipeline steps, run state) — the home tour's pinned window holds tour screens instead, so it wants its own shell with the same sticky contract. (`MarkdownCanvasPage`'s `editorAppearsAtSectionId === 'learn'` special-case for route `/` is legacy — `/` renders `HomeView`, never `MarkdownCanvasPage`.)

## 7. Tour screens — `playground/src/tour/screens/`

- **`TourEditorScreen`** — wraps a real `NoteEditor` (live CodeMirror: edit, Run, Share, open-in-journal) + optional ring-target registration (`withRingTargets`). Size-agnostic; fills its container.
- **`TourTimerScreen`** — wraps `RuntimeTimerPanel` with a real runtime: `autoStart`, `externalPause` (scroll-out stop #885 — halts without resetting so analytics keep data), header Reset (#885), `onComplete` → analytics. The Next-button ring target is registered asynchronously.
- **`TourAnalyticsScreen`** — `AnalyticsScorecard` + `ReviewGrid` over the session's segments.

**Assumptions.** All three are `flex h-full` container-fillers — no fixed pixel sizes. Their desktop context is the 1200×720 scaled canvas (editor screen measurements divide by canvas scale only when ring targets are on), but nothing prevents rendering them in a plain mobile-height container.

**Verdict: reuse as-is inside the pinned mobile window.** Density/typography at ~50vh mobile height is unverified — that's the prototype ticket's job. Preserve the scroll-coupled timer semantics (`autoStart` on timer-stage entry, `externalPause` on scroll-out) — they are what makes the runway feel alive, and they work off stage changes, not desktop DOM.

## 8. Current mobile home — `TourMobileStack` (`playground/src/tour/TourMobileStack.tsx`)

**What it does.** Flat vertical stack (the thing being replaced): `TourHero` (full-viewport headline + live editor) → `TourShortCircuitStrip` → **4 of the 7** caption cards (`editor-blank`, `editor-metrics`, `timer-wallclock`, `analytics-scorecard`, rendered as bordered `mx-6` cards via `CaptionBody`) → Learn/Registry/Reference/telemetry footer. No scroll driver, no stage resolution, no quest firing, no timer/analytics screens — the hero editor scrolls away and only text cards remain (the reported bug).

**Also of note:** the 3 omitted captions (`editor-run`, `timer-next`, `analytics-grid`) are invisible on mobile today. **Decision needed:** does the mobile runway scroll the current 4 cards or all 7? (Handed to the stage-mapping ticket #915.)

**Verdict: rework in place** (or replace — architecture ticket #913). Its pieces survive: `TourHero`'s live editor becomes the pinned editor stage; `CaptionBody` cards become the scrolling content; strip keeps its natural-flow position per the locked destination.

## 9. Breakpoints & offsets (single source of truth)

| Constant | Value | Meaning |
|---|---|---|
| `MOBILE_BREAKPOINT_PX` | 1023 | `useIsMobile` (`max-width`) and Tailwind `lg` boundary; canvas pages check `< 1024` |
| `STICKY_NAV_HEIGHT` | 104 | desktop app header; desktop sticky panels/runway top offset |
| `MOBILE_STICKY_TOP` | 65 | mobile app header; mobile sticky panel top offset |
| `TOUR_RUNWAY_HEIGHT` | `860vh` | desktop runway scroll pacing (mobile pacing TBD by prototype) |

---

## Reuse recommendation table

| Machinery | Location | Verdict |
|---|---|---|
| `useTourScroll` scroll driver | `tour/useTourScroll.ts` | **Reuse as-is** — mobile runway driver (mobile-agnostic by design) |
| Stage machine (`TOUR_STAGES`, `resolveStage`) | `tour/tourStages.ts` | **Reuse as-is** — same 7 stages keep quest ids aligned; mobile runway height is a new number |
| `Screen` cross-fade + lazy-mount | `HomeTour.tsx` | **Adapt** — re-express for the mobile pinned window |
| Scaled 1200×720 canvas, `TourRing`, `TourTvCard`, stage bar dots | `HomeTour.tsx`, `TourRing.tsx`, `TourTvCard.tsx` | **Desktop-only** |
| `useTourScrollQuests` | `hooks/useTourScrollQuests.ts` | **Reuse as-is**; ⚠️ `editor-*` stage ids unmapped — decision via #915 |
| `scrollRunway` / `useScrollRunway` / `useScrollTypewriter` / `useScrollQuests` | `canvas/` | **Not needed** — ` ```scroll ` DSL pages only; duplication cautionary tale |
| Mobile sticky panel geometry (`lg:hidden sticky z-20`, top 65, ~50vh) | `CanvasEditorPanel` mobile variant | **Adapt the pattern/geometry**; component itself is canvas-page coupled |
| Spy rootMargin adaptation | `MarkdownCanvasPage.tsx` | **Reference only** — home has no scroll-spy nav |
| `TourEditorScreen` / `TourTimerScreen` / `TourAnalyticsScreen` | `tour/screens/` | **Reuse as-is** in the pinned window; density check in prototype; keep `autoStart`/`externalPause` semantics |
| `TOUR_CAPTIONS` data + `CaptionBody` | `tour/TourCaptions.tsx` | **Reuse** — cards become the scrolling content; desktop cross-fade column stays desktop-only |
| `TourMobileStack` | `tour/TourMobileStack.tsx` | **Rework** into the sticky runway container (architecture ticket #913) |

## Corrections & surprises for the map

1. **No typewriter on the home runway.** `useScrollTypewriter` belongs to ` ```scroll ` canvas pages only. Home's scrubbed effects are caption cross-fade, screen swaps, TV-card parallax, and the stop-toast — the "caption animation parity" fog should be phrased in those terms.
2. **"Mobile pan" was already anticipated** in `useTourScroll`/`TourCaptions` docstrings and never built — the mobile runway is a known gap, not a new direction.
3. **`qs-tour-editor` never fires from desktop runway scrolling either** (editor stage ids missing from `TOUR_STAGE_QUEST_IDS`). Mobile parity and fixing the gap are different choices — #915 decides.
4. **One breakpoint rules both surfaces** (1023px): whatever layout owns `≤1023px` on home also owns it on the guides — no tablet gap to design around, but the architecture ticket must name the owner explicitly.
