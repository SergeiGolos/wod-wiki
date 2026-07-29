# Home Page Audit: Current State vs. `wodwiki_teaching.agent.final.md` Claims

Date: 2026-07-28
Scope: `HEAD` of `SergeiGolos/wod-wiki` (repo context), home page route `/` only.
Research doc under audit: `docs/wodwiki_teaching.agent.final.md` (Chapter 3, Table 3-1, §3.3; Chapter 4.2).

---

## 1. What the home page actually renders at HEAD

The route `/` is handled by `AppContent` → `HomeView` → `HomeTour` (`playground/src/App.tsx:181-184`, `playground/src/views/HomeView.tsx:37-44`).
`HomeView` no longer uses `MarkdownCanvasPage` for `/`; the old `markdown/canvas/home/README.md` is still parsed for its **chapter/quest metadata** but its prose, button sections, and sticky blocks are **not rendered** by the current component. `HomeWelcome` (`playground/src/components/organisms/landing/HomeWelcome.tsx`) is dead code referenced only by the old `MarkdownCanvasPage` `heroSlot` path.

Rendered surface order:

| # | Section / component | File | What it shows | Outbound links / CTAs |
|---|---------------------|------|---------------|------------------------|
| 1 | **Hero** — three-promise headline | `playground/src/tour/TourHero.tsx:17-48` | "Write it in Markdown. Run it as a Timer. Own the Analytics." + subhead + scroll hint | None |
| 2 | **Scroll runway** — scroll-jacked product walkthrough | `playground/src/tour/HomeTour.tsx:519-653` | Sticky 860vh runway; 4 pinned demo stages inside a MacOS-chrome window | None directly; embedded screens have their own actions (see below) |
| 2a | **Stage bar** | `playground/src/tour/HomeTour.tsx:525-548` | 4 progress pips (Editor, Timer, Analytics, Library) | None |
| 2b | **Editor screen** | `playground/src/tour/screens/TourEditorScreen.tsx:26-66` | Live `NoteEditor` seeded with `welcome-1.md` (`HOME_DEMO_SOURCE = 'wods/examples/home/welcome-1.md'` at `HomeTour.tsx:85`) | **Share** button copies a zip-encoded URL to clipboard (`HomeTour.tsx:510-518`); **Run** button starts the WallClock in-place (no route change) |
| 2c | **Timer screen** | `playground/src/tour/screens/TourTimerScreen.tsx:26-65` | Real `RuntimeTimerPanel` + `CastButtonRpc` | **Cast** button (Chromecast, no route); **✕** button exits playground mode and returns to tour scroll (`HomeTour.tsx:449-458`) |
| 2d | **Analytics screen** | `playground/src/tour/screens/TourAnalyticsScreen.tsx:15-40` | `ReviewGrid` + `AnalyticsScorecard` with fake/fast-forwarded session data | None — no link to `/analytics/explorer` or `/analytics/dashboard` |
| 2e | **Library screen** | `playground/src/tour/screens/TourLibraryScreen.tsx:36-142` | Collections list (5 preferred) + Feed items (7 recent) | Each collection row navigates to `/collections/:id` (`TourLibraryScreen.tsx:105`); each feed item navigates to `/feeds/:feedSlug/:feedDate/:feedItem` (`TourLibraryScreen.tsx:67`) |
| 2f | **Captions** | `playground/src/tour/TourCaptions.tsx:35-70` (desktop); `HomeTour.tsx:630-644` (mobile strip) | Stage title + body + footnote | None |
| 2g | **Playground-mode hint pill** | `HomeTour.tsx:655-672` | Floating button to exit the in-place timer/analytics | `exitPlayground` callback only — no route |
| 3 | **Outro — "Jump Right In"** | `playground/src/tour/TourOutro.tsx:23-49` | Three bottom CTAs | `<Link to="/journal">` (Open Journal); `<Link to="/collections">` (Browse Collections); `<button onClick={onNewNote}>` (New Workout Note — clears the demo doc and scrolls to the editor stage, **does not navigate or open a dialog**) |
| 4 | **Outro — "Your quests"** | `playground/src/tour/TourOutro.tsx:51-54` + `playground/src/tour/TourQuests.tsx:64-175` | 7 home-tour quests (auto-completed by scroll/run) + 6 syntax-guide chapters | Home quests are buttons that scroll the runway back to the matching stage (`TourOutro.tsx:17-21`, `HomeTour.tsx:400-418`). Syntax chapters link to `/guide/syntax/basics`, `/guide/syntax/structure`, `/guide/syntax/protocols`, `/guide/syntax/complex`, `/guide/syntax/custom-metrics`, `/guide/syntax/dialects` (`TourQuests.tsx:24-31`). |

