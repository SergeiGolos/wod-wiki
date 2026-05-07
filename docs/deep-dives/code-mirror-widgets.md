# CodeMirror 6 Widget & Modification System

The editor (`NoteEditor.tsx`) is a **single CodeMirror 6 instance** processing a mixed Markdown + WhiteboardScript document. This document separates the extensions into two domains:

- **WhiteboardScript-specific** — extensions that only apply inside `` ```wod `` fenced blocks and the workout runtime lifecycle.
- **Generic Markdown / Editor** — extensions that apply to prose, frontmatter, embeds, tables, and general editor behavior.

Both domains sit on top of two shared foundations: [`section-state.ts`](../src/components/Editor/extensions/section-state.ts) (classifies every document region) and [`section-geometry.ts`](../src/components/Editor/extensions/section-geometry.ts) (measures pixel positions for overlays).

---

## WhiteboardScript-Specific Extensions

These extensions only activate inside `` ```wod `` / `` ```log `` / `` ```plan `` fenced blocks (identified by `section.type === "wod"` in section state).

### Block Styling

| File | Decoration | Target | Behavior |
|------|-----------|--------|----------|
| `preview-decorations.ts` | `Decoration.line` | WOD block lines | **Fence lines** (`cm-wod-fence-open/close`): faded, rounded corners, card shadow. **Inner lines** (`cm-wod-inner`): monospace font, 24px indent, card background. Dark mode variants included. |

### Metric Visualization

| File | Decoration | Target | Behavior |
|------|-----------|--------|----------|
| `cursor-focus-panel.ts` | `Decoration.mark` | Metric tokens in ALL WOD sections | Colored underlines per metric type (duration, rep, effort, rounds, distance, resistance, action). **Cursor line** = full opacity; **other lines** = 20% dim. Uses CSS variables from the theme. |

### Unified Gutter — Runtime Highlighting

| File | Marker Kind | Behavior |
|------|------------|----------|
| `gutter-unified.ts` | `runtime` | Green pulsing bar (6px width) on lines currently executing during a workout. Set via `dispatchGutterHighlights(view, lineNumbers)`. Priority: runtime > error > warning > info. |

### Bottom Feedback Panel

| File | Panel Type | Trigger | Behavior |
|------|-----------|---------|----------|
| `cursor-focus-panel.ts` | `showPanel` (bottom) | Cursor inside a WOD block | Shows metric labels for the current line (Timer, Reps, Exercise…) with the focused metric highlighted in color. Includes keyboard shortcut hints (`Ctrl+↑↓ adjust`, `Ctrl+←→ jump metric`). |

### Workout Results

| File | Widget | Trigger | Behavior |
|------|--------|---------|----------|
| `wod-results-widget.ts` | `WodResultsBarWidget` (block) | After closing fence of WOD blocks with stored results | Renders a results list with formatted duration, date, and time. Rows are clickable — they fire `WOD_RESULT_CLICK_EVENT` (a `CustomEvent`) on the editor DOM for the host to open review overlays. Data is pushed via `updateSectionResults` StateEffect. |

### Runtime Execution

| File | Widget | Trigger | Behavior |
|------|--------|---------|----------|
| `runtime-panel-state.ts` | `RuntimeSpacerWidget` (block) | When a WOD block is executed (Run button) | Block spacer (500px collapsed / 600px expanded) injected after the closing fence via `addRuntimePanel` effect. The element carries `data-runtime-section-id` so `RuntimePortalManager` can mount the `TimerScreen` React UI into it via portals. Controlled by `dispatchAddRuntimePanel`, `dispatchRemoveRuntimePanel`, `dispatchExpandRuntimePanel`. |

### WOD-Specific Keymaps

| File | Binding | Behavior |
|------|---------|----------|
| `cursor-focus-panel.ts` | `Ctrl+←` / `Ctrl+→` | Jump cursor between metric tokens on the current WOD line. Builds a flat position list across all statements in the section so jumps cross statement boundaries. Replaces default word-jump inside WOD content. |
| `smart-increment.ts` | `Ctrl+↑` / `Ctrl+↓` (also `Cmd`) | Increment/decrement the time value under the cursor (MM:SS, HH:MM:SS, D:HH:MM:SS) with overflow/underflow handling across segments. |

### WOD Linting & Autocomplete

| File | Type | Behavior |
|------|------|----------|
| `wod-linter.ts` | Lint source | Provides diagnostics for WhiteboardScript syntax errors. Read by the unified gutter (`gutter-unified.ts`). |
| `wod-autocomplete.ts` | Autocompletion | Code completions for WOD dialect keywords inside fenced blocks. Includes a custom editor keymap (`wodEditorKeymap`). |

