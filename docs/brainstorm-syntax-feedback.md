# Feature: Better Syntax Feedback — Inline Metric Display & Error Reporting

**Brainstorm Date:** March 20, 2026
**Status:** Draft
**Issue:** Replace overlay-based syntax feedback with hover popovers and cursor-focus inline panels

---

## 1. Requirement Analysis

- **Core Problem**: The current WOD block companion display (`WodCompanion.tsx` rendered via `OverlayTrack.tsx`) uses an overlay panel positioned beside the editor content. This approach has several limitations: (1) the overlay occupies significant horizontal space (up to 35% of the editor width when active), which severely impacts the phone/mobile editing experience where width is limited; (2) the overlay shows information for the entire block rather than contextually for the line the user is interacting with; (3) the sticky strip + hover card paradigm requires the user to move focus away from their editing position to interact with metric details and commands.

  The issue proposes replacing this with two distinct interaction modes:
  - **Hover mode**: A lightweight popover tied to the mouse cursor that shows minimal metric information for the hovered line (e.g., which metric types were parsed — duration, reps, resistance). The popover follows the mouse and updates when the cursor crosses to a new line.
  - **Cursor-focus mode**: When the cursor is focused on a line, inject an inline panel *between* the current line and the next line. This panel shows detailed metric breakdowns with color-coded highlights, underlines on the cursor line matching metric colors, and support for action buttons (e.g., increment/decrement numeric values with Ctrl+Up/Ctrl+Down).

  Additionally, parser errors should be displayed inline under the offending line with a squiggly underline over the error-causing tokens, rather than in a separate error panel.

- **Success Criteria**:
  - Hover over any WOD line shows a compact popover identifying the parsed metrics (type + value) for that specific line.
  - Popover follows the mouse and updates when crossing line boundaries.
  - Cursor focus on a WOD line injects an inline panel below the line showing detailed metric breakdowns.
  - Each metric in the inline panel has a matching colored underline on the source line.
  - The inline panel supports action buttons and instructional text (generic command slot system).
  - Parser errors display inline under the error line with squiggly underlines.
  - Mobile experience is significantly improved — no horizontal space consumed by overlays.
  - Desktop experience retains full metric visibility with less visual noise.

- **Scope**: Architectural brainstorm — no code changes. Produce analysis document and visual canvas.

- **User Impact**: All users benefit from context-aware metric feedback directly at the editing position. Mobile users gain full-width editing with inline feedback. Desktop users get cleaner visual feedback without large overlay panels. The generic command slot system enables future editing enhancements (numeric adjustment, metric type switching, comment insertion) without architectural changes.

### Summary

The current overlay system (`OverlayTrack` + `WodCompanion`) renders a side panel that consumes horizontal space and shows block-level information. This brainstorm proposes replacing it with two line-level feedback mechanisms — a mouse-tracking hover popover for quick metric identification and a cursor-focus inline panel for detailed interaction — both leveraging CodeMirror 6's decoration and widget systems. Error feedback moves inline using CM6's diagnostic infrastructure with squiggly underline decorations.

---

## 2. Code Exploration

### Relevant Files

