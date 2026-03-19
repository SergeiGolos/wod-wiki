# Editor Display Elements & Decoration System

Research document mapping every display element type supported by the **UnifiedEditor** (CodeMirror 6-based) and the decorations each one applies to the text it covers.

---

## Architecture Overview

The editor is a single CodeMirror 6 (`EditorView`) instance.  
All visual treatments are driven by two complementary systems:

| System | Mechanism | What it produces |
|--------|-----------|-----------------|
| **CM6 Decorations** | `StateField` / `ViewPlugin` → `DecorationSet` | Visual changes *inside* the editor DOM (line styles, inline widgets, block widgets) |
| **React Overlay Track** | `OverlayTrack` component + `SectionGeometry` plugin | React components rendered *adjacent to* the editor, positioned with pixel geometry |

Documents are first parsed into **sections** by `section-state.ts`, which establishes a shared `SectionState` that all subsequent decoration layers consume.

---

## Section Types (the source of truth)

Defined in [src/components/Editor/extensions/section-state.ts](../src/components/Editor/extensions/section-state.ts).

| `EditorSectionType` | Triggered by | Notes |
|---------------------|-------------|-------|
| `markdown` | Plain prose lines between other blocks | Has subtypes: `heading`, `paragraph`, `list`, `blockquote`, `table`, `unknown` |
| `wod` | ` ```wod `, ` ```log `, ` ```plan ` fences | WodScript dialect code fence |
| `frontmatter` | `---` ... `---` blocks | YAML key/value blocks (YouTube, Amazon, Strava, generic) |
| `code` | Any other ` ```<lang> ` fence | Non-WOD code fence |
| `widget` | ` ```widget:<name> ` | Named interactive widget blocks |
| `embed` | `![label](url)` or `[label](url)` single-line | Images and hyperlinks on their own line |

---

## Display Elements and Their Decorations

### 1. WodScript Block (`wod` / `log` / `plan`)

**Source files:**  
- [src/components/Editor/extensions/preview-decorations.ts](../src/components/Editor/extensions/preview-decorations.ts) — card-style line decorations  
- [src/components/Editor/extensions/wod-decorations.ts](../src/components/Editor/extensions/wod-decorations.ts) — block-level highlight + inlay hints + gutter  
- [src/components/Editor/extensions/wod-results-widget.ts](../src/components/Editor/extensions/wod-results-widget.ts) — results table widget  
- [src/components/Editor/overlays/WodCompanion.tsx](../src/components/Editor/overlays/WodCompanion.tsx) — React overlay panel

#### CM6 Line Decorations (applied to every line inside the fence)

| Class | Applied to | CSS effect |
|-------|-----------|------------|
| `cm-wod-fence-open` | Opening ` ``` ` line | `font-size: 10px`, `opacity: 0.35`, rounded top corners, faint blue tint background, box-shadow (top edges of card) |
| `cm-wod-fence-close` | Closing ` ``` ` line | Same as open but rounded bottom corners + bottom shadow |
| `cm-wod-inner` | All content lines between fences | Raised card appearance: blue background tint, `padding-left: 24px`, `font-size: 14px`, continuous boxShadow on left/right edges |
| `cm-wod-block` (Tailwind) | Entire inactive block range | `bg-yellow-500/5`, `border-l-2 border-yellow-500/30` |
| `cm-wod-block-active` (Tailwind) | Entire active block range (cursor inside) | `bg-blue-500/10`, `border-l-2 border-blue-500` |

#### CM6 Widget Decorations

| Widget class | Position | Decoration type | What it renders |
|-------------|----------|-----------------|----------------|
| `WodResultsBarWidget` | After closing fence (`side: 1`, `block: true`) | `Decoration.widget` (block) | Expandable results history grid: date, time, duration, status pill (`Finished` / `Partial`), open-review button |
| Inline emoji inlay (anonymous `WidgetType`) | Before each metric token (`side: -1`) | `Decoration.widget` (inline) | Emoji prefix per metric type: ⏱️ Duration, 💪 Resistance, × Reps, 🔄 Rounds, ▶️ Action, 📏 Distance — styled `cm-wod-inlay-hint`, italic, 70% opacity |

#### Gutter Decorations

| Marker class | Gutter column | What it renders |
|-------------|--------------|----------------|
| `StartWorkoutGutterMarker` | `cm-wod-gutter` (8-unit wide) | ▶️ emoji button on the start line; click triggers `onStartWorkout` |
| `WodStartGutterMarker` | Same gutter | 🏋️ emoji at block start (informational) |

#### Overlay Companion (React, right-side panel)

`WodCompanion.tsx` renders in the `OverlayTrack` with two visual states:

| State | Trigger | Contents |
|-------|---------|---------|
| **Inactive** (~15% width strip) | Cursor outside block | Vertical column of action buttons (Run ▶, Plan, History); collapsed latest-result line |
| **Active** (~35% width panel) | Cursor inside block | Latest result summary; per-statement metric chips (colour-coded by type); result history with action buttons |

**Metric chip colours:**

| `MetricType` | Label | Icon | Background |
|-------------|-------|------|-----------|
| `Duration` | Timer | ⏱ | `bg-blue-500/10 text-blue-600` |
| `Rep` | Reps | ✕ | `bg-orange-500/10 text-orange-600` |
| `Effort` | Exercise | 🏋 | `bg-green-500/10 text-green-600` |
| `Rounds` | Rounds | ↻ | `bg-purple-500/10 text-purple-600` |
| `Distance` | Distance | 📏 | `bg-teal-500/10 text-teal-600` |

---

### 2. Frontmatter Block (`frontmatter`)

**Source files:**  
- [src/components/Editor/extensions/frontmatter-preview.ts](../src/components/Editor/extensions/frontmatter-preview.ts) — padding + Amazon replacement  
- [src/components/Editor/overlays/FrontmatterCompanion.tsx](../src/components/Editor/overlays/FrontmatterCompanion.tsx) — React overlay

#### Subtypes detected from YAML `type:` or URL patterns

| Subtype | Detection | Companion rendered |
|---------|-----------|-------------------|
| `youtube` | `type: youtube` or `youtu.be` / `youtube.com` URL | Embedded YouTube iframe player |
| `amazon` | `type: amazon` or `amazon.com` / `amzn.to` URL | `AmazonPreviewWidget` inline (see below) |
| `strava` | `type: strava` or `strava.com` URL | Placeholder (overlay slot reserved) |
| `default` | Everything else | Generic overlay slot |

#### CM6 Decorations

| Decoration | Condition | Effect |
|-----------|-----------|--------|
| `Decoration.line` with `padding-top` / `padding-bottom` | YouTube (and non-Amazon) sections needing height expansion | Expands CM6's measured line height to match the desired companion panel height (default 315 px for YouTube); split equally top/bottom on the first and last YAML content lines |
| `Decoration.replace` (`block: true`) wrapping full section | Amazon, cursor **outside** section | Entire `---` block replaced by `AmazonPreviewWidget` DOM |

#### `AmazonPreviewWidget` (inline replacement widget)

CSS classes produced:

| Class | Element |
|-------|---------|
| `cm-amazon-preview` | Outer wrapper (`max-width: 560px`) |
| `cm-amazon-link` | Full-block anchor tag |
| `cm-amazon-card` | Flex card container |
| `cm-amazon-image` | Product image container |
| `cm-amazon-info` | Text info column |
| `cm-amazon-title-row` | Title + cart icon row |
| `cm-amazon-title` | Product title |
| `cm-amazon-cart-icon` | 🛒 emoji |
| `cm-amazon-desc` | Description paragraph |
| `cm-amazon-price-row` | Price / CTA row |
| `cm-amazon-sale-price` | Sale price (prominent) |
| `cm-amazon-orig-price` | Original (struck-out) price |
| `cm-amazon-deal-badge` | 🏷️ Deal badge |
| `cm-amazon-price` | Regular price |
| `cm-amazon-buy` | "Buy on Amazon →" CTA text |

---

### 3. Embed Section (`embed`)

**Source file:** [src/components/Editor/extensions/embed-preview.ts](../src/components/Editor/extensions/embed-preview.ts)

Single-line image or hyperlink on its own line (`![…](url)` / `[…](url)`).

#### CM6 Decorations

| Widget class | Decoration type | Height | Purpose |
|-------------|-----------------|--------|---------|
| `EmbedSpacerWidget` | `Decoration.widget` (`block: true`, `side: -1`) | YouTube: 240 px; Image: 200 px; Link: 180 px | Transparent block widget that physically expands the line height so the `OverlayTrack` slot receives the correct geometry |

The spacer has `pointer-events: none` and class `cm-embed-spacer`. No visual content is produced by this CM6 widget — the visual is entirely owned by `FrontmatterCompanion` rendered by the React overlay.

---

### 4. Markdown Table (`table` subtype of `markdown`)

**Source file:** [src/components/Editor/extensions/markdown-tables.ts](../src/components/Editor/extensions/markdown-tables.ts)

#### CM6 Decorations

| Widget class | Condition | Decoration type | What it renders |
|-------------|-----------|-----------------|----------------|
| `MarkdownTableWidget` | Cursor **outside** the table section | `Decoration.replace` (`block: true`) over the full table range | Rendered HTML `<table>` with `<thead>` / `<tbody>`, aligned columns per separator syntax (`:---:` = center, `---:` = right), class `cm-md-table-preview` |

The raw markdown is restored as soon as the cursor enters the replaced range (same pattern as frontmatter).

---

### 5. Widget Block (`widget`)

**Source files:**  
- [src/components/Editor/overlays/WidgetCompanion.tsx](../src/components/Editor/overlays/WidgetCompanion.tsx) — React companion  
- [src/components/Editor/widgets/HeroCarousel.tsx](../src/components/Editor/widgets/HeroCarousel.tsx) — built-in widget

Fence syntax: ` ```widget:<name> `.

