# Storybook Monaco Editor Configuration

This document outlines the current state of Monaco Editor configuration across Storybook stories and proposes a standardized approach for consistency.

## Current State

We currently have two primary ways the Monaco Editor is exposed in stories:
1.  **Via `UnifiedWorkbench`**: Used in `Overview`, `Playground`, and `Syntax` stories.
2.  **Direct `MarkdownEditor`**: Used in `Editor/Row-Based Cards` story.

### 1. UnifiedWorkbench Stories
*   **Files**:
    *   `stories/Overview.stories.tsx`
    *   `stories/Playground.stories.tsx`
    *   `stories/Syntax.stories.tsx`
*   **Component**: `UnifiedWorkbench`
*   **Props**:
    *   `initialContent`: Markdown string
    *   `showToolbar`: boolean
    *   `readonly`: boolean
    *   `theme`: Accepts `'vs'`, `'vs-dark'`, `'hc-black'`.
*   **Behavior**:
    *   `UnifiedWorkbench` internally maps these themes to its own `ThemeProvider` state (`light` or `dark`).
    *   It then calculates the Monaco theme as `'vs'` or `'vs-dark'` based on the active app theme.
    *   **Issue**: It currently bypasses the custom `'wod-light'` and `'wod-dark'` themes defined in `MarkdownEditor`, resulting in standard VS Code colors instead of our custom palette (e.g., `#020817` background).

### 2. Row-Based Cards Story
*   **File**: `stories/editor/RowBasedCards.stories.tsx`
*   **Component**: `MarkdownEditor` (wrapped in `RowBasedCardDemo`)
*   **Props**:
    *   `initialContent`: Markdown string
    *   `theme`: Explicitly uses `'wod-light'` or `'wod-dark'`.
    *   `showToolbar`: boolean
    *   `readonly`: boolean
*   **Behavior**:
    *   Directly utilizes the custom themes defined in `MarkdownEditor.tsx`.
    *   Provides the intended "premium" look and feel with correct background colors.

## Proposed Standardization

To ensure a consistent experience across all stories and the application, we should standardize on the following configuration:

### 1. Standard Props Interface
All editor-related stories should expose these controls:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialContent` | `string` | (Story dependent) | The markdown content to render. |
| `theme` | `enum` | `'wod-light'` | Options: `['wod-light', 'wod-dark']`. |
| `showToolbar` | `boolean` | `true` | Toggle the editor toolbar. |
| `readonly` | `boolean` | `false` | Toggle read-only mode. |

### 2. Theme Standardization
*   **Action**: Update `UnifiedWorkbench` to use `'wod-light'` and `'wod-dark'` as the default Monaco themes corresponding to the application's `light` and `dark` modes, respectively.
*   **Rationale**: This ensures that the `UnifiedWorkbench` (and thus the main app) looks identical to the isolated `MarkdownEditor` stories and uses our custom design tokens.

### 3. Story Implementation Guide

When creating new stories involving the editor:

```typescript
// Recommended ArgTypes
argTypes: {
  theme: {
    control: 'select',
    options: ['wod-light', 'wod-dark'],
    description: 'Editor theme',
    table: { defaultValue: { summary: 'wod-light' } }
  },
  showToolbar: { control: 'boolean' },
  readonly: { control: 'boolean' }
}
```

### 4. Migration Plan
1.  **Update `UnifiedWorkbench.tsx`**: Modify the `monacoTheme` memoization logic to return `'wod-light'`/`'wod-dark'` instead of `'vs'`/`'vs-dark'`.
2.  **Update Stories**: Refactor `Overview`, `Playground`, and `Syntax` stories to use `'wod-light'`/`'wod-dark'` in their `argTypes` and default `args`.

## Configuration Reference

### Custom Themes (defined in `MarkdownEditor.tsx`)
*   **`wod-dark`**: Base `vs-dark`, Background `#020817` (matches app dark mode).
*   **`wod-light`**: Base `vs`, Background `#ffffff` (matches app light mode).