| File | Role |
|------|------|
| `src/components/Editor/overlays/OverlayTrack.tsx` | Main overlay positioning system — scroll-synced absolute positioning, mousemove hover tracking, section geometry subscription |
| `src/components/Editor/overlays/WodCompanion.tsx` | WOD block companion panel — parses block content, renders metric chips, line execution history, command buttons |
| `src/components/Editor/overlays/WodCommand.ts` | Command interface for WOD block actions (Run, Playground, Plan) |
| `src/components/Editor/overlays/useOverlayWidthState.ts` | Width policy for overlay panels (15% inactive, 35% active) |
| `src/components/Editor/overlays/OverlayWidthPolicy.ts` | Width allocation logic for overlay panels |
| `src/components/Editor/extensions/wod-overlay.ts` | Action registry for overlay commands |
| `src/components/Editor/extensions/wod-decorations.ts` | Line decorations, gutter markers (▶️), inline metric emoji hints (⏱️ ⚖️ × ↻ 📏) |
| `src/components/Editor/extensions/section-state.ts` | Parses document into sections (markdown, wod, code, widget) with cursor tracking |
| `src/components/Editor/extensions/section-geometry.ts` | Measures pixel rectangles for sections, feeds OverlayTrack via listener subscription |
| `src/components/Editor/NoteEditor.tsx` | Main editor component — orchestrates all extensions and overlay rendering |
| `src/components/Editor/hooks/useWodBlockResults.ts` | Fetches workout results for a WOD section |
| `src/components/Editor/hooks/useWodLineResults.ts` | Extracts per-line execution history from results |
| `src/parser/timer.parser.ts` | Chevrotain parser for WOD syntax |
| `src/parser/timer.visitor.ts` | AST visitor that produces `CodeStatement` nodes with metrics |
| `src/core/models/Metric.ts` | `IMetric`, `MetricType` enum (25 types), `MetricOrigin` |
| `src/core/models/CodeStatement.ts` | Carries `metrics: IMetric[]` and `semanticHints: string[]` from parsing |

### Similar Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| **Inline metric emoji hints** | `wod-decorations.ts` | Already renders per-line metric icons as inlay hints (⏱️=Duration, ⚖️=Resistance, ×=Rep, etc.). This is the closest existing line-level metric display. |
| **WodCompanion metric chips** | `WodCompanion.tsx` | Renders colored metric badges with emoji + value. This presentation style could be adapted for the inline panel. |
| **Section geometry tracking** | `section-geometry.ts` | Measures pixel positions per section. Similar measurement would be needed per-line for inline widgets. |
| **CM6 Tooltip system** | CodeMirror `@codemirror/view` | Built-in tooltip infrastructure with hover providers (`hoverTooltip`) and cursor tooltips. Native support for mouse-tracking popovers. |
| **CM6 Widget decorations** | CodeMirror `@codemirror/view` | `WidgetType` class for rendering arbitrary DOM into the editor. Can be placed as block widgets between lines. |
| **CM6 Diagnostic system** | CodeMirror `@codemirror/lint` | Built-in linting infrastructure with squiggly underlines, gutter markers, and tooltip-based error display. |
| **StartWorkoutGutterMarker** | `wod-decorations.ts` | Custom `GutterMarker` subclass rendering a play button. Demonstrates custom gutter element pattern. |
| **Preview decorations** | `preview-decorations.ts` | Card-style visual distinction for WOD blocks with background tinting and accent borders. Demonstrates extensive line decoration styling. |

### Key Patterns

| Pattern | How It Applies |
|---------|---------------|
| **CM6 `hoverTooltip`** | The hover popover maps directly to CM6's `hoverTooltip` extension. It provides a callback that receives the editor position under the mouse and returns a tooltip with arbitrary DOM content. Position tracking and line-crossing detection are handled by the framework. |
| **CM6 `WidgetType` + block decorations** | The cursor-focus inline panel maps to CM6's block widget decoration. A `WidgetType` subclass renders a React portal between lines. The decoration is placed at the end of the active line and displayed as a block-level element below it. |
| **CM6 `Decoration.mark()`** | Colored underlines on the cursor line map to mark decorations with CSS classes. Each metric type gets a mark decoration spanning its parsed token range, styled with a colored bottom border. |
| **CM6 `StateField` + `EditorView.decorations`** | All three features (hover, inline panel, underlines) are implemented as CM6 extensions using `StateField` to track cursor position and `EditorView.decorations` to provide the visual output. |
| **Action slot pattern** | The generic command system (Ctrl+Up/Down for value adjustment) follows the existing `OverlayAction` registry pattern in `wod-overlay.ts`. Commands are registered per metric type and rendered in the inline panel's action area. |
| **React portals in CM6** | CM6 widgets render raw DOM. To use React components inside CM6 widgets, the project can use `ReactDOM.createRoot()` inside `WidgetType.toDOM()` — a pattern used by other CM6+React integrations. Alternatively, the widget renders a placeholder div and a React component portals into it. |

---

## 3. Proposed Solutions

### Solution A: CM6-Native Hover + Widget Panel (Full CM6 Integration)

