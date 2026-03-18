# Command Palette Line Editor

## Vision

Transform the existing command palette into a primary input mechanism for creating and editing workout statements — a keyboard-first, mobile-friendly line editor that makes writing WODs as fast as texting. On desktop: power-user shortcuts. On mobile: a purpose-built input experience that doesn't rely on a full code editor.

## What We Have Today

| Asset | Location | Relevance |
|-------|----------|-----------|
| Command palette | `src/components/command-palette/` | cmdk-based palette with strategies, Ctrl/Cmd+. trigger |
| `CommandStrategy` interface | `src/components/command-palette/types.ts` | `getCommands()` + `handleInput()` pattern |
| `WodNavigationStrategy` | `strategies/WodNavigationStrategy.ts` | Example: navigation commands from palette |
| Edit strategy pattern | `EditableStatementList` usage | Inline editing via `handleInput` + `initialInputValue` |
| UnifiedEditor (CodeMirror 6) | `src/components/Editor/UnifiedEditor.tsx` | Full editor — heavy for mobile |
| WOD parser (Lezer) | `src/parser/`, `src/grammar/` | Parses WOD syntax into `ICodeStatement[]` |
| Section renderers | `src/components/Editor/md-components/section-renderers/` | Render parsed statements as UI |

### Current Command Palette Flow

```
Ctrl/Cmd + .  →  Command palette opens
                 │
                 ├── If activeStrategy set:
                 │     strategy.getCommands() → list
                 │     or strategy.handleInput(text) → custom handler
                 │
                 └── Else: global commands filtered by context
                           fuzzy search via cmdk
```

The `handleInput` path is already doing what we want — it just needs to be expanded into a full line-editing experience.

## Design: Three Modes

### Mode 1: Quick Add (Ctrl+Enter / Mobile FAB)

The simplest flow. Open palette in "add statement" mode. Type a single workout line. Hit Enter. Done.

```
┌─────────────────────────────────────────┐
│ + Add statement...                      │
│ ┌─────────────────────────────────────┐ │
│ │ 5x10 Back Squat @225               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│  Preview:  5 × 10 reps  Back Squat     │
│            225 lbs                      │
│                                         │
│  [Enter] Add   [Tab] Autocomplete      │
│  [Esc] Cancel  [↑↓] History            │
└─────────────────────────────────────────┘
```

**Key UX elements:**
- Live preview of parsed statement below input
- Autocomplete for exercise names, metric units
- Up/Down arrow cycles through recent statements (history)
- Enter appends to current document
- Shift+Enter adds and keeps palette open (rapid entry)

### Mode 2: Edit In-Place (Ctrl+E on selected line)

Edit an existing statement without opening the full editor.

```
┌─────────────────────────────────────────┐
│ ✎ Edit statement                        │
│ ┌─────────────────────────────────────┐ │
│ │ 5x10 Back Squat @275               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│  Was: 5x10 Back Squat @225             │
│  Now: 5 × 10 reps  Back Squat  275lbs │
│                                         │
│  [Enter] Save   [Esc] Cancel           │
└─────────────────────────────────────────┘
```

**Key UX elements:**
- `initialInputValue` pre-populated with current statement text
- Diff preview: "was" vs "now"
- Enter saves edit in place
- Esc reverts

### Mode 3: Batch Builder (Ctrl+Shift+Enter)

Multi-line rapid entry for building a full workout.

```
┌─────────────────────────────────────────┐
│ 📝 Build workout                        │
│                                         │
│  1. 5:00 Warmup                    [×] │
│  2. 5x10 Back Squat @225          [×] │
│  3. 3x15 KB Swing @53             [×] │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ ┌─────────────────────────────────────┐ │
│ │ 4x8 Deadlift @315                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│  Preview: 4 × 8 reps  Deadlift  315lbs│
│                                         │
│  [Enter] Add line  [Ctrl+Enter] Done   │
│  [↑↓] Reorder     [×] Delete line      │
└─────────────────────────────────────────┘
```

**Key UX elements:**
- Accumulates lines into a list
- Each line shows parsed preview
- Drag or arrow-key reorder
- Delete individual lines
- Ctrl+Enter finalizes and inserts all lines into document
- Acts as a scratchpad before committing to the document

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action | Mode |
|----------|--------|------|
| Ctrl/Cmd + . | Open command palette | (existing) |
| Ctrl/Cmd + Enter | Quick Add statement | Quick Add |
| Ctrl/Cmd + E | Edit current line | Edit In-Place |
| Ctrl/Cmd + Shift + Enter | Batch builder | Batch Builder |
| Ctrl/Cmd + K | Query mode (see query-language.md) | Query |

