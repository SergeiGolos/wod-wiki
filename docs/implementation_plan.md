# Implementation Plan - Unified Inline Widget System

Refactor the Monaco Editor integration to unify all rich features (including WOD Blocks) under the `InlineWidgetCardManager`. This involves removing the specialized `WodBlockSplitViewManager` and enhancing the `CardRenderer` to support a generic "Render Instruction" system.

## User Review Required

> [!IMPORTANT]
> This refactor will remove `WodBlockSplitViewManager`. Any logic specific to WOD block splitting (like the nested Monaco editor) must be migrated to the `CardRenderer` components.

## Proposed Changes

### Editor Core

#### [MODIFY] [types.ts](file:///d:/Dev/wod-wiki/src/editor/inline-cards/types.ts)
- Define `RenderInstruction` interface to encapsulate all editor modifications for a card.
- Update `InlineWidgetCard` to potentially include specific render hints.

#### [MODIFY] [CardRenderer.ts](file:///d:/Dev/wod-wiki/src/editor/inline-cards/CardRenderer.ts)
- Implement `getRenderInstructions(card)` method.
- Move WOD block rendering logic (Split View) into a new component `WodBlockCard`.
- Support "Above", "Below", and "Replace" view zone placements.

#### [MODIFY] [InlineWidgetCardManager.ts](file:///d:/Dev/wod-wiki/src/editor/inline-cards/InlineWidgetCardManager.ts)
- Remove hardcoded `CARD_TYPE_CONFIGS` logic for view zones.
- Use `renderer.getRenderInstructions(card)` to determine actions.
- Apply `hiddenRanges`, `viewZones`, and `decorations` from the instructions.

#### [MODIFY] [config.ts](file:///d:/Dev/wod-wiki/src/editor/inline-cards/config.ts)
- Update `wod-block` config to enable view zones (`usesViewZone: true`).

### Components

#### [NEW] [WodBlockCard.tsx](file:///d:/Dev/wod-wiki/src/editor/inline-cards/components/WodBlockCard.tsx)
- Create a React component that implements the Split View UI.
- Include the "Mini Monaco" editor logic (migrated from `WodBlockSplitViewFeature`).

#### [MODIFY] [CardContainer.tsx](file:///d:/Dev/wod-wiki/src/editor/inline-cards/components/CardContainer.tsx)
- Update to render `WodBlockCard` when type is `wod-block`.

### Cleanup

#### [DELETE] [WodBlockSplitViewFeature.tsx](file:///d:/Dev/wod-wiki/src/editor/features/WodBlockSplitViewFeature.tsx)
- Remove the obsolete manager.

#### [MODIFY] [MarkdownEditor.tsx](file:///d:/Dev/wod-wiki/src/markdown-editor/MarkdownEditor.tsx)
- Remove `WodBlockSplitViewManager` instantiation and usage.
- Ensure `InlineWidgetCardManager` is properly initialized with necessary callbacks (like `onStartWorkout`).

## Verification Plan

### Automated Tests
- Run existing tests to ensure no regressions in parsing.
- (Optional) Add unit tests for `getRenderInstructions`.

### Manual Verification
- Open a Markdown file with WOD blocks.
- Verify WOD blocks are rendered as Split Views.
- Verify editing inside the Split View works (Mini Monaco).
- Verify other cards (Headings, Images) still work as expected.
- Verify "Start Workout" button works.