Routes **not** linked from the home page: `/analytics/explorer`, `/analytics/dashboard`, `/efforts`, `/effort/:slug`, `/feeds` (feed items are deep-linked, but `/feeds` itself has no CTA), `/journal` is linked, `/collections` is linked.

---

## 2. Claim-by-claim verdict against Chapter 3 / 4.2

| # | Claim in research doc | Source in doc | Verdict | Evidence at HEAD |
|---|----------------------|---------------|---------|------------------|
| C1 | Home page repeats the same three concepts (Write / Timer / Analytics) across **15+ numbered sections** organized as **Pillars, Acts, Features**. | §1.2.3, §3.2.1, §4.1.2, §4.2 Table 4-2 | **STALE** | The rendered page is a single 5-stage scroll tour (overview + 4 demo stages) plus outro. `markdown/canvas/home/README.md` still contains old section headings, but `HomeView` now routes through `HomeTour` and does not render the old markdown sections. The "15+ sections" structure is no longer present. |
| C2 | The three concepts are repeated **three times** (Pillars, Acts, Features). | §1.2.3, §4.1.2 | **CORRECTED** | Each concept appears once in the hero (`TourHero.tsx:17-22`) and once in its matching stage caption (`TourCaptions.tsx:23-44`): Editor (Write), Timer (Run), Analytics (Analyze). A fourth stage covers Collections & Feeds. There is no second or third repetition of the same three concepts. |
| C3 | The home page is a **textbook** that overwhelms users who want to try the app. | §1.2.3, §4.1.2 | **CORRECTED** | The current surface is playground-first: the hero is followed immediately by an editable demo note. The old long prose + button blocks are gone from the render path. |
| C4 | **No routes to Explorer, Dashboard, or Efforts** from the home page. | Table 3-1 (Plan/Efforts, Analyze/Explorer, Analyze/Dashboard rows), §3.3.1 | **CONFIRMED** | No `<Link>` or `navigate()` in `TourHero`, `TourCaptions`, `TourOutro`, or any tour screen points to `/analytics/explorer`, `/analytics/dashboard`, `/efforts`, or `/effort/:slug`. These routes exist only in the sidebar nav (`playground/src/nav/appNavTree.ts:141-170`). |
| C5 | **Collections** is only partially exposed. | Table 3-1 (Collections row) | **PARTIALLY CORRECTED** | The home page now links directly to `/collections` (`TourOutro.tsx:41`) and the library stage rows navigate to individual collection detail pages (`TourLibraryScreen.tsx:105`). What remains partial is the lack of a quest or lesson that explicitly sends a learner to browse a collection as a syntax example. |
| C6 | **Hero uses a playground demo note `welcome-1.md`** and a **"New Workout Note" CTA**. | Table 3-1 (Markdown editor row), §3.2.1, §4.2.1 | **CONFIRMED / CORRECTED** | The demo note is still `welcome-1.md` (resolved from `wods/examples/home/welcome-1.md` to `markdown/canvas/home/welcome-1.md` via `resolveSource`, `HomeTour.tsx:85`). The "New Workout Note" CTA exists but is now a button that clears the demo doc and scrolls to the editor stage (`TourOutro.tsx:48`, `HomeTour.tsx:499-503`) — it does **not** open a new-note dialog or navigate to `/journal` as the old README pipeline did. |
| C7 | Scroll-story has **demo panels 03 / 04** (Analytics, Collections & Feeds) that link nowhere. | §3.2.1, §3.3.1, §4.2.2, §4.2.3 | **PARTIALLY CORRECTED** | Stage 03 (Analytics) still links nowhere. Stage 04 (Library/Collections & Feeds) now links to individual collections and feed items, so it is no longer a dead-end demo. There is still no top-level "Browse Collections" link inside the scroll stage itself — the links are on the rows. |
| C8 | **21 quests** across 7 groups, with the **7-quest "Take the Tour" track** auto-completing on scroll/run. | §3.2.1 | **CONFIRMED** | `markdown/canvas/home/README.md` declares 7 chapters and 7 home quests; `TourQuests.tsx:64-175` renders them with live progress. The `useTourScrollQuests` hook and `useQuickStartAutoComplete` mark scroll/run/edit quests as completed (`HomeTour.tsx:385-397`). |
| C9 | Home page does not route to **Feeds** as a top-level area. | Table 3-1 (Feeds row) | **CONFIRMED** | The library stage shows feed items and deep-links to individual feed items, but no CTA links to `/feeds` itself. The only `/feeds` link is in the sidebar. |
| C10 | **Efforts registry** is invisible from home. | Table 3-1 (Efforts row), §3.3.1, §4.2.5 | **CONFIRMED** | No home component references `/efforts` or `/effort/:slug`. |
| C11 | **Analytics modules** have no teaching surface / no home drop-off. | §3.3.1, §4.2.5 | **CONFIRMED** | The analytics stage is a passive review-grid demo. No link to Explorer, Dashboard, or Efforts; no WQL example; no "Own the Analytics" drill-down. |
| C12 | The old CTA block was **Open Journal / Browse Collections / New Workout Note**. | §3.2.1, §4.2 Table 4-2 | **CONFIRMED** | `TourOutro.tsx:34-48` preserves the same three labels, but "New Workout Note" behavior has changed (see C6). |