#### CM6 Decorations

None — no inline CM6 decorations are applied. The block is identified as a section and handed off entirely to the React overlay system.

#### Overlay companion (`WidgetCompanion`)

Looks up `<name>` in a `WidgetRegistry` (a `Map<string, React.ComponentType<WidgetProps>>`). Built-in widgets:

| Widget name | Component | Description |
|-------------|-----------|-------------|
| `hero` | `HeroCarousel` | Auto-advancing card carousel with title, subtitle, body, badge, CTA. Config: `{ cards: [...], intervalMs }` |

Unregistered widgets show: `widget:<name> — not registered` in a muted container.

---

### 6. Generic Code Block (`code`)

**Source:** `section-state.ts` (type `"code"`, `language` field set to the fence tag).

Currently no bespoke CM6 decorations are applied. A slot is reserved in the `OverlayTrack` with dimensions:

| State | Height |
|-------|--------|
| Inactive | 60 px |
| Active | 140 px |

---

### 7. Unified Gutter Column

**Source file:** [src/components/Editor/extensions/gutter-unified.ts](../src/components/Editor/extensions/gutter-unified.ts)

Replaces both `lintGutter()` and any separate runtime highlight gutter. Single column class: `cm-gutter-unified`.

#### Marker types (priority: runtime > error > warning > info)