**How It Works:** Replace the React-based `OverlayTrack` + `WodCompanion` system with three pure CM6 extensions:

1. **Hover Tooltip Extension** — Uses CM6's built-in `hoverTooltip()` to show a compact metric summary when the mouse hovers over a WOD line. The tooltip content is a simple DOM element listing the metric types and values parsed from that line's `CodeStatement`. The tooltip automatically repositions on mouse movement and updates when crossing line boundaries.

2. **Cursor Focus Widget Extension** — A `StateField` that tracks the cursor line within WOD sections. When the cursor moves to a new WOD line, it produces a block `Decoration.widget()` positioned below the cursor line. The widget is a `WidgetType` subclass that renders a metric breakdown panel — each metric displayed as a colored block with label, value, and optional action buttons. Simultaneously, mark decorations are added to the cursor line to underline each metric's source tokens with matching colors.

3. **Inline Error Extension** — Leverages CM6's `lintGutter()` and diagnostic system. Parser errors are mapped to `Diagnostic` objects with `from`/`to` positions matching the error-causing tokens, rendered with squiggly underlines and inline error messages below the offending line.

**Affected Components:**
- New: `src/components/Editor/extensions/metric-hover.ts` (hover tooltip extension)
- New: `src/components/Editor/extensions/cursor-focus-panel.ts` (inline widget + mark decorations)
- New: `src/components/Editor/extensions/inline-errors.ts` (diagnostic-based error display)
- Modified: `src/components/Editor/NoteEditor.tsx` (replace overlay setup with new extensions)
- Deprecated: `OverlayTrack.tsx`, `WodCompanion.tsx`, `useOverlayWidthState.ts`, `OverlayWidthPolicy.ts`, `section-geometry.ts`

**Implementation Complexity:** High
**Alignment with Existing Patterns:** Excellent — leverages CM6's built-in tooltip, widget, and diagnostic infrastructure. Follows the existing extension-based architecture pattern (`wod-decorations.ts`, `section-state.ts`).

**Testing Strategy:**
- Unit: Test hover tooltip content generation per metric type
- Unit: Test cursor focus widget creation and mark decoration placement
- Unit: Test inline error diagnostic mapping from parser errors
- Integration: Storybook story demonstrating all three modes
- Visual: Screenshot comparison of hover, focus, and error states

**Risks or Tradeoffs:**
- ✅ Eliminates horizontal space consumption — all feedback is inline
- ✅ Mobile-friendly — no overlay panels to interfere with touch editing
- ✅ CM6-native — better performance, no React reconciliation for editor decorations
- ❌ Loses the sticky strip with always-visible command buttons (Run, Playground)
- ❌ Complex React integration for action buttons inside CM6 widgets
- ❌ Higher implementation complexity — three new extensions vs one refactored component

---

### Solution B: Hybrid React + CM6 Approach (Minimal Overlay + CM6 Decorations)

**How It Works:** Keep a minimal version of the React overlay system for command buttons (Run, Playground) but move metric feedback to CM6-native decorations:

1. **Hover Tooltip** — Same as Solution A: CM6 `hoverTooltip()` for compact metric summary on hover.

2. **Cursor Focus Inline Panel** — Instead of a pure CM6 widget, render a thin React component that portals into a CM6 block widget placeholder. The CM6 extension inserts a placeholder `<div>` below the cursor line; a React effect detects the placeholder and portals a `MetricBreakdownPanel` component into it. This allows using existing React hooks (`useWodLineResults`, `useWodBlockResults`) and Tailwind CSS classes inside the inline panel.

3. **Metric Underlines** — CM6 mark decorations with colored bottom borders, matching the inline panel's metric colors. Placed by parsing the `CodeStatement` for the cursor line and mapping each metric's token range.

4. **Slim Command Strip** — The `OverlayTrack` is reduced to a narrow gutter or floating action button that doesn't consume editor width. On mobile, commands move to a context menu or the inline panel's action area.

5. **Inline Errors** — Same as Solution A: CM6 diagnostic system for squiggly underlines and error messages.

