# Playground Widget Integration Guide

This guide explains how to add another widget to the playground landing page without breaking the existing widget contracts.

## Current integration surface

- Landing page route: `/playground`
- Page component: `playground/src/pages/PlaygroundLandingPage.tsx`
- Widget components:
  - `playground/src/components/widgets/AttentionWidget.tsx`
  - `playground/src/components/widgets/CodeExampleWidget.tsx`
  - `playground/src/components/widgets/SyntaxGroupWidget.tsx`

## Integration checklist

1. **Define config shape in the widget module**
   - Export a typed config interface from the widget component.
   - Keep validation local to the widget (`invalid config` state when required fields are missing).

2. **Add a stable config constant in `PlaygroundLandingPage.tsx`**
   - Keep constants near the top of the file.
   - Prefer explicit, serializable values.

3. **Wire behavior via callback props**
   - Use callback handlers in `PlaygroundLandingPage` for navigation and interactions.
   - Keep widgets presentational; avoid route logic inside widget components.

4. **Add tests before merging**
   - Component tests in `playground/src/components/widgets/*.test.tsx`
   - Landing acceptance check in `e2e/live-app/playground-widget-block-preview.e2e.ts`

5. **Update docs**
   - Add or update widget entry in `docs/widget-catalog.md`.
   - If the integration pattern changes, update this guide.

## Example: adding a new widget card

1. Create `playground/src/components/widgets/FeatureCalloutWidget.tsx` and export:
   - `FeatureCalloutWidget`
   - `FeatureCalloutWidgetConfig`
2. Add `FEATURE_CALLOUT_CONFIG` in `PlaygroundLandingPage.tsx`.
3. Render `<FeatureCalloutWidget config={FEATURE_CALLOUT_CONFIG} />` in the page section.
4. Add `FeatureCalloutWidget.test.tsx` and verify expected callbacks.
5. Extend the Playwright acceptance test with one visible assertion for the new widget.

## Validation commands

```bash
bun test playground/src/components/widgets/AttentionWidget.test.tsx \
  playground/src/components/widgets/CodeExampleWidget.test.tsx \
  playground/src/components/widgets/SyntaxGroupWidget.test.tsx \
  --preload ./tests/unit-setup.ts

bun x playwright test e2e/live-app/playground-widget-block-preview.e2e.ts --config playwright.preview.config.ts
```