### Overlay Companions (React, positioned by section-geometry)

These are React components rendered alongside the editor by the `OverlayTrack` system, not CM6 widgets.

| File | Section Type | Content |
|------|-------------|---------|
| `overlays/WodCompanion.tsx` | `wod` | Command buttons (Run, Playground, Plan), workout results display, inline timer integration. Reads overlay actions from `wod-overlay.ts`. |
| `overlays/RuntimePortalManager.tsx` | `wod` (runtime) | Bridges React `<TimerScreen>` into the `RuntimeSpacerWidget` DOM via `createPortal`. |
| `overlays/FullscreenTimer.tsx` | (overlay) | Full-screen timer panel for workout execution. Auto-start support for Chromecast. |
| `overlays/FullscreenReview.tsx` | (overlay) | Full-screen review of completed workout segments and analytics. |
| `overlays/InlineCommandBar.tsx` | (overlay) | Command bar shown when the overlay track is disabled. |

---

## Generic Markdown / Editor Extensions

These extensions process standard Markdown syntax, frontmatter, embeds, or provide general editor infrastructure. They do not depend on WhiteboardScript.

### Section Foundation (shared by both domains)

| File | Type | Behavior |
|------|------|----------|
| `section-state.ts` | `StateField` | Core document parser — classifies every region as `markdown`, `wod`, `frontmatter`, `code`, `widget`, or `embed`. Markdown sections get subtypes (`heading`, `paragraph`, `list`, `blockquote`, `table`). Generates stable hash-based IDs that survive edits. Single-line embeds (`![alt](url)`) are detected as type `embed`. All other extensions read from this field. |
| `section-geometry.ts` | `ViewPlugin` | Measures pixel top/height for every section using `lineBlockAt()`. Debounces notifications via `requestAnimationFrame`. Feeds the `OverlayTrack` positioning system. |

### Markdown Block Replacement Widgets

These replace visual ranges with rich widgets when the cursor is outside.

| File | Widget | Trigger | Behavior |
|------|--------|---------|----------|
| `markdown-tables.ts` | `MarkdownTableWidget` | Consecutive `\| cell \|` lines (header + separator + rows) | Renders as an HTML `<table>` with column alignment, inline markdown parsing (bold, italic, strikethrough, code, links), and clickable cells that move the cursor into the source. Cursor inside collapses back to raw markdown. |
| `frontmatter-preview.ts` | `AmazonPreviewWidget` | Frontmatter (`---`) with `type: amazon` or amazon URLs | Replaces with a product card: image, title, description, price/sale price, deal badge, "Buy on Amazon →" link. Hover effects. Dark mode variants. |
| `frontmatter-preview.ts` | (line decorations) | YouTube / height-specified frontmatter | Adds `padding-top`/`padding-bottom` to content lines to expand visual height to match the companion overlay (default 315px for YouTube). |

### Markdown Syntax Hiding

| File | Decoration | Target | Behavior |
|------|-----------|--------|----------|
| `markdown-syntax-hiding.ts` | `Decoration.replace({})` | Markdown prose sections | When cursor is NOT on the line, hides: `# ` heading prefixes, `**` bold markers, `*`/`_` italic markers, `[label](url)` link brackets/parens. Text content remains visible with syntax highlighting styles. Bold/italic/link ranges are tracked to avoid overlapping replacements. |

### Inline Widgets

| File | Widget | Trigger | Behavior |
|------|--------|---------|----------|
| `inline-button-decoration.ts` | `InlineButtonWidget` | `[Label]{.button key=val}` syntax | Replaces with a styled `<button>` (primary/secondary/ghost). Supports `route`, `action`, `name`, `variant` attributes. Fires `onButtonAction(action, params)` on click. |
| `embed-preview.ts` | `EmbedSpacerWidget` (block) | Single-line `![alt](url)` or `[label](url)` | Transparent block spacer (180px default, 240px for YouTube, 200px for images) that stretches line height so the overlay companion has room. Text remains visible behind. |

### Generic Block Widget System