### In-Palette Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| Enter | Submit / add line | All modes |
| Shift + Enter | Submit and stay open | Quick Add |
| Escape | Close palette | All modes |
| Tab | Accept autocomplete | All modes |
| ↑ / ↓ | History navigation (Quick Add) or reorder (Batch) | Contextual |
| Ctrl + ↑/↓ | Reorder lines | Batch Builder |
| Ctrl + Backspace | Delete current line | Batch Builder |

### Discoverable Shortcuts

Display shortcut hints in the palette footer. Use a `?` icon to show full shortcut reference.

## Mobile Experience

### The Problem

The full CodeMirror editor is functional on mobile but clunky — small touch targets, no easy way to insert common patterns, virtual keyboard covers half the screen.

### Mobile-First Input

Replace the full editor with a statement-list + command palette flow on mobile viewports.

```
┌─────────────────────────────┐
│ Morning WOD          [...] │
│─────────────────────────────│
│                             │
│  ⏱ 5:00 Warmup             │
│  💪 5×10 Back Squat @225   │
│  💪 3×15 KB Swing @53      │
│  ⏱ 10:00 AMRAP:            │
│     💪 5 Pull-ups           │
│     💪 10 Push-ups          │
│     🏃 15 Air Squats        │
│                             │
│─────────────────────────────│
│  [+ Add]  [▶ Start]  [⋯]  │
└─────────────────────────────┘
```

**Tapping a statement** opens the edit palette (Mode 2).
**Tapping [+ Add]** opens the quick-add palette (Mode 1).
**Long-press** enters reorder mode (drag handles appear).

### Mobile Input Enhancements

#### Smart Keyboard Bar

Above the virtual keyboard, a toolbar with common tokens:

```
┌──────────────────────────────────────┐
│ [×] [reps] [:] [min] [@] [#] [AMRAP]│
└──────────────────────────────────────┘
```

Tapping inserts the token at cursor position. This eliminates hunting for special characters.

#### Template Chips

Pre-built statement templates that fill in the input:

```
┌────────────────────────────────────────┐
│ Templates:                             │
│ [5×10 ___]  [__:__ ___]  [AMRAP ___] │
│ [EMOM ___]  [Tabata ___] [For Time]  │
└────────────────────────────────────────┘
```

Tapping a chip inserts the skeleton with cursor at the first blank.

#### Voice Input

Integrate with browser speech recognition API for hands-free input:

```
🎤 "five by ten back squat at two twenty five"
→  5x10 Back Squat @225
```

This is a stretch goal but extremely valuable for mobile gym use.

## Implementation Plan

### Phase 1: Quick Add Strategy

Extend the command palette with a dedicated "add statement" strategy.

```
src/
  components/
    command-palette/
      strategies/
        QuickAddStrategy.ts       # handleInput → parse + insert
        QuickAddPreview.tsx        # Live parsed preview component
      hooks/
        useStatementHistory.ts     # Recent statement recall (↑/↓)
```

```typescript
// QuickAddStrategy.ts
export class QuickAddStrategy implements CommandStrategy {
  id = 'quick-add';
  placeholder = 'Type a workout statement...';

  getCommands(): Command[] {
    return []; // Input-only mode
  }

  handleInput(text: string): boolean {
    const parsed = parseStatement(text);
    if (parsed) {
      this.onAdd(parsed);
      return true;
    }
    return false; // Keep open if parse fails
  }
}
```

**Preview component** — renders below the palette input, showing the parsed interpretation in real-time:

```typescript
// QuickAddPreview.tsx
function QuickAddPreview({ input }: { input: string }) {
  const parsed = useMemo(() => tryParse(input), [input]);
  if (!parsed) return <span className="text-zinc-500">Type a workout line...</span>;
  return (
    <div className="flex gap-2 text-sm">
      {parsed.metrics.map(m => <MetricBadge key={m.type} metric={m} />)}
      <span className="text-zinc-300">{parsed.name}</span>
    </div>
  );
}
```

### Phase 2: Edit-In-Place + Batch Builder

```
src/
  components/
    command-palette/
      strategies/
        EditStrategy.ts           # Pre-populated edit mode
        BatchBuilderStrategy.ts   # Multi-line accumulator
      components/
        BatchBuilderList.tsx       # Accumulated line list with reorder
        StatementDiff.tsx          # Was/now preview for edits
```

### Phase 3: Mobile View

```
src/
  components/
    mobile/
      MobileWorkoutView.tsx       # Statement list (tap to edit)
      MobileInputBar.tsx          # Token toolbar above keyboard
      TemplateChips.tsx           # Pre-built statement skeletons
    command-palette/
      MobilePalette.tsx           # Full-screen palette variant
```

