# Stage-Resolution Seam — One Resolver, Two Form-Factor Drivers

**Status**: accepted — 2026-08-08 (locked under [#934](https://github.com/SergeiGolos/wod-wiki/issues/934))
**Parent map**: [#932](https://github.com/SergeiGolos/wod-wiki/issues/932); builds on [#933](https://github.com/SergeiGolos/wod-wiki/issues/933) (Canvas Page Composer)

A single **Stage-Resolution seam** maps scroll progress / geometry onto the active stage: one pure **Stage Resolver** (`resolveScrollStage(progress, stages) → Stage Slice`) over one stage-list format (the markdown `ScrollSpec`), with two **Scroll Driver** adapters behind it — the desktop scroll-progress driver and the mobile card-visibility driver. The TS `TOUR_STAGES` / `resolveStage` variant is deleted (the tour migrates onto `ScrollSpec` per #933), and the duplicated scroll-driver + typewriter hooks unify into one implementation each.

## Why

Three "stage machines" existed: `tourStages.resolveStage` (TS `TOUR_STAGES`), `scrollRunway.resolveScrollStage` (markdown `ScrollSpec`), and `TourMobileRunway`'s IntersectionObserver reading-zone picker — plus admitted near-copy hooks (`useTourScroll` vs `useScrollRunway`, `useTypewriter` vs `useScrollTypewriter`) that had already drifted (imperative toast fade window 0.7 vs 0.5). #933 made the canvas markdown the source of truth, so the TS stage list dies and there is one format going forward.

## Considered options

**Mobile driver** — the genuine fork:

- **A (chosen) — two drivers behind one seam.** Mobile keeps card-visibility (IntersectionObserver over the reading zone below the pinned window) as a second adapter producing the same **Stage Slice** with discrete `t`. Robust to variable-height caption cards; preserves the read-as-you-scroll mobile UX. Desktop uses the scroll-progress driver.
- **B (rejected) — one scroll-progress model everywhere.** Mobile would use a tall runway under the pinned window → continuous local `t` (scrubbed typewriter on mobile), but forces fixed-height card slots and redesigns the deliberate mobile card UX.

**Beat-split ring — dropped.** `ringB` / `beatSplit` are defined on `TourStage` and honored in `resolveStage`, but **no `TOUR_STAGES` entry sets them** — dead weight. The unified `ScrollStage.ring` (single ring, optional tag) is the model.

## The seam

```ts
// Pure resolver — range-clamping, testable (already the clean core).
resolveScrollStage(progress: number, stages: ScrollStage[]): StageSlice

interface StageSlice {
  index: number
  stage: ScrollStage
  /** Local progress within the stage, 0..1 — continuous on desktop, discrete on mobile. */
  t: number
  ring: { tag?: string } | null
}
```

- **Stage Resolver** — the pure `(progress, stages) → Stage Slice`. One implementation; the TS `resolveStage` folds into it.
- **Scroll Driver (desktop)** — window-scroll over the runway → progress → resolver; exposes a React-state slice (discrete stage changes) + per-frame `subscribe` for scrubbed visuals. Unifies `useTourScroll` + `useScrollRunway`.
- **Card-Visibility Driver (mobile)** — IntersectionObserver over the reading zone → active stage index → slice (discrete `t`; the demo auto-plays per stage). Owned by the mobile adapter presentation.
- **Typewriter** — one stage/source-aware implementation (per-stage restart), scrubbed by `t` on desktop, auto-playing per stage on mobile. Unifies `useTypewriter` + `useScrollTypewriter`.

## Consequences

- `tourStages.ts` (`TOUR_STAGES`, `resolveStage`, `TourStageSlice`) is deleted; the tour's stages move into `markdown/canvas/home/README.md` ```` ```scroll ```` blocks (already mirrored there).
- `useTourScroll.ts` and the tour's `useTypewriter` are deleted; `useScrollRunway` + `useScrollTypewriter` become the single implementations (renamed if they serve all form factors, not just canvas).
- The toast-fade drift (0.7 vs 0.5) is fixed by there being one implementation.
- The **Runway Adapter** ([#936](https://github.com/SergeiGolos/wod-wiki/issues/936)) consumes this seam: it picks the driver by **Form Factor** and renders the slice.
- New vocabulary in `CONTEXT.md` § Canvas & scroll: **Stage Slice**, **Stage Resolver**, **Scroll Driver**.
- Unblocks [#935](https://github.com/SergeiGolos/wod-wiki/issues/935) (canvas-runway seam) and leaves [#936](https://github.com/SergeiGolos/wod-wiki/issues/936) (the adapter) fully unblocked.