| File | Widget | Trigger | Behavior |
|------|--------|---------|----------|
| `widget-block-preview.tsx` | `ReactWidgetBlock` | `` ```widget:<name> … ``` `` fenced blocks | Generic system: replaces the fenced block with a React component from a `WidgetRegistry`. Mounts via `createRoot`, passes `config` (parsed JSON), `rawContent`, and `sectionId`. Falls back to "not registered" placeholder. Arrow-key navigation intercepts let the cursor enter replaced blocks. |
| `overlays/WidgetCompanion.tsx` | (React overlay) | `widget` sections | Overlay companion that renders the same registered widget in the side panel. Reads raw content and parses JSON config from the editor state. |
| `widgets/HeroCarousel.tsx` | Registered as `hero` | `` ```widget:hero `` blocks | Auto-advancing card carousel (title, subtitle, body, badge, CTA, dot indicators). Configured via JSON: `{"intervalMs": 5000, "cards": [...]}`. |

### Line Decorations (generic)

| File | Decoration | Target | Behavior |
|------|-----------|--------|----------|
| `line-ids.ts` | `Decoration.line` with `id` attr | Heading lines and WOD opening fences | Adds DOM `id` attributes (`my-heading`, `wod-line-5`) for IntersectionObserver scroll tracking and external navigation. Processes full document but only decorates viewport lines for performance. |

### Link Handling

| File | Type | Behavior |
|------|------|----------|
| `link-open.ts` | `hoverTooltip` + `ViewPlugin` + `domEventHandlers` | Hover: shows "Ctrl+Click to open link" tooltip. Ctrl+Click: opens URL in new tab (supports `wod:` internal scheme). Cursor changes to pointer on Ctrl+hover. Uses Lezer syntax tree to detect `URL`/`Autolink` nodes. |

### Generic Keymaps (block navigation)

These intercept arrow keys to allow the cursor to enter blocks that are currently replaced by widgets (Decoration.replace makes ranges invisible to default navigation).

| File | Binding | Target |
|------|---------|--------|
| `widget-block-preview.tsx` | `ArrowUp` / `ArrowDown` | `` ```widget: `` blocks |
| `markdown-tables.ts` | `ArrowUp` / `ArrowDown` | Markdown table blocks |
| `frontmatter-preview.ts` | `ArrowUp` / `ArrowDown` | Amazon frontmatter blocks |

### Unified Gutter — Diagnostics

| File | Marker Kind | Behavior |
|------|------------|----------|
| `gutter-unified.ts` | `error` / `warning` / `info` | 6px gutter column showing lint severity from `@codemirror/lint` diagnostics. Red for errors, amber for warnings, blue for info. Uses `forEachDiagnostic` to collect per-line severity. |

### Editor Theme & Chrome

| File | Type | Behavior |
|------|------|----------|
| `theme.ts` | `EditorView.theme` + `oneDark` | Font (Monaco/Menlo), 14px size, 22px line height, semi-transparent active line and selection (so both layers remain visible). Dark mode uses `oneDark` with overrides. Gutter styling, scroller, content padding. |

### Overlay Companions (generic)

| File | Section Type | Content |
|------|-------------|---------|
| `overlays/FrontmatterCompanion.tsx` | `frontmatter` / `embed` | YouTube embed, Strava embed, and other metadata-driven companions. |
| `overlays/EditorCastBridge.tsx` | (bridge) | Connects Chromecast selection to the inline runtime system. |
| `overlays/OverlayTrack.tsx` | (infrastructure) | Positions companion panels at the correct vertical offset/height using geometry from `section-geometry.ts`. Manages active section, width policy, sticky offsets. |

---

## Architecture Diagram

