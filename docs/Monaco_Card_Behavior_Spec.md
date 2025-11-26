# Monaco Card Behavior Specification

This document specifies the refined card behavior for Monaco editor inline widgets. Each card type has distinct display rules based on cursor position and content type, using Monaco's View Zones, Decorations, and Overlay Widgets.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monaco APIs Reference](#monaco-apis-reference)
3. [Card Type Specifications](#card-type-specifications)
   - [Headings](#1-headings)
   - [Blockquotes](#2-blockquotes)
   - [Front Matter](#3-front-matter)
   - [WOD Blocks](#4-wod-blocks)
   - [Embedded Media](#5-embedded-media)
4. [Implementation Details](#implementation-details)
5. [CSS Variables and Theming](#css-variables-and-theming)

---

## Architecture Overview

### Core Principle: Row-Based Override Rules

Cards are **collections of row rules** that dictate how Monaco renders each line. The key behaviors:

1. **Fold (hide) delimiter lines only** (e.g., `---`, ` ``` `, `#` prefix)
2. **Decorate content lines** with card styling (borders, backgrounds)
3. **Insert View Zones** for card headers/footers at folded delimiter positions
4. **Add Overlay Widgets** for side-by-side preview content

### Visual Model

```
┌─────────────────────────────────────────────────────┐
│ Card = Collection of Row Rules                       │
├─────────────────────────────────────────────────────┤
│ Row 1: Header Rule     → ViewZone (replaces fence)  │
│ Row 2: Content Rule    → Decoration + Overlay       │
│ Row 3: Content Rule    → Decoration + Overlay       │
│ Row N: Footer Rule     → ViewZone (replaces fence)  │
└─────────────────────────────────────────────────────┘
```

---

## Monaco APIs Reference

| API | Purpose | Best For |
|-----|---------|----------|
| `setHiddenAreas` | Completely hide specific lines | Delimiter lines (`---`, fences, `#` prefix) |
| `changeViewZones` | Insert DOM between lines | Card headers/footers |
| `deltaDecorations` | Apply CSS to line ranges | Borders, backgrounds, inline styling |
| `addOverlayWidget` | Floating positioned DOM | Side-by-side preview panels |

### Key Insights from Monaco Documentation

1. **ViewZone `domNode`** renders **below** the mouse target layer - clicks may be captured by editor
2. **Zone-Widget Pattern**: Use ViewZone for space, OverlayWidget for interactivity
3. **Decoration stickiness**: Use `TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges` for semantic decorations
4. **Hidden Areas**: Not officially documented but available via `(editor as any).setHiddenAreas()`

---

## Card Type Specifications

### 1. Headings

**Goal**: Hide `#` characters and apply heading formatting when cursor is NOT on the line.

#### Display Modes

| Mode | Trigger | Visual Result |
|------|---------|---------------|
| **Preview** | Cursor outside line | `#` chars hidden, text styled as heading |
| **Edit** | Cursor on line | Raw `# Heading Text` visible |

#### Implementation

```typescript
// When cursor OUTSIDE the line (preview mode)
const previewRules = [
  StyledRowRule({
    lineNumber: headingLine,
    decoration: {
      hidePrefix: true,           // Hide "# " or "## " etc.
      prefixLength: level + 1,    // Number of # + space
      isWholeLine: true,
      inlineClassName: `heading-text heading-level-${level}`,
    }
  })
];

// When cursor ON the line (edit mode)
const editRules = []; // No rules - show raw Monaco text
```

#### CSS

```css
/* Hidden prefix */
.heading-prefix-hidden {
  opacity: 0;
  font-size: 0;
  width: 0;
  overflow: hidden;
}

/* Heading levels */
.heading-level-1 { font-size: 1.75rem; font-weight: 700; line-height: 2.25rem; }
.heading-level-2 { font-size: 1.5rem; font-weight: 700; line-height: 2rem; }
.heading-level-3 { font-size: 1.25rem; font-weight: 600; line-height: 1.75rem; }
.heading-level-4 { font-size: 1.125rem; font-weight: 600; line-height: 1.5rem; }
.heading-level-5 { font-size: 1rem; font-weight: 600; line-height: 1.5rem; }
.heading-level-6 { font-size: 0.875rem; font-weight: 600; line-height: 1.25rem; }
```

#### Visual Diagram

```
PREVIEW MODE (cursor elsewhere):
┌────────────────────────────────────────────────────┐
│ My Heading Text                                    │ ← Large, bold
└────────────────────────────────────────────────────┘

EDIT MODE (cursor on line):
┌────────────────────────────────────────────────────┐
│ # My Heading Text|                                 │ ← Raw text
└────────────────────────────────────────────────────┘
```

---

### 2. Blockquotes

**Goal**: Wrap with header/footer and style content to appear as a cohesive card with left border accent.

#### Display Modes

| Mode | Trigger | Visual Result |
|------|---------|---------------|
| **Preview** | Cursor outside | Card with left border, `>` hidden, styled text |
| **Edit** | Cursor inside | Raw `> text` visible with subtle border |

#### Structure

```
Input:
> First line of quote
> Second line
> Third line

Output (Preview Mode):
┌────────────────────────────────────────────────────┐
│ ┃ First line of quote                              │
│ ┃ Second line                                      │
│ ┃ Third line                                       │
└────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
const blockquoteRules = [
  // Header decoration (top border/rounding)
  HeaderRowRule({
    lineNumber: startLine,
    cardType: 'blockquote',
    className: 'blockquote-card-header',
  }),
  
  // Style each content line
  ...lines.map((_, i) => StyledRowRule({
    lineNumber: startLine + i,
    className: 'blockquote-card-line',
    decoration: {
      hidePrefix: true,           // Hide "> "
      prefixLength: 2,
      isWholeLine: true,
      inlineClassName: 'blockquote-text',
      beforeContentClassName: 'blockquote-left-border',
    }
  })),
  
  // Footer decoration (bottom border/rounding)
  FooterRowRule({
    lineNumber: endLine,
    cardType: 'blockquote',
    className: 'blockquote-card-footer',
  }),
];
```

#### CSS

```css
.blockquote-card-header {
  height: 4px;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  border: 1px solid var(--border);
  border-bottom: none;
}

.blockquote-card-footer {
  height: 4px;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border: 1px solid var(--border);
  border-top: none;
}

.blockquote-card-line {
  background-color: hsl(var(--muted) / 0.3);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.blockquote-left-border {
  border-left: 4px solid var(--primary);
  padding-left: 1rem;
}

.blockquote-text {
  font-style: italic;
  color: var(--muted-foreground);
}
```

---

### 3. Front Matter

**Goal**: Fold the `---` delimiter lines and replace with card header/footer. Property lines remain visible and editable.

#### Display Modes

| Mode | Trigger | Visual Result |
|------|---------|---------------|
| **Preview** | Cursor outside | `---` hidden, header shows "Document Properties" |
| **Edit** | Cursor inside | All lines visible including `---` |

#### Structure

```
Input:
---
title: My Document
author: John Doe
---

Output (Preview Mode):
┌──────────────────────────────────────────────────────┐
│ 📄 Document Properties                               │
├──────────────────────────────────────────────────────┤
│ title: My Document                                   │
│ author: John Doe                                     │
└──────────────────────────────────────────────────────┘

Key: --- lines are HIDDEN and replaced by the header/footer ViewZones
```

#### Implementation

```typescript
const frontMatterRules = {
  preview: [
    // Hide opening ---, replace with header ViewZone
    HiddenAreaRule({ line: startLine }),
    HeaderRowRule({
      lineNumber: startLine,
      cardType: 'frontmatter',
      title: 'Document Properties',
      icon: 'file-cog',
      className: 'frontmatter-card-header',
    }),
    
    // Style property lines with borders
    ...propertyLines.map((_, i) => StyledRowRule({
      lineNumber: startLine + 1 + i,
      className: 'frontmatter-property-line',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'frontmatter-property',
      }
    })),
    
    // Hide closing ---, replace with footer ViewZone
    HiddenAreaRule({ line: endLine }),
    FooterRowRule({
      lineNumber: endLine,
      cardType: 'frontmatter',
      className: 'frontmatter-card-footer',
    }),
  ],
  
  edit: [
    // Show header but don't hide delimiter
    HeaderRowRule({
      lineNumber: startLine,
      cardType: 'frontmatter',
      title: 'Document Properties (editing)',
      className: 'frontmatter-card-header frontmatter-editing',
    }),
    
    // Style all lines including delimiters
    StyledRowRule({
      lineNumber: startLine,
      className: 'frontmatter-delimiter-line',
    }),
    ...propertyLines.map((_, i) => StyledRowRule({
      lineNumber: startLine + 1 + i,
      className: 'frontmatter-property-line',
    })),
    StyledRowRule({
      lineNumber: endLine,
      className: 'frontmatter-delimiter-line',
    }),
    FooterRowRule({ ... }),
  ]
};
```

#### CSS

```css
.frontmatter-card-header {
  background: linear-gradient(to right, hsl(45 100% 60% / 0.2), transparent);
  border: 1px solid hsl(45 100% 50% / 0.4);
  border-bottom: none;
  border-radius: 0.5rem 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
}

.frontmatter-card-footer {
  height: 8px;
  background: hsl(45 100% 50% / 0.1);
  border: 1px solid hsl(45 100% 50% / 0.4);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
}

.frontmatter-property-line {
  background: hsl(45 100% 50% / 0.05);
  border-left: 1px solid hsl(45 100% 50% / 0.4);
  border-right: 1px solid hsl(45 100% 50% / 0.4);
}

.frontmatter-delimiter {
  color: hsl(45 70% 50%);
  font-weight: 500;
  opacity: 0.6;
}
```

---

### 4. WOD Blocks

**Goal**: Fold only the fence lines (` ```wod ` and ` ``` `), replace with header/footer, decorate content lines with side borders, and add 50/50 split with right-side preview overlay.

#### Display Modes

| Mode | Trigger | Visual Result |
|------|---------|---------------|
| **Preview** | Cursor outside | Fences hidden, 50/50 split layout |
| **Edit** | Cursor inside | Same 50/50 split (always side-by-side) |

#### Structure (50/50 Split)

```
Input:
```wod
5 rounds
10 Push ups
15 Squats
```

Output:
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏋️ Workout (3 statements)                                               │
├────────────────────────────────┬────────────────────────────────────────┤
│ Monaco Editor (left 50%)       │ Preview Overlay (right 50%)            │
│                                │                                        │
│ 5 rounds                       │ 🔄 Rounds Block                        │
│ 10 Push ups                    │    5 rounds                            │
│ 15 Squats                      │ 💪 10 Push ups                          │
│                                │ 🦵 15 Squats                            │
│                                │                                        │
│                                │ [▶ Start Workout]                      │
├────────────────────────────────┴────────────────────────────────────────┤
│ [Footer with actions]                                                    │
└─────────────────────────────────────────────────────────────────────────┘

Key: 
- ```wod line is HIDDEN, replaced by header ViewZone
- ``` line is HIDDEN, replaced by footer ViewZone
- Content lines have 50% width + right overlay
```

#### Implementation Strategy

This requires the **Zone-Widget Pattern** from Monaco docs:

1. **ViewZone**: Creates vertical space matching preview height
2. **OverlayWidget**: Positions over the ViewZone for interactivity
3. **Decorations**: Add side borders + 50% width constraint to Monaco lines

```typescript
const wodBlockRules = [
  // 1. Hide opening fence, replace with header
  HiddenAreaRule({ line: startLine }),
  HeaderRowRule({
    lineNumber: startLine,
    cardType: 'wod-block',
    title: `Workout (${statements.length} statements)`,
    icon: 'timer',
    className: 'wod-block-card-header',
  }),
  
  // 2. Style content lines with side borders (50% width)
  ...contentLines.map((_, i) => StyledRowRule({
    lineNumber: startLine + 1 + i,
    className: 'wod-block-content-line',
    decoration: {
      isWholeLine: true,
      inlineClassName: 'wod-code-text',
    }
  })),
  
  // 3. Add spanning overlay for right-side preview
  OverlayRowRule({
    lineNumber: startLine + 1,
    position: 'right',
    spanLines: { startLine: startLine + 1, endLine: endLine - 1 },
    overlayWidth: '50%',
    heightMode: 'match-lines',
    renderOverlay: (props) => (
      <WodPreviewPanel 
        statements={statements} 
        onStartWorkout={() => props.onAction('start-workout')}
      />
    ),
  }),
  
  // 4. Hide closing fence, replace with footer
  HiddenAreaRule({ line: endLine }),
  FooterRowRule({
    lineNumber: endLine,
    cardType: 'wod-block',
    actions: [
      { id: 'start-workout', label: 'Start Workout', icon: 'play', variant: 'primary' }
    ],
    className: 'wod-block-card-footer',
  }),
];
```

#### CSS for 50/50 Split

```css
/* Monaco content (left 50%) */
.wod-block-content-line {
  max-width: 50% !important;
  background: hsl(210 100% 50% / 0.03);
  border-left: 3px solid hsl(210 100% 50% / 0.4);
  padding-left: 0.5rem;
}

/* Ensure Monaco view-lines respect width constraint */
.wod-block-editor-half .view-lines {
  max-width: 50%;
}

/* Preview overlay (right 50%) */
.wod-preview-overlay {
  position: absolute;
  right: 0;
  width: 50%;
  top: 0;
  bottom: 0;
  background: var(--card);
  border-left: 1px solid var(--border);
  padding: 1rem;
  overflow: auto;
}

/* Header/Footer */
.wod-block-card-header {
  background: linear-gradient(to right, hsl(210 100% 50% / 0.15), transparent);
  border: 1px solid hsl(210 100% 50% / 0.3);
  border-bottom: none;
  border-radius: 0.5rem 0.5rem 0 0;
}

.wod-block-card-footer {
  background: hsl(210 100% 50% / 0.05);
  border: 1px solid hsl(210 100% 50% / 0.3);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
}
```

#### Height Synchronization

The preview panel height must match the content lines:

```typescript
function calculateWodPreviewHeight(
  statements: ICodeStatement[], 
  lineHeight: number
): number {
  const contentLineCount = statements.length;
  const minHeight = 120; // Minimum for the preview panel
  const calculatedHeight = contentLineCount * lineHeight;
  return Math.max(minHeight, calculatedHeight);
}
```

---

### 5. Embedded Media (Images/YouTube)

**Goal**: Line remains visible but padded to create space for the overlay showing rendered media below.

#### Display Modes

| Mode | Trigger | Visual Result |
|------|---------|---------------|
| **Preview** | Cursor outside | Line visible (dimmed), media overlay below |
| **Edit** | Cursor on line | Raw markdown, no overlay |

#### Structure

```
Input:
![Exercise Demo](./images/demo.png)

Output (Preview Mode):
┌─────────────────────────────────────────────────────────────────────────┐
│ ![Exercise Demo](./images/demo.png)   ← Source line (visible, dimmed)  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        [Image Preview]                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
const mediaRules = {
  preview: [
    // Style the markdown line (visible but dimmed)
    StyledRowRule({
      lineNumber: mediaLine,
      className: 'media-source-line',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'media-markdown-text',
      }
    }),
    
    // Add ViewZone below for the media preview
    ViewZoneRule({
      afterLineNumber: mediaLine,
      heightInPx: mediaType === 'image' ? await imageHeight : 315, // 16:9 for video
      domNode: createMediaPreview(content),
    }),
  ],
  
  edit: [
    // Just show raw line, no preview
    StyledRowRule({
      lineNumber: mediaLine,
      className: 'media-edit-line',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'media-markdown-editing',
      }
    }),
  ]
};
```

#### Dynamic Image Height

```typescript
async function calculateImageHeight(url: string, maxWidth: number): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const height = Math.min(maxWidth * aspectRatio, 400); // Max 400px
      resolve(height);
    };
    img.onerror = () => resolve(200); // Default fallback
    img.src = url;
  });
}
```

#### CSS

```css
.media-source-line {
  opacity: 0.6;
  font-size: 0.875rem;
  background: hsl(var(--muted) / 0.2);
}

.media-preview-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted) / 0.1);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  overflow: hidden;
}

.media-preview-zone img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.media-preview-zone iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

---

## Implementation Details

### Zone-Widget Pattern

For interactive elements (buttons, inputs), use this pattern:

```typescript
// Step 1: Create ViewZone for vertical space
let zoneId: string;
editor.changeViewZones(accessor => {
  zoneId = accessor.addZone({
    afterLineNumber: line,
    heightInPx: previewHeight,
    domNode: document.createElement('div'), // Empty spacer
  });
});

// Step 2: Create OverlayWidget positioned over the ViewZone
const widget: editor.IOverlayWidget = {
  getId: () => `widget-${line}`,
  getDomNode: () => createInteractiveContent(),
  getPosition: () => null, // Manual positioning
};
editor.addOverlayWidget(widget);

// Step 3: Position manually on scroll
const updatePosition = () => {
  const top = editor.getTopForLineNumber(line) - editor.getScrollTop();
  widget.getDomNode().style.top = `${top}px`;
  widget.getDomNode().style.left = `${layout.contentLeft}px`;
};
editor.onDidScrollChange(updatePosition);
updatePosition();
```

### Hidden Areas API

```typescript
// Hide specific lines
const hiddenRanges: Range[] = [
  new Range(1, 1, 1, 1),   // Hide line 1
  new Range(10, 1, 10, 1)  // Hide line 10
];
(editor as any).setHiddenAreas(hiddenRanges);

// Clear all hidden areas
(editor as any).setHiddenAreas([]);
```

### Decoration Stickiness

```typescript
{
  range: new Range(line, 1, line, endCol),
  options: {
    stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    // Prevents decoration from expanding when user types at boundaries
  }
}
```

---

## CSS Variables and Theming

All card styles use CSS custom properties for theming:

```css
:root {
  /* Card colors */
  --card-border: hsl(var(--border));
  --card-background: hsl(var(--card));
  --card-muted: hsl(var(--muted) / 0.3);
  
  /* Type-specific accent colors */
  --wod-accent: hsl(210 100% 50%);
  --frontmatter-accent: hsl(45 100% 50%);
  --blockquote-accent: hsl(var(--primary));
  --media-accent: hsl(280 80% 50%);
  
  /* Opacity variants */
  --accent-subtle: 0.1;
  --accent-medium: 0.3;
  --accent-strong: 0.6;
}
```

---

## Summary: Card Behavior Matrix

| Card Type | `#/>/---/``` Lines | Content Lines | Overlay |
|-----------|-------------------|---------------|---------|
| **Heading** | `#` hidden via decoration | Styled text | None |
| **Blockquote** | `>` hidden via decoration | Styled + left border | None |
| **Front Matter** | `---` hidden + ViewZone header/footer | Styled properties | None |
| **WOD Block** | Fences hidden + ViewZone header/footer | 50% width + styled | 50% right preview |
| **Media** | N/A | Dimmed source line | Below: media preview |

---

## References

- [Monaco Editor Line Manipulation APIs](./Monaco%20Editor%20Line%20Manipulation%20APIs.md)
- [Monaco Editor Syntax Highlighting Integration](./Monaco%20Editor%20Syntax%20Highlighting%20Integration.md)
- [Row Override Card System](./Row_Override_Card_System.md)
- [Monaco_Inline_Widget_Deep_Dive](./Monaco_Inline_Widget_Deep_Dive.md)