**Key decisions for mobile:**
- Detect viewport width (`useMediaQuery` or Tailwind `md:` breakpoint)
- Swap `UnifiedEditor` for `MobileWorkoutView` on narrow screens
- Palette renders full-screen (bottom sheet pattern) on mobile
- Touch targets minimum 44px

### Phase 4: Autocomplete + Polish

```
src/
  components/
    command-palette/
      autocomplete/
        ExerciseAutocomplete.ts   # Exercise name suggestions
        MetricAutocomplete.ts     # Unit/metric completions
        HistoryAutocomplete.ts    # Recently used statements
```

Autocomplete sources:
1. **Exercise database** — built from all historical workout data (extract exercise names from segments)
2. **Metric patterns** — common rep schemes, durations, weights
3. **Recent statements** — last N unique statements entered
4. **Templates** — AMRAP, EMOM, Tabata, For Time, etc.

## Integration with Existing Command Palette

The beauty of the `CommandStrategy` pattern is that these are just new strategies. Registration:

```typescript
// In CommandContext.tsx or equivalent initialization
const strategies = {
  'quick-add': new QuickAddStrategy(onAdd),
  'edit': (stmt) => new EditStrategy(stmt, onEdit),
  'batch': new BatchBuilderStrategy(onBatchComplete),
  'query': new QueryStrategy(onQuery),  // from query-language.md
  'navigate': new WodNavigationStrategy(),  // existing
};
```

Each mode is activated by its keyboard shortcut, which sets `activeStrategy` and opens the palette.

## Statement Parsing for Preview

Use the existing Lezer parser in "single-line" mode to parse input text:

```typescript
function tryParse(input: string): ICodeStatement | null {
  try {
    const statements = parse(input);
    return statements[0] ?? null;
  } catch {
    return null;
  }
}
```

The preview is forgiving — partial input shows what's parsed so far, rather than erroring:

```
Input: "5x10"        → Preview: "5 × 10 reps"
Input: "5x10 Back"   → Preview: "5 × 10 reps  Back"
Input: "5x10 Back S" → Preview: "5 × 10 reps  Back S"  (autocomplete: "Back Squat")
```

## Data Flow

```
User presses Ctrl+Enter
       │
       ▼
  CommandPalette opens with QuickAddStrategy
       │
       ▼
  User types: "5x10 Back Squat @225"
       │
       ├── On each keystroke:
       │     tryParse(input) → QuickAddPreview update
       │     autocomplete suggestions update
       │
       ▼
  User presses Enter
       │
       ▼
  QuickAddStrategy.handleInput(text)
       │
       ├── Parse statement
       ├── Insert into document (via editor API or content provider)
       ├── Add to statement history
       │
       ▼
  Palette closes (or stays open if Shift+Enter)
```

## Mobile Data Flow

```
User taps [+ Add] button
       │
       ▼
  MobilePalette opens (bottom sheet, full-width)
       │
       ├── Token toolbar visible above keyboard
       ├── Template chips below input
       │
       ▼
  User taps [5×10 ___] template
       │
       ▼
  Input populated: "5x10 "  (cursor at end)
       │
       ▼
  User types: "Back Squat @225"
       │
       ├── Autocomplete: "Back Squat" suggested after "Back"
       │
       ▼
  User taps [Add] or presses Enter
       │
       ▼
  Statement added to MobileWorkoutView list
```

## Accessibility

- All shortcuts have visible labels in the palette footer
- Arrow key navigation through command list and autocomplete
- Screen reader: announce parsed preview as aria-live region
- Focus trap within palette when open
- Mobile: respects system font size and reduced-motion preferences

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Palette becomes overloaded with modes | Confusing UX | Clear visual mode indicators; separate entry points per mode |
| Parser errors on partial input | Flashing/jarring preview | Debounce preview (100ms); show last valid parse during errors |
| Mobile virtual keyboard layout varies | Token bar misaligned | Position token bar with `visualViewport` API, not CSS alone |
| Exercise autocomplete DB too large | Slow suggestions | Trie-based index; limit to top 100 by frequency |
| Reorder in batch mode is fiddly on mobile | Frustrated users | Use explicit move-up/move-down buttons, not just drag |

## Open Questions

- Should the batch builder support nesting (indented sub-statements for rounds/AMRAPs)?
- Do we want a "wizard" mode for beginners that asks questions step-by-step ("How many sets? Reps? Exercise? Weight?")?
- Should the mobile view be a separate route/page or a responsive variant of the same component?
- How do we handle undo for quick-add (Ctrl+Z should remove the just-added statement)?
- Should statement history be per-document or global?
