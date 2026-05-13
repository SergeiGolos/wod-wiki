# Component Fan-out Reduction — 2026-05-13

This note records the first pass of [WOD-216](/WOD/issues/WOD-216) / [WOD-237](/WOD/issues/WOD-237): pulling orchestration seams out of the highest-fan-out UI files without rewriting the full workbench architecture.

## Top 5 coupled component areas touched

1. `src/components/layout/WorkbenchContext.tsx`
2. `src/components/layout/Workbench.tsx`
3. `src/components/Editor/NoteEditor.tsx`
4. `src/components/Editor/overlays/RuntimeTimerPanel.tsx`
5. `src/components/cast/CastButtonRpc.tsx`

## New non-visual seams

- `src/app/workbench/workbenchDocumentModel.ts`
  - owns section/block derivation for workbench documents
- `src/app/workbench/workbenchProviders.ts`
  - owns workbench provider + persistence resolution and static fallback loading
- `src/app/workbench/workbenchEntryLoader.ts`
  - owns workbench entry fallback/title logic
- `src/app/editor/noteEditorServices.ts`
  - owns editor persistence defaults, file-drop attachment behavior, and review segment derivation
- `src/app/editor/runtimeTimerModel.ts`
  - owns runtime creation and workout result shaping for inline timers
- `src/app/cast/workbenchProjection.ts`
  - owns preview/review Chromecast payload construction

## Why this shape

The goal was not to invent a generic abstraction layer. The goal was to move cross-layer orchestration out of visual components so the components read more like composition shells.

That gives us:

- fewer direct `components -> services/hooks/repositories` edges in the heaviest files
- pure/testable helpers around document shaping and cast payloads
- a clearer next seam for the larger Planner vs Runtime Host split described in `docs/reports/architecture-deepening-opportunities.md`

## Follow-up opportunities

- Move remaining `Workbench` event-bus/runtime wiring behind an app-level workbench coordinator.
- Split `WorkbenchContext` loading/persistence from route synchronization.
- Continue shrinking `components/cast` so it consumes a projection service rather than constructing protocol payloads inline.
