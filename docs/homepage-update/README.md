  # Homepage Update — POC v5 Scroll-Walkthrough Review

**Source POC:** `poc/Kimi_Agent_Wod Wiki Scroll Demo (1)/app/index.html` (v5; `wodwiki-walkthrough/index.html` is a byte-identical copy)
**Compared against:** the live home route (`/`) implemented by `playground/src/views/HomeView.tsx` + `markdown/canvas/home/README.md`
**Date:** 2026-07-25

---

## 1. Executive Summary

The POC replaces the home page's **functional, markdown-driven canvas** with a **marketing-style scroll-jacked walkthrough**: a 100vh hero, then an ~860vh pinned section where a mock app window stays on screen while scroll drives it through five stages — Overview → Editor → Timer → Analytics → Collections & Feeds — with a gliding highlight ring, scrubbed micro-animations, and per-stage captions.

The interaction pattern is strong and worth adopting. The POC's weakness, as flagged, is that its "app window" is **hand-fabricated HTML that imitates — and in places invents — WOD Wiki screens**. The current home page's value is that it is *the actual product*: a live editor, a real runtime, a working challenge system. The update should keep every piece of real functionality and adopt only the POC's *scroll-choreography layer*.

---

## 2. Current Home Page — Functional Inventory

Route `/` resolves through `canvasRoutes` → `markdown/canvas/home/README.md`, rendered by `HomeView` → `MarkdownCanvasPage` with `HomeWelcome` injected as `heroSlot`.

### 2.1 Real, working functionality on today's home page