**Affected Components:**
- New: `src/components/Editor/extensions/metric-hover.ts` (CM6 hover tooltip)
- New: `src/components/Editor/extensions/cursor-focus-panel.ts` (CM6 widget + React portal)
- New: `src/components/Editor/extensions/metric-underlines.ts` (mark decorations)
- New: `src/components/Editor/components/MetricBreakdownPanel.tsx` (React inline panel)
- Modified: `src/components/Editor/overlays/OverlayTrack.tsx` (slim down to command strip only)
- Modified: `src/components/Editor/overlays/WodCompanion.tsx` (remove metric display, keep commands)
- Modified: `src/components/Editor/NoteEditor.tsx` (add new extensions, configure portal bridge)

**Implementation Complexity:** Medium
**Alignment with Existing Patterns:** Good — preserves React component patterns for interactive UI while using CM6 for editor-native features. The portal pattern is well-established in CM6+React codebases.

**Testing Strategy:**
- Unit: Hover tooltip content generation
- Unit: Metric underline decoration placement
- Integration: React portal rendering inside CM6 widget
- Integration: Command strip interaction
- Visual: Storybook stories for each mode

**Risks or Tradeoffs:**
- ✅ Reuses existing React components and hooks
- ✅ Maintains command accessibility via slim overlay strip
- ✅ Portal pattern allows Tailwind CSS and React state inside inline panels
- ❌ Still has some overlay infrastructure (even if minimal)
- ❌ React portal management adds complexity (mount/unmount lifecycle)
- ❌ Two rendering systems (CM6 decorations + React portals) to coordinate

---

### Solution C: Enhanced Decoration System (Evolve Current Architecture)

**How It Works:** Evolve the existing `wod-decorations.ts` system to provide all three feedback modes without replacing the overlay infrastructure:

1. **Enhanced Inlay Hints as Hover** — Expand the existing inline metric emoji hints (already in `wod-decorations.ts`) to be interactive. On hover, each emoji expands into a tooltip showing the metric type, value, and source. This avoids a new hover extension entirely — the existing inlay hints become the hover trigger.

2. **Block Widget for Focus** — Add a new widget decoration class to `wod-decorations.ts` that renders a metric breakdown row below the cursor line. The widget is a simple DOM element (not React) styled with the existing `baseTheme` pattern from `preview-decorations.ts`. Action buttons dispatch commands through the existing `OverlayAction` registry.

3. **Error Annotations** — Add error-specific decorations to `wod-decorations.ts` that render squiggly underlines using CSS `text-decoration: wavy underline` and error message widgets below affected lines.

4. **Overlay Retirement** — Gradually deprecate `OverlayTrack` and `WodCompanion` as the new decoration-based system covers their functionality. Command buttons move to the gutter (extending `StartWorkoutGutterMarker`) or the inline panel.

**Affected Components:**
- Modified: `src/components/Editor/extensions/wod-decorations.ts` (major extension — add hover, focus, error decorations)
- New: `src/components/Editor/extensions/metric-focus-widget.ts` (if extracted for clarity)
- Modified: `src/components/Editor/NoteEditor.tsx` (add new extension, begin overlay deprecation)
- No new React components — all DOM rendering via CM6 `WidgetType`

**Implementation Complexity:** Low–Medium
**Alignment with Existing Patterns:** Excellent — extends the existing decoration system. Follows the same patterns as `wod-decorations.ts` and `preview-decorations.ts`.

**Testing Strategy:**
- Unit: Decoration generation per cursor position and hover state
- Unit: Error decoration mapping from parser diagnostics
- Integration: Full editor with all three decoration modes active
- Visual: Storybook comparison of old overlay vs new inline feedback

**Risks or Tradeoffs:**
- ✅ Minimal new files — extends existing infrastructure
- ✅ Pure CM6 — no React portals or mixed rendering
- ✅ Incremental migration — overlay can be retired gradually
- ❌ Limited interactivity in CM6 widgets (no React hooks, state, or Tailwind)
- ❌ Action buttons in pure DOM are harder to maintain than React components
- ❌ May hit limits of CM6 decoration system for complex interactive panels