| `MarkerKind` | Class | Visual | Trigger |
|-------------|-------|--------|---------|
| `runtime` | `cm-unified-marker-runtime` | Green pulsing bar, title "⚡ Executing" | Line appears in the runtime highlight set (`setGutterHighlights` effect) |
| `error` | `cm-unified-marker-error` | Red bar | `@codemirror/lint` diagnostic with `severity: "error"` |
| `warning` | `cm-unified-marker-warning` | Amber bar | `@codemirror/lint` diagnostic with `severity: "warning"` |
| `info` | `cm-unified-marker-info` | Blue bar | `@codemirror/lint` diagnostic with `severity: "info"` |

---

### 8. WodScript Linter (diagnostic underlines)

**Source file:** [src/components/Editor/extensions/wod-linter.ts](../src/components/Editor/extensions/wod-linter.ts)

Runs the Lezer-based WodScript parser on the content of every `wod` section, extracting `⚠ Error` nodes from the Lezer syntax tree.

| Element | Description |
|---------|-------------|
| Diagnostic severity | `"error"` |
| Underline | Standard `@codemirror/lint` red wavy underline on the offending token range (capped at 50 chars) |
| Message | "Syntax error in WodScript" |
| Debounce | 500 ms |

The linter feeds results back into the unified gutter column (see §7).

---

### 9. Active Line & Selection Highlights (global)

Configured in [src/components/Editor/extensions/theme.ts](../src/components/Editor/extensions/theme.ts).

| Element | Light theme | Dark theme |
|---------|------------|------------|
| `.cm-activeLine` | `rgba(129,140,248,0.08)` | `rgba(165,180,252,0.08)` |
| `.cm-activeLineGutter` | Same as active line | Same |
| `.cm-selectionBackground` (focused) | `rgba(129,140,248,0.35)` | `rgba(165,180,252,0.3)` |
| `.cm-selectionBackground` (blur) | `rgba(30,100,230,0.25)` | `rgba(100,160,255,0.20)` |
| `::selection` | `rgba(30,100,230,0.50)` | `rgba(100,160,255,0.35)` |

Dark mode applies `oneDark` as a base theme, with the above rules taking precedence (loaded after).

---

### 10. Runtime Panel Spacer (inline runtime)

**Source file:** [src/components/Editor/extensions/runtime-panel-state.ts](../src/components/Editor/extensions/runtime-panel-state.ts)

When the user clicks **Run** on a WOD block and `enableInlineRuntime` is true, a block-widget spacer is inserted **below** the closing fence of the section.