```
Document (Markdown + WhiteboardScript)
  │
  ├─ section-state.ts ──── classifies regions
  │   ├─ markdown (heading, paragraph, list, blockquote, table)
  │   ├─ wod (dialects: wod, log, plan)
  │   ├─ frontmatter (subtypes: youtube, amazon, strava)
  │   ├─ widget (```widget:<name>```)
  │   ├─ embed (single-line ![alt](url) or [label](url))
  │   └─ code (generic ```lang```)
  │
  ├─ section-geometry.ts ──── measures pixel rects for overlays
  │
  ├─ WHITEBOARDSCRIPT DOMAIN
  │   │
  │   ├─ Block Styling
  │   │   └─ Card-style fence + inner line decorations (preview-decorations)
  │   │
  │   ├─ Metric Visualization
  │   │   └─ Colored underlines per metric type (cursor-focus-panel)
  │   │
  │   ├─ Gutter
  │   │   └─ Runtime highlight bar (gutter-unified)
  │   │
  │   ├─ Feedback
  │   │   └─ Bottom panel: metric labels + shortcut hints (cursor-focus-panel)
  │   │
  │   ├─ Results
  │   │   └─ Results bar widget after closing fence (wod-results-widget)
  │   │
  │   ├─ Runtime
  │   │   └─ Panel spacer → TimerScreen portal (runtime-panel-state)
  │   │
  │   ├─ Keymaps
  │   │   ├─ Ctrl+←→ jump between metrics (cursor-focus-panel)
  │   │   └─ Ctrl+↑↓ smart time increment (smart-increment)
  │   │
  │   ├─ Linting + Autocomplete
  │   │   ├─ Syntax diagnostics (wod-linter)
  │   │   └─ Keyword completions (wod-autocomplete)
  │   │
  │   └─ Overlays
  │       ├─ WodCompanion (commands, results)
  │       ├─ RuntimePortalManager (timer portal)
  │       ├─ FullscreenTimer
  │       ├─ FullscreenReview
  │       └─ InlineCommandBar
  │
  └─ GENERIC MARKDOWN / EDITOR DOMAIN
      │
      ├─ Block Widgets
      │   ├─ Markdown tables → HTML table (markdown-tables)
      │   ├─ Amazon frontmatter → product card (frontmatter-preview)
      │   ├─ Frontmatter height padding for overlays (frontmatter-preview)
      │   └─ ```widget:<name>``` → React component (widget-block-preview)
      │
      ├─ Inline Widgets
      │   ├─ [Label]{.button} → <button> (inline-button-decoration)
      │   └─ Embed line-height spacers (embed-preview)
      │
      ├─ Syntax Hiding
      │   └─ Hide #, **, *, _, link syntax off-cursor (markdown-syntax-hiding)
      │
      ├─ Line Decorations
      │   └─ DOM id attributes for scroll tracking (line-ids)
      │
      ├─ Links
      │   └─ Hover tooltip + Ctrl+Click opening (link-open)
      │
      ├─ Gutter
      │   └─ Diagnostic bars: error/warning/info (gutter-unified)
      │
      ├─ Block Navigation Keymaps
      │   ├─ Arrow keys into widget blocks (widget-block-preview)
      │   ├─ Arrow keys into table blocks (markdown-tables)
      │   └─ Arrow keys into frontmatter blocks (frontmatter-preview)
      │
      ├─ Theme
      │   └─ Font, colors, dark mode (theme.ts)
      │
      └─ Overlays
          ├─ FrontmatterCompanion (YouTube, Strava)
          ├─ WidgetCompanion (generic widget side panel)
          └─ OverlayTrack (positioning infrastructure)
```

---

## File Reference

```
src/components/Editor/
├── NoteEditor.tsx                          # Main editor — wires all extensions together
│
├── extensions/
│   │
│   │── SHARED FOUNDATION
│   ├── section-state.ts                    # Section parser (classifies all document regions)
│   ├── section-geometry.ts                 # Pixel geometry measurement for overlays
│   │
│   │── WHITEBOARDSCRIPT
│   ├── preview-decorations.ts              # WOD block card-style line decorations
│   ├── cursor-focus-panel.ts               # Metric underlines + bottom panel + Ctrl+←→
│   ├── wod-results-widget.ts               # Results bar after WOD blocks
│   ├── runtime-panel-state.ts              # Runtime panel spacer + portal bridge
│   ├── smart-increment.ts                  # Ctrl+↑↓ time value increment
│   ├── wod-linter.ts                       # WhiteboardScript lint diagnostics
│   ├── wod-autocomplete.ts                 # WOD dialect autocompletion
│   ├── wod-overlay.ts                      # Overlay action registry
│   │
│   │── GENERIC MARKDOWN / EDITOR
│   ├── markdown-tables.ts                  # HTML table replacement widget
│   ├── markdown-syntax-hiding.ts           # Hide #, **, *, _, link syntax
│   ├── frontmatter-preview.ts              # Amazon widget + height padding
│   ├── widget-block-preview.tsx            # Generic React widget block replacement
│   ├── inline-button-decoration.ts         # [Label]{.button} → <button>
│   ├── embed-preview.ts                    # Embed line-height spacers
│   ├── link-open.ts                        # Link tooltip + Ctrl+Click
│   ├── gutter-unified.ts                   # Unified gutter (runtime + diagnostics)
│   ├── line-ids.ts                         # DOM id attributes for scroll tracking
│   ├── theme.ts                            # Editor chrome theme + dark mode
│   └── index.ts                            # Re-exports public extensions
│
├── overlays/
│   ├── OverlayTrack.tsx                    # Positions companions by section geometry
│   ├── WodCompanion.tsx                    # WOD block companion (commands, timer)
│   ├── FrontmatterCompanion.tsx            # Frontmatter/embed companion
│   ├── WidgetCompanion.tsx                 # Generic widget companion
│   ├── RuntimePortalManager.tsx            # React portal → runtime spacer widgets
│   ├── FullscreenTimer.tsx                 # Full-screen timer overlay
│   ├── FullscreenReview.tsx                # Full-screen review overlay
│   ├── InlineCommandBar.tsx                # Command bar (overlay disabled mode)
│   └── EditorCastBridge.tsx                # Chromecast integration bridge
│
├── widgets/
│   └── HeroCarousel.tsx                    # "hero" widget component
│
└── types/
    └── index.ts                            # WodBlock and related types
```