---

## 4. Recommendation

**Recommended: Solution B — Hybrid React + CM6 Approach**

Solution B provides the best balance of architectural improvement and practical implementation. It leverages CM6's native hover tooltip and decoration systems for the lightweight, performance-critical interactions (hover popover, metric underlines) while using React portals for the complex interactive panel (cursor-focus inline display with action buttons and results). This approach:

1. **Preserves existing investment** — Reuses `useWodLineResults`, `useWodBlockResults`, `WodCommand` interfaces, and Tailwind CSS patterns.
2. **Eliminates the width problem** — Hover tooltips and inline widgets consume zero horizontal space.
3. **Enables mobile-first design** — The inline panel works at any width; command buttons can adapt to touch contexts.
4. **Maintains extensibility** — The generic command slot system (action buttons in the inline panel) supports future editing enhancements without new architecture.
5. **Supports incremental migration** — The slim command strip preserves backward compatibility while the inline system is built.

### Implementation Steps

1. **Create `metric-hover.ts`** — CM6 `hoverTooltip()` extension that:
   - Resolves the hovered position to a `CodeStatement` line
   - Extracts metrics from the statement
   - Renders a compact tooltip DOM element with metric type icons and values
   - Hides when the mouse leaves the editor or enters a non-WOD section

2. **Create `cursor-focus-panel.ts`** — CM6 `StateField` extension that:
   - Tracks the cursor line within WOD sections
   - Produces `Decoration.widget()` (block: true) below the cursor line
   - The widget renders a placeholder `<div>` with a data attribute for portal targeting
   - Produces `Decoration.mark()` decorations on the cursor line for metric token underlines
   - Each mark gets a CSS class with a bottom border matching the metric's assigned color

3. **Create `MetricBreakdownPanel.tsx`** — React component that:
   - Portals into the CM6 widget placeholder
   - Displays metric blocks: `| reps | effort | resistance |` with colored labels
   - Highlights the focused metric (under cursor) with expanded detail
   - Renders action button slots from the command registry
   - Shows instructional text (e.g., "Ctrl+↑ to increment")

4. **Create `inline-errors.ts`** — CM6 extension that:
   - Maps parser errors to CM6 `Diagnostic` objects
   - Provides squiggly underlines via `lintGutter()` integration
   - Renders error messages as inline widgets below the error line

5. **Modify `NoteEditor.tsx`** — Integration:
   - Add new extensions to the extension array
   - Set up React portal bridge for `MetricBreakdownPanel`
   - Configure slim command strip (or move commands to inline panel)
   - Add feature flags: `enableInlineFeedback`, `enableHoverTooltip`, `enableInlineErrors`

6. **Slim down `OverlayTrack.tsx`** — Reduce to:
   - Command buttons only (Run, Playground, Plan)
   - Narrow gutter or floating button instead of wide panel
   - Or remove entirely if commands move to inline panel

### Metric Color Mapping

The inline panel and underline decorations share a consistent color scheme per metric type:

| Metric Type   | Color              | CSS Class              | Emoji |
| ------------- | ------------------ | ---------------------- | ----- |
| Duration      | Blue (`#3b82f6`)   | `cm-metric-duration`   | ⏱️    |
| Rep           | Green (`#22c55e`)  | `cm-metric-rep`        | ×     |
| Resistance    | Orange (`#f97316`) | `cm-metric-resistance` | ⚖️    |
| Rounds        | Purple (`#a855f7`) | `cm-metric-rounds`     | ↻     |
| Distance      | Cyan (`#06b6d4`)   | `cm-metric-distance`   | 📏    |
| Action/Effort | Red (`#ef4444`)    | `cm-metric-effort`     | ⚡     |
 
### Command Slot System

The inline panel's action area uses a generic command registry pattern:

