# Widget Catalog

This catalog covers the Phase 1C playground widget surface and the current status of each widget name.

## Playground Widget Surface

| Widget name | Status | Purpose | Primary file or design source |
| --- | --- | --- | --- |
| `playground-run-tip` | Implemented | Callout that points the reader to the first runnable workout block. | `playground/src/components/widgets/PlaygroundRunTipWidget.tsx` |
| `playground-welcome` | Implemented | Introductory explainer for movement, rounds, timers, and rep schemes. | `playground/src/components/widgets/PlaygroundWelcomeWidget.tsx` |
| `attention` | Design-approved | Hero/banner widget for playground framing and CTA emphasis. | `design-system/playground-widget-layout.md` |
| `code-example` | Design-approved | Annotated code walkthrough widget for teaching syntax in-context. | `design-system/playground-widget-layout.md` |
| `syntax-group` | Design-approved | Reference-card widget for grouped syntax examples. | `design-system/playground-widget-layout.md` |

> `hero` exists as a separate generic widget example in `src/components/Editor/widgets/HeroCarousel.tsx`, but it is outside the five-widget Phase 1C playground catalog.

## Catalog Entries

### `playground-run-tip`

- **Purpose**: nudges the author toward the Run button below the first workout block
- **Config**: `{}`
- **Usage**:

````md
```widget:playground-run-tip
{}
```
````

### `playground-welcome`

- **Purpose**: quick syntax orientation card for first-time playground users
- **Config**: `{}`
- **Usage**:

````md
```widget:playground-welcome
{}
```
````

### `attention`

- **Purpose**: hero banner with core value props and one or more calls to action
- **Status**: design-approved for Phase 1C; not implemented on `dev` in this checkout
- **Expected config shape**:

```json
{
  "headline": "string",
  "subtitle": "string",
  "pillars": [
    {
      "icon": "string",
      "label": "string",
      "description": "string"
    }
  ],
  "actions": [
    {
      "label": "string",
      "action": "scroll-to-workout | open-search",
      "variant": "primary | secondary"
    }
  ]
}
```

### `code-example`

- **Purpose**: show code lines with plain-language annotations beside them
- **Status**: design-approved for Phase 1C; not implemented on `dev` in this checkout
- **Expected config shape**:

```json
{
  "lines": [
    {
      "code": "string",
      "annotation": "string"
    }
  ],
  "cta": "string"
}
```

### `syntax-group`

- **Purpose**: render a compact syntax reference card for a category such as rounds, timers, or rep schemes
- **Status**: design-approved for Phase 1C; not implemented on `dev` in this checkout
- **Expected config shape**:

```json
{
  "category": "string",
  "icon": "string",
  "title": "string",
  "description": "string",
  "example": "string",
  "docsPath": "string"
}
```

## How to extend this catalog

When a new widget ships:

1. add the registry name
2. mark whether it is implemented or design-only
3. include a copy-pasteable fenced-block example
4. link the component file and the design/ADR source if both exist
5. update `docs/widget-authoring-guide.md` if the general authoring contract changes
