# Canvas-Runway Seam — One Runway Core, Thin Hosts

**Status**: accepted — 2026-08-08 (locked under [#935](https://github.com/SergeiGolos/wod-wiki/issues/935))
**Parent map**: [#932](https://github.com/SergeiGolos/wod-wiki/issues/932); applies [#933](https://github.com/SergeiGolos/wod-wiki/issues/933) (Canvas Page Composer) + [#934](https://github.com/SergeiGolos/wod-wiki/issues/934) (Stage-Resolution seam)

There is one runway implementation. `ScrollCanvasPage`'s inline duplicate of the runway rendering (the `sourcesByStageId` memo, the `useScrollRunway` + `useScrollTypewriter` wiring, playground mode, the imperative toast/effects scrub) is deleted; `ScrollCanvasPage` becomes a thin route host that feeds the **Page Composer**. The page-agnostic runway core (`ScrollRunwaySection`'s rendering logic) is the single implementation and becomes the **Runway Adapter**'s desktop presentation. Page chrome — the fullscreen runtime, page-level quests, trailing-section nav — folds into the composer.

## Why

`ScrollRunwaySection` was extracted from `ScrollCanvasPage` as the reusable runway core, but `ScrollCanvasPage` never migrated onto it — both carry near-verbatim stage-source memo + imperative toast/effects scrub, and they drifted (toast fade-out starts at `t=0.5` in `ScrollCanvasPage` vs `0.7` in the core). One implementation is the only durable fix for the drift.

## Considered options

- **A (chosen) — one core, thin hosts, chrome→composer.** Delete the duplicate; `ScrollCanvasPage` routes through the single core via the composer. The ticket's "two real adapters (page host, section host)" framing dissolves: with #933's positional block stream, a runway is a `runway` block the composer renders wherever authored — standalone guide page or embedded home-chapters section. One block kind, one adapter.
- **B (rejected) — keep `ScrollCanvasPage`'s inline version as the core.** Re-extracting from the page-coupled copy drags the chrome (runtime, quests, nav) back into the "reusable" module; the page-agnostic core is already the cleaner seam.

## The seam

```ts
interface RunwayAdapterProps {
  spec: ScrollSpec
  formFactor: FormFactor                               // composer context (desktop/mobile/reduced)
  wodFiles: Record<string, string>; theme: string; noteTitle?: string
  onStageEnter?: (stageId: string) => void                    // → composer fires the page quest
  onRun?: (doc: string, block: ScriptBlock | null) => void    // → composer launches the runtime
}
```

The adapter owns presentation + the interactive playground preview (typing freezes the scrub); the composer owns the runtime, page quests, and trailing-section nav. This matches `ScrollRunwaySection`'s existing page-agnostic callbacks (`onStageEnter`, `onRun`).

## Consequences

- `ScrollCanvasPage`'s runway rendering is deleted; it becomes `parse page → <PageComposer page={…} />`.
- The toast-fade drift is resolved to a single timing (the difference was accidental).
- The reduced-motion check currently duplicated in both files moves into the adapter (the composer provides **Form Factor**); the mobile card-visibility presentation folds in under [#936](https://github.com/SergeiGolos/wod-wiki/issues/936).
- `ChapterScrollTour` (the embedded home-chapters runway) and the guide pages both consume the same adapter — one runway everywhere.
- No new vocabulary; refines **Runway Adapter** + **Page Composer** (`CONTEXT.md` § Canvas & scroll).
