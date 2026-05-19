# Playground Page Authoring Guide

Use this guide when editing the `/playground` landing experience.

## Purpose

The playground landing page should:

- orient first-time users quickly,
- provide one runnable code example,
- link directly to syntax docs,
- stay responsive on desktop and mobile.

## Page structure contract

`playground/src/pages/PlaygroundLandingPage.tsx` renders three sections in order:

1. `AttentionWidget` (hero + CTA)
2. `CodeExampleWidget` (editable sample + run button)
3. `SyntaxGroupWidget` cards (docs shortcuts)

Keep this sequence unless product direction explicitly changes.

## Content writing standards

- **Headline**: one sentence, outcome-focused.
- **Subtitle**: 1–2 short lines max.
- **Pillars**: each card should describe one unique value.
- **Code example lines**: runnable WOD syntax only; every line should include a plain-language annotation.
- **Syntax cards**: category label + short description + real docs anchor (`/syntax#...`).

## Interaction standards

- `Jump to workout` must scroll to `#workout-widget-surface`.
- `Open search` must open the global palette, not a local filter.
- `Run this example` must create a playground page and route to `/playground/:id`.
- External docs links should use `window.open(..., 'noopener,noreferrer')`.

## Regression checks

Before shipping content or layout changes, verify:

1. No console errors on `/playground`.
2. Desktop and mobile both render without horizontal overflow.
3. `Run this example` button remains visible and clickable.
4. Syntax docs buttons still route correctly.

Automated coverage:

- component tests: `playground/src/components/widgets/*.test.tsx`
- live acceptance: `e2e/live-app/playground-widget-block-preview.e2e.ts`
