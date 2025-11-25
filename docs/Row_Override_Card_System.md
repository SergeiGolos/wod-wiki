# Row Override Card System - Architecture Design

## Problem Statement

The current inline card system tries to do too much:
- Hides source lines completely
- Replaces content with view zones
- Creates complex folding/unfolding behavior
- Mixes concerns of display, editing, and structure

## New Mental Model: Row Override Rules

Instead of replacing content, think of a card as a **collection of rules for how to override any given row**:

```
┌─────────────────────────────────────────────────────┐
│ Card = Collection of Row Rules                       │
├─────────────────────────────────────────────────────┤
│ Row 1: Header Rule     → Shows header decoration    │
│ Row 2: Content Rule    → Shows source + overlay     │
│ Row 3: Content Rule    → Shows source + overlay     │
│ Row N: Footer Rule     → Shows footer decoration    │
└─────────────────────────────────────────────────────┘
```

## Row Rule Types

### 1. **Header Rule**
Replaces the row with a card header decoration.
```
```wod  →  ┌──[WOD Block]──────────────────┐
```

### 2. **Footer Rule**
Replaces the row with a card footer decoration.
```
```     →  └──[Start Workout ▶]────────────┘
```

### 3. **Styled Rule**
Applies CSS styling to the Monaco line content (no wrapper).
```
# Heading  →  (large bold text, no card border)
```

### 4. **Overlay Rule** (Supports Multi-Row Spanning)
Adds an overlay widget next to/over one or more source lines. A single overlay can span multiple rows, grouping them visually.

**Single line overlay:**
```
key: value  →  │ key: value │ Parsed: key=value  │
```

**Multi-line spanning overlay:**
```
- 10 Pushups   ┐              ┌─────────────────────────┐
- 10 Situps    │──────────────│ Parsed Workout          │
- 10 Squats    ┘              │ • 10 Pushups            │
                              │ • 10 Situps             │
                              │ • 10 Squats             │
                              │ [▶ Start Workout]       │
                              └─────────────────────────┘
```

### 5. **Grouped Content Rule**
Marks a line as belonging to a parent spanning overlay. These lines contribute to the overlay's content but don't create their own overlay.

## Card Type Implementations

### WOD Block (`\`\`\`wod ... \`\`\``)