---

## 3. Mobile / responsive audit (code-level only)

No dev server or browser was run. Findings are based on Tailwind classes and the explicit `useMediaQuery` breakpoint in `HomeTour`.

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| R1 | High mobile breakpoint | `playground/src/tour/tourStages.ts:166` | `TOUR_MOBILE_BREAKPOINT = 1060` means landscape tablets and wide screens are treated as "mobile". The split layout (canvas 47vh + caption strip below) will activate on iPad landscape and many small laptops. |
| R2 | Fixed-design canvas scaled, not reflowed | `playground/src/tour/HomeTour.tsx:575-596` + `playground/src/tour/tourStages.ts:169-170` | The demo window is hard-coded to `1200 × 720` and scaled with `transform: scale(...)`. On mobile it is fit to viewport width (`window.innerWidth / 1200`), but the **contents are not responsive** — they are a shrunken desktop UI. Text, buttons, and grid cells become tiny and may be unreadable. |
| R3 | Library screen grid does not collapse | `playground/src/tour/screens/TourLibraryScreen.tsx:112` | `grid grid-cols-[1.15fr_1fr]` is used at all widths. Inside the scaled canvas this renders as two very narrow columns with truncated text; on actual mobile no breakpoint switches it to a single column. |
| R4 | Analytics review grid may overflow | `playground/src/tour/screens/TourAnalyticsScreen.tsx:28-40` | `ReviewGrid` and `AnalyticsScorecard` are dropped into the fixed 1200×720 canvas without any mobile-specific sizing. The grid likely assumes desktop widths and may clip or force horizontal scrolling when scaled down. |
| R5 | Hero text sizing is viewport-based but not small-screen optimized | `playground/src/tour/TourHero.tsx:25-28` | `text-[clamp(34px,7vw,88px)]` can still be large on short landscape phones; combined with `min-h-[calc(100vh-104px)]` the hero may push the fold below one viewport. |
| R6 | Runway is 860vh tall | `playground/src/tour/tourStages.ts:163` | The scroll distance is enormous on small screens. With the mobile split layout, the user scrolls 860vh to walk four stages, which may feel like a lot of empty scrolling relative to content. |
| R7 | Caption body font uses vw clamp | `playground/src/tour/TourCaptions.tsx:70` | `text-[clamp(22px,2vw,30px)]` can become very small on narrow screens (≈ 22px) and may not meet touch-target/readability goals if the mobile viewport is small. |
| R8 | Playground hint pill is absolute-bottom | `playground/src/tour/HomeTour.tsx:655-672` | The pill overlays the bottom of the canvas. On the 47vh mobile canvas it may cover controls or the timer stop button. |
| R9 | Outro CTAs are centered and wrap | `playground/src/tour/TourOutro.tsx:34-48` | `flex-wrap` on the CTA row is correct; the `max-w-lg` prose container is responsive. This is the most mobile-healthy section. |
| R10 | Quest cards are single-column and mostly stack | `playground/src/tour/TourQuests.tsx:103-166` | The chapter list uses a single flex column; the chapter headers and progress bars scale reasonably. This is the second most mobile-healthy section. |

