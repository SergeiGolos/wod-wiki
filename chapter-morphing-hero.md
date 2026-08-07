# Chapter Tour: Morphing Window, Per-Chapter Slides, Line Focus, Inline Badges

## Goal
Turn the six syntax-chapter heroes into a **single shared sticky window with six chapter slides**: scrolling to a chapter slide morphs the window to that chapter's example and applies a **line/element focus highlight** on the specific lines that chapter teaches. Each slide is a prose **blurb** (title + desc) with the chapter's **badge inline**; the standalone "Learn the Language" strip is removed.

## Design (grounded)
- **One sticky window, six slides.** Today `HomeTour` renders six separate `ChapterHeroSection`s (each its own `ScrollSection` + its own static editor). New: one `ChapterTourSection` owns a single sticky `TourEditorScreen` + the six chapter slides; the active slide morphs the window.
- **Slide per chapter** (a chapter may hold several quests — the slide is the chapter blurb). **Example = the chapter's first quest's `example`** (new quest field), falling back to the existing `CHAPTER_EXAMPLES` entry.
- **Morph = swap doc + line focus.** Active slide swaps the sticky editor's `doc` to that chapter's example and highlights the chapter's `focus` lines. Reuses the #884 pattern (`Decoration.line` classes measured into a proxy, as `preview-decorations.ts` + `TourEditorScreen`'s Card-2 fence highlight already do).
- **Badges inline.** Each slide renders its own badge (icon via `chapterIcon`, title, `done ✓`/`n/m`). Delete the separate `LearnProgressOverview` render; keep its "Start Lesson 1"/"Cheat sheet" CTAs in the section header above the chapters.

## Tasks
- [ ] Extend the quest model in `canvas/parseCanvasMarkdown.ts`: `Quest` gains optional `example` (snippet source) and `focus` (line range spec, e.g. `{start,end}` or `data-effect-target` selector). Parse them from ```quest blocks. → Verify: parser test parses a quest block with `desc`, `example`, `focus`.
- [ ] Add active-slide tracking to `tour/ScrollSection.tsx` (extend the existing IntersectionObserver; report `activeIndex` via `onActiveSlideChange`, debounced to slide-change, works in mobile + desktop layouts). → Verify: `ScrollSection.test.tsx` — scrolling fires the callback with the right slide index.
- [ ] Build `tour/ChapterTourSection.tsx`: one sticky `TourEditorScreen` + the six chapter slides; on active-slide change, swap `doc` to the chapter's first-quest `example` and apply its `focus` highlight (debounced; mount-once preserved). → Verify: render test shows six slides + one window; active-slide change swaps doc + focus class without remounting CodeMirror.
- [ ] Add a `chapter-focus` line decoration in `src/components/Editor/extensions/` (a `Decoration.line` class on the chapter's `focus` range), wired into the editor the window uses. → Verify: focused lines render the highlight class; non-focus lines unaffected.
- [ ] Render each chapter slide as a blurb (`quest.label` + `quest.desc` for the chapter, done state) with its **badge inline**; remove the `<li>` quest rows. → Verify: render test shows blurb text + badge chip + live `n/m` count; no list rows.
- [ ] Update `tour/HomeTour.tsx`: replace the six `ChapterHeroSection`s + `LearnProgressOverview` with one `ChapterTourSection`; move the "Start Lesson 1"/"Cheat sheet" CTAs into the section header. → Verify: home renders no post-chapters strip; CTAs still link + record telemetry.
- [ ] Reduced-motion + empty fallback: reduced-motion = flat stack of all six blurbs with their example/focus inline; a chapter with no quest example uses `CHAPTER_EXAMPLES`. → Verify: reduced-motion snapshot shows all blurbs; fallback example used when a quest has none.

## Done When
- [ ] Scrolling the chapters morphs the single sticky window: doc swaps per chapter and the chapter's focus lines highlight (visual check at the playground).
- [ ] Each chapter slide shows a blurb + inline badge with live count; the standalone "Learn the Language" strip is gone; CTAs still reachable.
- [ ] `bun test ./src` + playground tour tests pass; no CodeMirror churn on fast scroll (mount-once + debounced doc swaps).

## Notes
- **Do NOT reuse the home runway's `tourStages.resolveStage`/`RingTargetKey`** (hard-coded to editor/timer/analytics). The chapter morph rides on `ScrollSection`'s active-slide tracking.
- **Focus is line-scoped**, not the UI-element ring: reuse the #884 fence-line measurement / `Decoration.line` decoration pattern, not `TourRing`'s element registry.
- CodeMirror fast-scroll churn is the known footgun (mount-once workaround exists) — doc swaps must be debounced to slide boundaries, never per-pixel.
- Keep per-chapter quest completion (`usePageQuests`, `useChapterProgress`) + telemetry events intact; only presentation changes.
- `ChapterHeroSection` is superseded by `ChapterTourSection` — retire it (or keep only if another surface uses it) once the new section lands.
