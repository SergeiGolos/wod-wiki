# Home Redraw Implementation Plan

**Wayfinder Map:** [#911 - Mobile home sticky-editor tour rework](https://github.com/SergeiGolos/wod-wiki/issues/911)  
**Ticket:** [#921 - Home redraw implementation plan](https://github.com/SergeiGolos/wod-wiki/issues/921)

---

## 1. Overview & Architecture

The redrawn home page converts the home landing page (`playground/src/tour/HomeTour.tsx` / `HomeView.tsx`) into a sequence of self-contained scroll experiences on both mobile (top-sticky window at 65px) and desktop (side-sticky window at 360px).

### Section Sequence

1. **`GreetingHero` (`TourHero.tsx`)**
   - Standalone non-sticky hero section at page top.
   - Renders live `welcome-1.md` editor (or `/load?z=` arrival content).
   - Hero `Run` button opens fullscreen playground without scrolling.
   - Preserves arrival-reset contract (#882) on re-entering hero viewport.

2. **`TourSection`**
   - Uses shared `ScrollSection` primitive.
   - **Mobile**: Own pinned window (top 65px, ~50vh, chrome bar) displaying runway demo (editor/timer/analytics); `HighlightRing` restored at scale 1; full-width caption cards scroll below in tall slots.
   - **Desktop**: Side-sticky window (`w-[360px]`) + caption cards right.
   - Releases sticky window after last caption card.

3. **`CelebrationBridge` (`playground/src/tour/CelebrationBridge.tsx`)**
   - Static non-sticky bridge section between Tour and Chapter 1.
   - **Headline**: *"You've seen how it works. Now learn the language."*
   - **Hype paragraph**: One-paragraph hype covering the six syntax chapters (basics, protocols, structure, custom metrics, dialects, complex), ending *"Keep scrolling to start."*
   - **Celebrated state**: `home-tour` progress badge that flips to green-check *"Take the Tour — complete ✓"* when `home-tour` quests are done.

4. **`ChapterHeroSection` (6 instances: Basics, Protocols, Structure, Custom Metrics, Dialects, Complex)**
   - Uses shared `ScrollSection` primitive.
   - **Sticky view**: Renders chapter's first example (source extracted from `markdown/canvas/syntax/<chapter>-1.md` or `first-stage`) + `Run` button.
   - **Cards region**: Renders chapter's quest cards — lead `<chapter>-run` ("Run the First Example") quest first, followed by content validation quests.
   - **CTA**: *"Open the <Chapter> guide →"* at foot of cards linking to `/guide/syntax/<chapter>`.
   - Running the example completes `<chapter>-run` quest via per-chapter `markComplete`.

5. **`LearnProgressOverview`**
   - Refactored `TourLearnSection.tsx` shrinking to an overall progress summary across chapters and quests.

6. **`RegistrySection` (`TourRegistrySection.tsx`)**
   - Static area preserved.

7. **`ReferenceSection` (`TourReferenceSection.tsx`)**
   - Static area preserved.

---

## 2. Shared `ScrollSection` Primitive

**File**: `playground/src/tour/ScrollSection.tsx`

```tsx
export interface ScrollSectionProps {
  id: string
  title?: string
  stickyView: React.ReactNode
  slides: React.ReactNode
  footer?: React.ReactNode
  onVisibilityChange?: (visible: boolean) => void
}
```

### Layout Specs

- **Desktop (`lg:flex lg:items-start lg:gap-6`)**:
  - Sticky left column: `w-[360px] shrink-0 sticky top-[80px] h-[calc(100vh-100px)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl`.
  - Flow right column: `flex-1 min-w-0 flex flex-col gap-6`.
- **Mobile (`lg:hidden`)**:
  - Sticky top window: `sticky top-[65px] z-20 h-[calc(50vh-32px)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl px-4 pt-[2px] pb-1`.
  - Flow bottom cards: `flex flex-col gap-4 py-4`. Releases sticky window right after last card.
- **`prefers-reduced-motion`**:
  - Disables `sticky` positioning and CSS transforms/swaps; renders a flat vertical stack of static cards per section.

### Editor Memory Budget (Mount-on-enter / Unmount-on-exit)

- Each `ScrollSection` observes its viewport proximity via `IntersectionObserver` (`rootMargin: '200px'`).
- Unmounts/destroys interior CodeMirror editor instances when far offscreen.
- Keeps max ~2–3 active CodeMirror instances mounted simultaneously.

---

## 3. Quest Schema & Markdown Updates

### Markdown Quest Declarations

Update `quests:` frontmatter across all six chapter files and `markdown/canvas/home/README.md`:

1. `markdown/canvas/syntax/basics.md`: Add `basics-run` ("Run the First Example", type `run-started`) as item 1 under `quests:`.
2. `markdown/canvas/syntax/protocols.md`: Add `protocols-run` (item 1).
3. `markdown/canvas/syntax/structure.md`: Add `structure-run` (item 1).
4. `markdown/canvas/syntax/custom-metrics.md`: Add `custom-metrics-run` (item 1).
5. `markdown/canvas/syntax/dialects.md`: Add `dialects-run` (item 1).
6. `markdown/canvas/syntax/complex.md`: Add `complex-run` (item 1).
7. `markdown/canvas/home/README.md`: Update chapter quest lists under `quests:` to include `<chapter>-run` as lead quest for each chapter block.

### Quest Completion Wiring

- In `ChapterHeroSection`, pressing `Run` invokes `useUserStartedChallenge({ challengeId: '<chapter>-run' })` and calls `markComplete('<chapter>-run')` for that chapter.
- In syntax guide pages (`ScrollCanvasPage.tsx` / `MarkdownCanvasPage.tsx`), running the guide's single run quest also satisfies `<chapter>-run`.
- Cross-route OR in `useChapterProgress` automatically surfaces completion in global progress badges without data migrations.

---

## 4. File-by-File Implementation Plan

### New Files
- `playground/src/tour/ScrollSection.tsx` — Shared `ScrollSection` primitive with mobile top-sticky, desktop side-sticky, reduced-motion fallback, and lazy mount/unmount.
- `playground/src/tour/CelebrationBridge.tsx` — Static non-sticky bridge section, hype copy, and `home-tour` progress badge.
- `playground/src/tour/ChapterHeroSection.tsx` — Chapter hero wrapper using `ScrollSection` to render runnable example + quest cards + CTA.
- `playground/src/tour/ChapterHeroSection.test.tsx` — Unit tests for chapter hero run completion and rendering.
- `playground/src/tour/ScrollSection.test.tsx` — Unit tests for layout branches and reduced-motion fallback.

### Modified Files
- `playground/src/tour/HomeTour.tsx` — Refactor into main orchestrator rendering `GreetingHero` -> `TourSection` -> `CelebrationBridge` -> 6x `ChapterHeroSection` -> `LearnProgressOverview` -> `Registry` -> `Reference`.
- `playground/src/tour/TourMobileRunway.tsx` — Update to use `ScrollSection` and mount `HighlightRing` at scale 1.
- `playground/src/tour/TourLearnSection.tsx` — Trim into `LearnProgressOverview`.
- `playground/src/pages/PlaygroundLandingPage.tsx` — Deprecate/cleanup legacy code if needed.
- `playground/src/App.tsx` — Unregister `/proto/tour-window` and `/proto/chapter-hero` routes.
- `markdown/canvas/syntax/*.md` & `markdown/canvas/home/README.md` — Frontmatter quest schema updates.

### Deleted Files (Throwaway Prototypes Cleanup)
- `playground/src/pages/TourWindowPrototypePage.tsx`
- `playground/src/pages/ChapterHeroPrototypePage.tsx`

---

## 5. Telemetry Parity

Preserve existing telemetry events and add chapter hero tracking:
- `home:arrival` — page load
- `home:hero_edited` — visitor edited hero
- `home:hero_reset` — hero reset to arrival (#882)
- `home:runway_reached` — scrolled into tour section
- `home:stage_viewed` — tour stage viewed
- `home:chapter_hero_viewed` — `{ chapter: string }`
- `home:chapter_example_run` — `{ chapter: string }`
- `home:chapter_guide_clicked` — `{ chapter: string }`

---

## 6. Test Plan & Test Updates

- Update existing test suites in `playground/src/tour/`:
  - `HomeTour.test.tsx`: Verify full section order and short-circuit strip.
  - `HomeTour.arrival.test.tsx`: Verify `/load?z=` arrival and hero reset contract (#882).
  - `HomeTour.mobile.test.tsx`: Verify mobile top-sticky `ScrollSection` and `prefers-reduced-motion` static card stack.
  - `HomeTourCounter.test.tsx`: Verify header quest counter includes `home-tour` + `<chapter>-run` quests.
- Run full test suite: `npm run test`.

---

## 7. Verification Checklist

- [ ] **Greeting Hero**: Visible at load, preserves `/load?z=` script arrival, `Run` opens fullscreen playground without scrolling, hero viewport re-entry resets editor (#882).
- [ ] **Tour Section**: Pins own window on mobile (top 65px) with `HighlightRing` active at scale 1, slides below, side-sticky on desktop.
- [ ] **Celebration Bridge**: Displays headline, hype paragraph, and `home-tour` progress badge; flips to green check when tour quests completed.
- [ ] **Chapter Heroes (6x)**: Each section displays runnable example + quest cards (lead `<chapter>-run` first) + guide CTA.
- [ ] **Quest Completion**: Pressing `Run` on a chapter hero completes `<chapter>-run`; guide page runs also complete it.
- [ ] **Reduced Motion**: `prefers-reduced-motion` renders flat static card stack for every section without sticky panels or crossfades.
- [ ] **Memory Budget**: Offscreen editors unmount/destroy CodeMirror instances to keep active count ≤3.
- [ ] **Desktop Layout**: Side-sticky windows (`w-[360px]`) with quest cards beside.
- [ ] **Prototypes Cleaned**: `/proto/*` routes removed from `App.tsx` and files deleted.
- [ ] **Automated Tests**: All tests pass (`npm run test`).