| # | Feature | Implementation | Status |
|---|---------|----------------|--------|
| 1 | **Live embedded editor/runtime** | ```` ```view home-demo ```` block in `home/README.md` (state `note`, in-memory runtime, `align: right; width: 50%`) renders a real editable wod note beside the prose | Working product surface |
| 2 | **Panel actions** | `HomeView.panelHeaderActions`: Edit / Track / Results segmented group, Reset, **Run** (starts the real runtime), **Share** (`encodeZip` → `?z=` URL to clipboard), Fullscreen | Wired to `PanelActions` ref |
| 3 | **HomeWelcome onboarding** | `playground/src/components/organisms/landing/HomeWelcome.tsx` — Step 01 Write (5 inline syntax reference items linking to docs), Step 02 Run (**Run Workout** → real `panelActions.run()`, **View Results** → real results view), plus "Find Content" search-palette hook (`onOpenHomePalette` → inject selected content into the editor) | Real buttons driving the real panel |
| 4 | **Challenge / quest system** | ```` ```chapter ```` (6 chapters: Basics, Structure, Protocols, Complex, Custom Metrics, Dialects) and ```` ```quest ```` blocks (`qs-arrive`, `qs-edit`, `qs-run` with `validation: workout-complete`) + `{{challenge:...}}` tokens; surfaced as the header badge (`ChallengeHeaderBadge`, "1/3 · STEP 1/5") and `OnboardingBanner` | Gamified tutorial, persists progress |
| 5 | **Sticky scroll sections** | `# WOD Wiki {sticky dark full-bleed}`, `## Learn the Syntax {sticky #learn theme:emerald}`, `## What's Next {sticky full-bleed dark}` — today's scroll storytelling primitive | Static sticky, no scrub |
| 6 | **Action pipeline buttons** | ```` ```button ```` blocks: Open Journal (`navigate:/journal`), Browse Collections, New Workout Note (`set-source:query:new` + `launch:dialog`), Try the Demo (`set-source` welcome-1.md), Zero to Hero and 6 syntax-guide links | All functional |
| 7 | **HeroCarousel** | `{{hero-carousel}}` token (`HeroCarousel.tsx`) — scroll-snap image strip with real product screenshots (editor, timer, cast, analytics, review) | Exists in the prose pipeline |
| 8 | **App shell** | Sidebar (Home, Journal, Feeds, Collections, Efforts + 8 Syntax doc entries), header with Search palette, `CastButtonRpc` (real Chromecast + local-tab cast), theme tokens from `src/index.css` | The page is inside the app, not a landing site |

### 2.2 Today's tutorial model

The current page teaches by **doing**: quests ("Change the workout", "Run it to the finish") that validate against the live editor, prose that scrolls past a persistent live panel, and doc links. Scroll is linear prose; there is no staged narration of the *other* surfaces (timer, journal/analytics, collections) — the user must leave home to discover them.

---

## 3. POC v5 — What It Proposes

### 3.1 Structure

1. **Fixed marketing header** — brand, nav anchors (Editor / Timer / Analytics / Collections), "Open Playground" CTA. *This sits outside the app shell: no sidebar, no search, no real cast button.*
2. **Hero (100vh)** — four stacked headline rows: *Write it in Markdown / Run it as a Timer / Own the Analytics / **Or pull a Collection*** (the 4th row is new vs. today's 3-row headline), sub-copy identical in spirit to the current `home/README.md` lede, "↓ Scroll — the app, part by part" hint.
3. **The walkthrough (`#tour`, height 860vh)** — a sticky stage containing:
   - A **mock app window** (browser chrome, sidebar with the real nav labels, four swappable "screens").
   - A **highlight ring** that glides between regions per stage, with an accent-colored tag (```` ```wod ````, WallClock, Chromecast, Logged, Collections, Feeds).
   - A **captions column** (5 captions: "The Loop" overview + 01–04) that cross-fades with the stage.
   - A **segment progress bar** (4 segments, accent-colored when live).
4. **Outro + footer** — "Stop app-switching. Start the clock." CTA to the real playground.

### 3.2 Scroll-scrubbed beats (the actual innovation)

| Stage | Scroll-scrubbed animation |
|-------|---------------------------|
| 01 Editor | Typewriter writes a real wod script `(3 Rounds) / 10 Pushups / 15 Air Squats / 10 KB Swings 24kg / *:30 Rest` as you scroll; ring hugs the code block |
| 02 Timer | Mock WallClock digits **tick live**; mid-stage the ring glides to the cast button and a Chromecast TV card parallaxes up beside the window |
| 03 Analytics | "Stopped at 9:27 — writing results to Journal…" toast, then bar chart grows bar-by-bar |
| 04 Library | Collection rows and feed rows stagger in; ring splits Collections → Feeds |

Plus an **interactive playground mode**: clicking Run inside the mock suspends the scroll choreography and lets the visitor drive the fake timer (pause/next/stop → analytics), with an exit affordance back to the tour. Mobile gets a pinned-top mock + bottom caption strip with pan-to-ring; `prefers-reduced-motion` gets static cards.

### 3.3 Correctly grounded details (worth keeping)

- **Palette is the real theme.** Every accent maps to `src/index.css` light tokens: editor `#A05858` = `--metric-resistance`, timer `#508860` = `--metric-effort`, analytics `#7C62A0` = `--metric-rounds`, library `#A87040` = `--metric-rep`, app chrome `#5980A8` = `--primary`/`--metric-time`, surfaces = `--background`/`--card`/`--border` family. *(design-notes.md's neon-orange/violet palette was superseded in v5.)*
- **Collection names are real:** Crossfit Games 2024, Crossfit Girls, Dan John, Geoff Neupert, Girevoy Sport all exist under `markdown/collections/`, and the feed names match `markdown/feeds/` (Crossfit Programming, Dan John 40 Day).
- **Cast is real:** `CastButtonRpc` + the Chromecast receiver stack exist; the TV-card beat dramatizes a genuine feature.
- **Syntax samples are real** whiteboard-script.

---

## 4. Diff — Current Home vs. POC Proposal

| Aspect | Current home | POC v5 | Assessment |
|--------|--------------|--------|------------|
| Frame | Inside app shell (sidebar, search, cast, theme) | Standalone marketing page, "Open Playground" CTA | **Keep current.** The product *is* the playground; a shell-less landing page adds a hop. |
| Hero | HomeWelcome steps with **working** Run/Results buttons + live editor panel beside it | 4-row typographic hero + scroll hint, no controls | Adopt the 4th headline row (Collections) and the "scroll — the app, part by part" framing; keep the working buttons. |
| Tutorial model | Do-it-yourself quests + prose, single live surface | Narrated tour of **all four surfaces** via scroll scrub | **Adopt.** This is the gap the POC fills: timer, analytics, and collections are invisible from today's home until you navigate away. |
| Editor stage | Real editable note with real Run | Fabricated typewriter mock + fake "COMPILES TO / EST. DURATION / LOADED" chips | Keep the real editor; use the typewriter/ring only as overlay choreography. |
| Timer stage | Reachable via Track/Run (real `RuntimeTimerPanel`) | Mock timer — close to the real WallClock layout (rail, digits, STOP/PAUSE/NEXT, cast top-right) but hand-drawn | POC layout is a faithful miniature; still, real panel or real screenshot beats imitation. |
| Analytics stage | Journal / Efforts / ReviewPage | **Mostly invented:** streak counter, consistency heatmap calendar, "7-day avg ↑18%" custom-metric trends, PR-flagged session log | Not a real screen. Real Review/analytics surfaces must be shown instead (or built — see §5). |
| Collections/Feeds stage | `/collections`, `/feeds` pages | Mock list; names real, layout simplified, "60+ bundled" claim | Roughly right; verify the "60+" count (21 named collections + ~100 ZombieFit monthly archives exist, so the claim is defensible but should say what we actually ship). |
| Cast beat | Real `CastButtonRpc` in header | TV parallax card, dramatized | Great storytelling for a real feature; keep as illustration. |
| Onboarding/challenges | Chapter/quest system with header badge + validation | **Dropped entirely** | **Must be preserved.** The scroll tour and the quests are complementary: tour = see it, quests = do it. |
| Syntax docs / search / share / zip / carousel | All present | All absent | Must be preserved. |
| Accessibility | Standard scroll | Scroll-jacking (860vh) — mitigated by reduced-motion card fallback + mobile split | Adopt both fallbacks verbatim; they are well thought out. |

---

## 5. Made-Up Screens in the POC (per the brief — flagged for replacement)

These elements do **not** correspond to shipped UI and must not survive into the real page:

1. **Analytics dashboard** — stat row ("Streak 12d"), calendar consistency heatmap, custom-metric trend rows, PR flags in the session log. The real equivalents are the Journal day view, Efforts catalog, and the post-run **Review** panel (`FullscreenReview` / `ReviewPage`). Use those.
2. **Editor metric chips** — "COMPILES TO 5 blocks · EST. DURATION ~9:30 · LOADED 24 kg" is invented UI (plausible — the parser has this data — but not a shipped component).
3. **Timer "Capturing" rail card** (REPS 58 · PACE 1:52 · VOL 480kg) — the real `RuntimeTimerPanel` rail shows Session and Up Next; live metric capture is real (output statements) but this exact rail card isn't.
4. **Mock sidebar/breadcrumb** — "Home / Notes / morning-strength.md" is not a real route; the mock sidebar omits the Syntax docs group and header actions.
5. **"Playground mode" interactivity** — the clickable fake timer is demo-only; in production the equivalent is simply the real Run button on the real panel.

Note the nuance: none of these are *implausible* — the POC invented sensible UI. The risk is only that the homepage would promise surfaces the app doesn't have.

---

## 6. Recommendation — Adopt the Choreography, Keep the Product

**Principle:** the walkthrough is a *presentation layer* over surfaces that already exist. Implement it as a scroll-driven tour **inside the existing canvas/app shell**, not as a separate landing page.

1. **Keep the frame.** Home stays at `/` in the app shell with sidebar, search palette, cast, and the challenge badge. No standalone marketing page, no "Open Playground" CTA — you're already in it.
2. **Adopt the staged scroll narrative.** Add a walkthrough section (either as a new sticky section type in the canvas markdown pipeline, or as a `HomeView` region) with the POC's five stages, segment progress bar, gliding highlight ring, and captions — using the POC's token-accurate accent mapping.
3. **Stage 01 (Editor) stays live.** Reuse the existing `home-demo` view block and HomeWelcome actions; apply the ring/caption choreography *around the real panel*. The typewriter can drive the real editor's content via the existing `set-source` pipeline rather than fake DOM.
4. **Stages 02–04 use real UI.** Either embed scaled-down real components (`RuntimeTimerPanel` against an in-memory runtime — the infrastructure already exists for the home demo), or use annotated real screenshots in the established `HeroCarousel` style. Never ship the fabricated analytics dashboard.
5. **Preserve and integrate the quest system.** Map tour stages to quests: reaching the Timer stage + pressing the real Run completes `qs-run`, etc. Tour = narrated seeing; quests = doing.
6. **Keep the fallbacks.** Reduced-motion static cards and the mobile pinned-mock/bottom-captions split should be carried over as designed; the 860vh scroll-jack must never be the only path.
7. **Hero update.** Add the 4th headline row ("Or pull a Collection") and the scroll hint; keep the working Run/Results/Find-Content controls from HomeWelcome.

### Open questions for implementation
- Walkthrough as a markdown canvas primitive (new `{walkthrough}` section modifier) vs. a React-only `HomeView` region — the former keeps home content-driven, the latter is simpler to choreograph.
- Live embedded panels (real `RuntimeTimerPanel` on stage 02) vs. screenshot fidelity — live is heavier but immune to UI drift; screenshots match the existing `HeroCarousel` precedent.
- Where the tour sits relative to the existing "Learn the Syntax" sticky section — likely replaces it as the scroll centerpiece, with syntax links moving into the tour's Editor caption.

---

## 8. Implementation Status (2026-07-25)

**Shipped.** The walkthrough is now the homepage, built per §6's recommendation
("adopt the choreography, keep the product"):

- `playground/src/tour/` — `HomeTour` (composition), `tourStages` (stage machine),
  `useTourScroll` (rAF-throttled driver, capture-phase listener for the shell's
  inner scroll container), `TourRing` (registry + gliding ring, measures real DOM
  targets — no hardcoded rects), `useTypewriter`, `TourHero`, `TourCaptions`,
  `TourTvCard`, `TourOutro`, `TourStaticCards` (reduced-motion fallback).
- `playground/src/tour/screens/` — real components per stage: `NoteEditor`
  (typewriter-scrubbed), `RuntimeTimerPanel` + `CastButtonRpc`,
  `AnalyticsScorecard` + `ReviewGrid`, `getScriptCollections()` rows + `FeedFeed`.
- Route wiring: `App.tsx` renders `HomeView` for canvas route `/` (the old
  `MarkdownCanvasPage` path is retained for all other canvas routes).
- Preserved: quick-start quests (qs-arrive/qs-edit/qs-run via the tour's hooks),
  OnboardingBanner, zip share, Journal/Collections/New-Note actions, syntax-guide links.
- Scroll-mode analytics: rep-based blocks only advance on Next, so entering the
  analytics stage fast-forwards the real runtime (`runtime.do(new NextAction())`
  until stack empty); the panel's completion path then lands real session results.
- Playground mode: Run freezes scroll sync and hands the window to the visitor;
  Stop → real review (the panel's onClose is a no-op so Stop no longer exits);
  ✕ / hint pill returns to scroll sync.
- Verified: `build:app`, 8/8 smoke (`playwright.smoke.config.ts` against the prod
  build), rewritten home acceptance e2e, playground unit tests (3 pre-existing
  failures unchanged), desktop/mobile/reduced-motion/dark-theme browser passes.


## 9. Reference Map

| Item | Path |
|------|------|
| Tour implementation | `playground/src/tour/` |
| Tour screens | `playground/src/tour/screens/` |
| POC v5 (reviewed) | `poc/Kimi_Agent_Wod Wiki Scroll Demo (1)/app/index.html` |
| POC design notes / plan | same dir: `design-notes.md`, `plan.md` |
| Real app screenshots (POC research) | same dir: `research/wodwiki-*.png` |
| Current home route | `markdown/canvas/home/README.md` |
| Home view | `playground/src/views/HomeView.tsx` |
| Onboarding hero copy | `playground/src/components/organisms/landing/HomeWelcome.tsx` |
| Existing screenshot carousel | `playground/src/components/organisms/landing/HeroCarousel.tsx` |
| Canvas markdown pipeline | `playground/src/canvas/canvasRoutes.ts`, `parseCanvasMarkdown.ts` |
| Theme tokens (POC palette source) | `src/index.css` (`--metric-*`, `--primary`, surfaces) |
| Real cast stack | `playground/src/components/organisms/cast/CastButtonRpc.tsx`, `playground/src/receiver-rpc.tsx` |
| Real content | `markdown/collections/`, `markdown/feeds/`, `markdown/efforts/` |