```
Line 1: ```wod          → Header Rule (card header)
Line 2: Timer 10:00     → Overlay Rule (spans lines 2-4, creates grouped overlay)
Line 3:   - 10 Pushups  → Grouped Content Rule (belongs to line 2's overlay)
Line 4:   - 10 Situps   → Grouped Content Rule (belongs to line 2's overlay)
Line 5: ```             → Footer Rule (card footer + Start button)
```

Visual Result:
```
┌──────────────────────────────────────────────────────┐
│ WOD Block                                             │
├──────────────────────────────────────────────────────┤
│                         │  ┌─────────────────────┐   │
│ Timer 10:00             │  │ Parsed Workout:     │   │
│   - 10 Pushups          │  │ • Timer: 10:00      │   │
│   - 10 Situps           │  │ • 10 Pushups        │   │
│   - 10 Squats           │  │ • 10 Situps         │   │
│                         │  │ • 10 Squats         │   │
│                         │  │                     │   │
│                         │  │ [▶ Start Workout]   │   │
│                         │  └─────────────────────┘   │
├──────────────────────────────────────────────────────┤
│ ``` (footer with actions)                             │
└──────────────────────────────────────────────────────┘
```

**Key Features**: 
- The overlay spans all content lines (2-4)
- Content lines are centered vertically within the card
- Single overlay handles parsing + start button for entire block

### Frontmatter (`--- ... ---`)

```
Line 1: ---           → Header Rule (full overview header)
Line 2: title: value  → Overlay Rule (single line - left=source, right=parsed)
Line 3: date: value   → Overlay Rule (single line - left=source, right=parsed)
Line 4: ---           → Footer Rule (card footer)
```

**Alternative**: Group all properties under one spanning overlay:
```
Line 1: ---           → Header Rule
Line 2: title: value  → Overlay Rule (spans lines 2-3)
Line 3: date: value   → Grouped Content Rule (belongs to line 2's overlay)
Line 4: ---           → Footer Rule
```

Visual Result:
```
┌──────────────────────────────────────────────────────┐
│ Document Properties                                   │
├──────────────────────────────────────────────────────┤
│ title: My Workout   │  title    │ My Workout        │
│ date: 2024-01-15    │  date     │ January 15, 2024  │
└──────────────────────────────────────────────────────┘
```

### Media (Image/Video)

Combined header/footer with display as one unified card. Cursor entering allows half-screen slide.

```
Line 1: ![alt](url)   → Full Card Rule (header + content + footer)
```

Visual Result:
```
┌──────────────────────────────────────────────────────┐
│ Image                                                 │
├──────────────────────────────────────────────────────┤
│                    [Image Display]                    │
│                                                       │
│ ![Exercise Demo](./images/demo.png)                  │
└──────────────────────────────────────────────────────┘
```

When cursor enters: Source slides to 50%, display shows in remaining 50%.

### Headings

**No card wrapper**. Just apply CSS styling to Monaco line.

```
# Heading 1  → (text-2xl font-bold styling applied to line)
## Heading 2 → (text-xl font-bold styling applied to line)
```

### Blockquotes

Wrap line in card-like styling (similar to WOD blocks but single-line).

```
> Quote text  → Card with left border accent styling
```

Visual:
```
┌────────────────────────────────────────────────────┐
│ │ Quote text                                       │
└────────────────────────────────────────────────────┘
```

## Implementation Architecture

### Core Types

```typescript
/** Types of row overrides */
type RowOverrideType = 
  | 'header'          // Card header decoration
  | 'footer'          // Card footer decoration  
  | 'styled'          // Apply CSS to Monaco line
  | 'overlay'         // Overlay next to line(s) - can span multiple rows
  | 'grouped-content' // Part of a spanning overlay
  | 'full-card';      // Complete card replacement

/** Base row rule */
interface BaseRowRule {
  lineNumber: number;
  overrideType: RowOverrideType;
}

/** Overlay row rule - can span multiple rows */
interface OverlayRowRule extends BaseRowRule {
  overrideType: 'overlay';
  position: 'right' | 'below' | 'floating';
  /** Lines this overlay spans (inclusive) */
  spanLines?: { startLine: number; endLine: number };
  overlayId?: string;
  renderOverlay: (props: OverlayRenderProps) => ReactNode;
  overlayWidth?: number | string;
  heightMode?: 'auto' | 'match-lines' | 'fixed';
}

/** Grouped content rule - belongs to a spanning overlay */
interface GroupedContentRowRule extends BaseRowRule {
  overrideType: 'grouped-content';
  parentOverlayId: string;
  marginTop?: number;
  marginBottom?: number;
  lineClassName?: string;
}

/** Card as collection of row rules */
interface InlineCard {
  id: string;
  cardType: CardType;
  sourceRange: Range;
  rules: RowRule[];
  content: CardContent;
  isEditing: boolean;
}
```

### Row Rule Generator

Each card type has a rule generator:

```typescript
interface CardRuleGenerator {
  /** Generate row rules for a card */
  generateRules(card: ParsedCard): RowRule[];
}
```

### Rendering Pipeline

1. **Parse** content into card definitions
2. **Generate** row rules for each card
3. **Apply** rules to Monaco:
   - `header/footer`: Create small view zones replacing marker lines
   - `styled`: Apply decorations to line (headings)
   - `overlay`: Position overlay widget spanning one or more lines
   - `grouped-content`: Mark lines as belonging to parent overlay
4. **Handle** cursor interactions for edit mode

## Benefits

1. **No hidden areas** - Source is always visible and editable
2. **Clear separation** - Each line has one rule type
3. **Composable** - Cards are just rule collections
4. **Multi-row overlays** - One overlay can group multiple source lines
5. **Maintainable** - Each card type defines its own rules
6. **Flexible** - Easy to add new rule types or card types