```typescript
interface InlineCommand {
  /** Unique command identifier */
  id: string;
  /** Display label for the action button */
  label: string;
  /** Icon component or emoji */
  icon: React.ReactNode;
  /** Keyboard shortcut (e.g., "Ctrl+↑") */
  shortcut?: string;
  /** Instructional text shown next to the button */
  description?: string;
  /** Action handler — receives the current metric context */
  execute: (context: MetricCommandContext) => void;
}

interface MetricCommandContext {
  /** The CodeStatement for the focused line */
  statement: CodeStatement;
  /** The specific metric under the cursor (if any) */
  focusedMetric?: IMetric;
  /** The editor view for dispatching changes */
  view: EditorView;
  /** Character range of the focused metric value */
  valueRange?: { from: number; to: number };
}
```

Example built-in commands:
- **Increment value** (Ctrl+↑): Increases the numeric value under the cursor by 1
- **Decrement value** (Ctrl+↓): Decreases the numeric value under the cursor by 1
- **Add comment** (Ctrl+/): Inserts a comment annotation on the line

### Testing Strategy

| Test Category | Test Cases |
|--------------|------------|
| **Hover tooltip** | Shows for WOD lines only; displays correct metric types; hides for markdown lines; updates on line crossing |
| **Cursor focus panel** | Appears below cursor line; shows correct metrics; highlights focused metric; hides when cursor leaves WOD section |
| **Metric underlines** | Mark decorations span correct token ranges; colors match metric types; update when cursor moves |
| **Inline errors** | Squiggly underline on error tokens; error message below line; clears when error is fixed |
| **Command slots** | Buttons render in action area; Ctrl+↑/↓ adjusts numeric values; custom commands can be registered |
| **Mobile layout** | No horizontal space consumed; inline panel fits narrow widths; touch interactions work |

---

## 5. Validation & Next Steps

- [ ] Create `metric-hover.ts` CM6 extension with hover tooltip
- [ ] Create `cursor-focus-panel.ts` CM6 extension with widget + mark decorations
- [ ] Create `MetricBreakdownPanel.tsx` React component with metric display and command slots
- [ ] Create `inline-errors.ts` CM6 extension for error display
- [ ] Integrate new extensions into `NoteEditor.tsx`
- [ ] Add Storybook story demonstrating all three feedback modes
- [ ] Test on mobile viewport (375px width) — verify no horizontal overflow
- [ ] Validate metric color consistency between underlines and panel
- [ ] Slim down or deprecate `OverlayTrack` + `WodCompanion`
- [ ] Update documentation for new editor configuration options

---

## 6. Edge Cases & Considerations

### Multi-Cursor Support
If the editor supports multiple cursors, the focus panel should display for the primary cursor only. Secondary cursors should still get metric underlines but not inline panels.

### Rapid Cursor Movement
When the cursor moves rapidly across lines (keyboard navigation), the inline panel should debounce — wait ~100ms after the last cursor movement before rendering to avoid flicker. The CM6 `StateField` can use a timer-based approach or rely on CM6's built-in transaction batching.

### Overlapping Metrics on Same Token
Some tokens may participate in multiple metric types (e.g., "10:00" is both Duration and could influence Rounds context). The underline should use the highest-priority metric color, with the inline panel showing all applicable metrics.

### Empty WOD Lines
Lines within a WOD block that have no parseable metrics (comments, blank lines) should show the hover tooltip with "No metrics on this line" and should not render a focus panel.

### Parser Error + Metrics Coexistence
A line may have partial parse success — some metrics parsed before an error was encountered. Both the metric underlines and the error squiggly should display simultaneously. The error decoration should have higher z-index.

### Performance Impact
- Hover tooltips: Negligible — CM6 `hoverTooltip` only invokes the callback when the mouse is stationary.
- Focus panel: One block widget + N mark decorations per cursor movement. N is typically 1–4 metrics per line. Decoration creation should be < 1ms.
- Inline errors: Diagnostic computation runs once per document change, not per cursor movement.

### Gutter Integration
The existing `StartWorkoutGutterMarker` (play button) should remain functional. The new inline panel could optionally show a mini-gutter on its left side for additional actions.

### Accessibility
- Hover tooltips should be accessible via keyboard (Tab to focus, Escape to dismiss)
- Inline panel should be navigable with Tab key
- Metric colors should have sufficient contrast and not rely solely on color (use labels + icons)
- Screen readers should announce metric type and value