Overall: the **hero** and **outro/quest list** are responsive, but the **scroll runway and its four demo screens** rely on CSS scaling of a fixed desktop UI rather than true responsive reflow. The library and analytics stages are the most likely to break visually on small viewports.

---

## 4. Downstream-ticket relevance

### Keep / collapse candidates
- **Keep**: `TourHero` (playground-first headline), `TourEditorScreen` (live demo note), `TourOutro` CTAs, `TourQuests` (progress surface).
- **Collapse**: The 4-stage scroll runway is essentially the old "Pillars + Acts + Features" triplication compressed into one demo strip. The Chapter 4.2 proposal treats this as the "Loop strip" and keeps it, but it should terminate in explicit drill-downs. The analytics stage is the weakest because it has no CTA.
- **Add**: A real "Own the Analytics" area with links to `/analytics/explorer` (pre-filled example query) and `/analytics/dashboard`, plus an `/efforts` entry point, as proposed in Chapter 4.2 Table 4-1 Areas 4 and 2.

### Where the scroll-story / quest panels live
- Scroll-story runway component: `playground/src/tour/HomeTour.tsx` (rendered sections at lines 519-672).
- Stage definitions: `playground/src/tour/tourStages.ts` (lines 83-160).
- Captions copy: `playground/src/tour/TourCaptions.tsx` (lines 23-44).
- Quest/chapter source of truth: `markdown/canvas/home/README.md` (lines 1-103 for chapter/quest declarations).
- Quest renderer: `playground/src/tour/TourQuests.tsx` (lines 64-175).
- Demo panels (screens): `playground/src/tour/screens/TourEditorScreen.tsx`, `TourTimerScreen.tsx`, `TourAnalyticsScreen.tsx`, `TourLibraryScreen.tsx`.
- The old home-page markdown content (`README.md` lines 108-197) is still present but **no longer rendered** by the current `HomeView` path.

---

## 5. Findings

- The home page at HEAD has been rebuilt as a 5-stage scroll tour (`HomeTour`) plus outro; the old 15+ section textbook structure is no longer rendered, though its markdown and quest metadata remain in the repo.
- No home component links to `/analytics/explorer`, `/analytics/dashboard`, `/efforts`, `/effort/:slug`, or `/feeds`; the analytics and efforts gaps from Table 3-1 are still present.
- The live demo note is still `welcome-1.md` (`markdown/canvas/home/welcome-1.md`), but the "New Workout Note" CTA now clears the demo and scrolls to the editor stage instead of opening a new note.
- The Library/Collections stage (04) is improved: it links to individual collections and feed items, while the Analytics stage (03) remains a demo with no drill-down.
- The 21-quest system is preserved; the 7 home-tour quests auto-complete on scroll and demo run.
- The scroll runway is a scaled 1200×720 desktop UI rather than a responsive layout; the Library grid and Analytics review grid are the most likely to break on small viewports.
- The mobile breakpoint is set at 1060px, so tablets in landscape and small laptops will use the 47vh-canvas split layout, which may feel cramped.
- The hero and outro/quest sections are the most responsive surfaces; the demo screens need breakpoint-aware reflow if they are kept as the primary teaching surface.
- The Chapter 4.2 proposal's six-area system (especially Area 4 "Own the Analytics" and Area 2 "Run a Ready Workout") directly addresses the current gaps.
- `HomeWelcome` (`playground/src/components/organisms/landing/HomeWelcome.tsx`) is dead code; it is no longer mounted by the current home path.