| Widget class | Decoration type | Height | CSS |
|-------------|-----------------|--------|-----|
| `RuntimeSpacerWidget` | `Decoration.widget` (`block: true`) | 500 px (normal) / 600 px (expanded) | `cm-runtime-panel-spacer`, `position: relative`, `overflow: hidden`, `pointer-events: auto` |

React portals (`RuntimePortalManager`) inject the full `TimerScreen` UI into the spacer DOM via `data-runtime-section-id` attribute matching.

---

### 11. Link Interaction (hover tooltip + ctrl+click)

**Source file:** [src/components/Editor/extensions/link-open.ts](../src/components/Editor/extensions/link-open.ts)

Detects `[label](url)` and `<url>` autolinks via the Lezer Markdown syntax tree.

| Element | Implementation | CSS class |
|---------|---------------|-----------|
| Hover tooltip | `hoverTooltip()` (300 ms delay) | `cm-link-tooltip px-2 py-1 text-[11px] …` (Tailwind) — shows "Ctrl+Click to open link" with a `<kbd>` badge |
| Ctrl+Click | `ViewPlugin` DOM event handler | No visual decoration; opens `https://` / `wod:` URLs in a new tab or via `WorkbenchEventBus` |

---

### 12. Smart Increment (scroll-on-number)

**Source file:** [src/components/Editor/extensions/smart-increment.ts](../src/components/Editor/extensions/smart-increment.ts)

Not a visual decoration, but a behavioural extension: pressing `↑`/`↓` (or scroll-wheel) on a time-format token (`MM:SS`, `H:MM:SS`, etc.) increments/decrements the digit component under the cursor with overflow propagation.

---

### 13. Autocomplete Dropdowns

**Source file:** [src/components/Editor/extensions/wod-autocomplete.ts](../src/components/Editor/extensions/wod-autocomplete.ts)

Standard `@codemirror/autocomplete` popups — no custom decoration classes.

| Completion source | Trigger | Options |
|------------------|---------|---------|
| `dialectCompletion` | Typing ` ``` ` at line start inside a markdown section | `wod`, `log`, `plan` with snippet templates |
| `embedCompletion` | Typing `---` at line start inside a markdown section | `youtube`, `strava`, `amazon`, `file` YAML snippet templates |

Keyboard shortcut `Mod-Shift-W` wraps the current selection (or inserts an empty fence) in a ` ```wod ` block.

---

## Decoration Layer Interaction Map

```
Document text
  │
  ├─ section-state (StateField) ────────────────────────────────────┐
  │    Parses sections: wod / frontmatter / code / widget / embed   │
  │                                                                  ▼
  ├─ preview-decorations ──── cm-wod-fence-open/close/inner (line deco)
  ├─ wod-decorations ─────── cm-wod-block[-active] (line), inlay emoji (widget), wod gutter
  ├─ wod-results-widget ──── WodResultsBarWidget below closing fence (block widget)
  ├─ frontmatter-preview ─── padding line decos + AmazonPreviewWidget (replace)
  ├─ embed-preview ────────── EmbedSpacerWidget (block widget, invisible)
  ├─ markdown-tables ─────── MarkdownTableWidget (replace block widget)
  ├─ wod-linter ──────────── lint diagnostics → wavy underlines
  ├─ gutter-unified ──────── runtime/error/warning/info bar markers
  ├─ runtime-panel-state ─── RuntimeSpacerWidget below section (block widget)
  └─ theme ────────────────── activeLine, selection, gutter colours
  
  React (OverlayTrack, positioned via section-geometry)
    ├─ wod sections ──────── WodCompanion (action strip / metric panel)
    ├─ frontmatter sections ─ FrontmatterCompanion (YouTube iframe / Amazon / Strava)
    ├─ embed sections ─────── FrontmatterCompanion (image/link overlay)
    ├─ widget sections ─────── WidgetCompanion → WidgetRegistry lookup
    └─ inline runtime ──────── RuntimePortalManager → TimerScreen
```

---

## Key Design Principles

1. **Cursor-gated previews** — Amazon replacement, markdown table widgets, and (via keyboard-skip) WOD blocks: the raw text is visible and editable when the cursor is inside; the preview widget replaces it when the cursor is outside.

2. **Height-based companion alignment** — Embed spacers and frontmatter padding inflate CM6's measured line block heights so that `SectionGeometry` can report accurate pixel rectangles, allowing the React `OverlayTrack` to position companion panels precisely without any manual offset math.

3. **Unified gutter** — A single gutter column (`cm-gutter-unified`) consolidates lint severity and runtime execution markers with a clear priority ordering, avoiding conflicting gutter columns from separate extensions.

4. **Section identity stability** — `section-state` uses deterministic content hashes for section IDs and carries them forward across transactions to prevent companion panels from unmounting/remounting on minor edits.
