# Canvas Page Deepening — Content-Driven Scrolling & Visual Feedback

**Date:** 2026-05-25
**Scope:** `MarkdownCanvasPage.tsx`, `CanvasProse.tsx`, `parseCanvasMarkdown.ts`, canvas markdown files
**Driver:** Home page (`/`) and Getting Started (`/guide/getting-started`) feel like a slideshow — forced viewport-height sections create dead space, weak visual feedback, and disconnected sticky panel behavior.

---

## Current Architecture (Shallow)

### The Problem in One Line

```tsx
// MarkdownCanvasPage.tsx:907 — every section is forced to fill the viewport
'min-h-[70vh] lg:min-h-screen flex items-center py-16 lg:py-24 px-6 lg:px-10'
```

This single Tailwind string creates three interconnected problems:

1. **Visual dead space** — A section with 2 sentences + 1 button is stretched to `100vh`. The content sits in the vertical center, surrounded by empty padding.
2. **Slide-like scrolling** — Each section is a "slide" the user must scroll past. There's no continuous flow; it feels like PowerPoint, not a document.
3. **Disconnected sticky panel** — The right-side editor swaps source when a section crosses the IntersectionObserver threshold, but the threshold is coarse (entire viewport) and the swap is invisible (opacity fade only).

### The IntersectionObserver Is Coarse

```tsx
// Lines 641-642 — 30% dead zone top and bottom
const rootMargin = isMobile
  ? `-${MOBILE_STICKY_TOP}px 0px -20% 0px`
  : '-30% 0px -30% 0px'
```

The observer treats each section as a monolithic block. It doesn't know about:
- Individual paragraphs within a section
- Code examples that should highlight as they scroll into view
- Button actions that should show visual feedback when triggered

### The Sticky Panel Is Static

The right-side `MacOSChrome` editor:
- Shows the same chrome title (`"Whiteboard Script"`) regardless of what's loaded
- Has no visual connection to the left content (no shared color, no sync indicator)
- Doesn't react to scroll position within a section

---

## Deepening Opportunities

### Candidate 1: Content-Driven Section Sizing

**Files:** `MarkdownCanvasPage.tsx` (line 907), canvas markdown files

**Problem:** `min-h-screen` forces all sections to the same height regardless of content. This is a shallow module — the layout rule knows nothing about what's inside.

**Solution:** Remove forced viewport height. Let sections size to content. Use `py-16` (or `py-20` for major sections) as consistent vertical rhythm. Add a new markdown attribute `density: compact` for sections that should have tighter spacing.

**Deletion test:** If we delete the `min-h-screen` rule, complexity doesn't reappear elsewhere — it vanishes. The rule was a pass-through pretending to be layout.

**Benefits:**
- Sections with 2 sentences don't feel empty
- Sections with 4 paragraphs don't feel cramped
- Scrolling feels continuous, not slide-by-slide
- Mobile experience improves (less thumb-scrolling per section)

**Markdown DSL addition:**
```markdown
## Timers {sticky #timer}
```
→ default spacing (py-16 lg:py-20)

```markdown
## Quick Reference {sticky #ref density:compact}
```
→ tighter spacing (py-8 lg:py-12)

---

### Candidate 2: Inline Example Switcher

**Files:** `MarkdownCanvasPage.tsx`, `parseCanvasMarkdown.ts`, `CanvasProse.tsx`

**Problem:** Currently, a section's `command` block fires on IntersectionObserver threshold crossing. The user sees the editor content swap, but there's no visual cue *in the prose* about what changed. The button below the prose is the only interactive element.

**Solution:** Add a new DSL block `example` that renders as an inline tab switcher within the prose. This lets users actively explore variations without scrolling to trigger them.

**Markdown DSL:**
```markdown
## Metrics {sticky #metrics}

Add reps, load, and distance.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

```example
label: With distance
source: wods/examples/getting-started/metrics-3.md
```
```

**Rendered as:** A horizontal tab strip (pill buttons) above the editor. Clicking a tab swaps the editor source and highlights the active tab. The tab strip lives in the prose column, creating a visual bridge between text and editor.

**Benefits:**
- User controls the pace, not the scroll observer
- Multiple examples per section without section proliferation
- Visual feedback is immediate and local

---

### Candidate 3: Scroll-Triggered Visual Feedback (Parallax Storytelling)

**Files:** `MarkdownCanvasPage.tsx`, `CanvasProse.tsx`

**Problem:** The IntersectionObserver fires once per section. There's no granular feedback as the user scrolls *through* a section. The prose is static — it doesn't react to scroll position.

**Solution:** Use `scroll-driven animations` (CSS `@property` + `animation-timeline: scroll()`) or lightweight scroll listeners to add visual feedback:

1. **Progress indicator** — A thin line at the left edge of the prose column that fills as the section scrolls through the viewport.
2. **Subtext reveals** — Secondary explanations that fade in when the user scrolls past the primary content.
3. **Code highlight sync** — As the user scrolls past a code reference in the prose, the corresponding line in the sticky editor briefly highlights.

**Markdown DSL extension:**
```markdown
## Timers {sticky #timer}

Prefix a movement with a time to run it as a countdown.

> :30 is 30 seconds. 5:00 is 5 minutes.

```subtext
The runtime automatically detects countdown vs count-up based on context.
```
```

The `subtext` block renders at 60% opacity and fades to 100% when the user scrolls it into the center 30% of the viewport.

**Benefits:**
- Creates the "parallax storytelling" feel
- Rewards scrolling with discovery
- Reduces visual clutter (subtext starts dim, not hidden)

---

### Candidate 4: Sticky Panel Visual Connection

**Files:** `MarkdownCanvasPage.tsx`, `MacOSChrome.tsx`

**Problem:** The sticky editor panel is visually disconnected from the scrolling content. It has no idea what section is active.

**Solution:**
1. **Section-colored chrome border** — Each section can declare a `theme` attribute. The `MacOSChrome` border subtly shifts color to match the active section.
2. **Active section title in chrome** — Show the current section heading in the MacOSChrome title bar instead of the static `"Whiteboard Script"`.
3. **Scroll-synced line highlight** — When the prose references a specific line (e.g., "`:30` is 30 seconds"), the corresponding line in the editor gets a subtle background highlight.

**Markdown DSL:**
```markdown
## Timers {sticky #timer theme:amber}
```

**Benefits:**
- The two columns feel like one connected experience
- Users always know which section the editor belongs to
- Visual rhythm is reinforced, not fragmented

---

### Candidate 5: Scroll Direction-Aware Command Batching

**Files:** `MarkdownCanvasPage.tsx` (lines 655-669)

**Problem:** The current observer fires commands immediately on section activation. If a user scrolls quickly through 3 sections, all 3 command pipelines fire in rapid succession, causing the editor to swap content 3 times in a second.

**Solution:** Add a debounce + scroll-direction guard:
- Only fire commands when a section has been "stable" (most-visible for >200ms)
- When scrolling up, don't fire commands for sections the user is leaving — only for the one they're entering
- Add a visual "loading" state to the editor during swaps (spinner in the chrome title)

**Benefits:**
- Eliminates editor flicker during fast scrolling
- Makes the experience feel intentional, not reactive

---

## Recommended Fix Order

| Priority | Candidate | Effort | Impact |
|----------|-----------|--------|--------|
| 1 | Content-driven section sizing (Candidate 1) | Low | High — immediate feel improvement |
| 2 | Scroll direction-aware command batching (Candidate 5) | Low | Medium — eliminates flicker |
| 3 | Inline example switcher (Candidate 2) | Medium | High — adds interactivity |
| 4 | Sticky panel visual connection (Candidate 4) | Medium | Medium — connects columns |
| 5 | Scroll-triggered visual feedback (Candidate 3) | High | High — parallax storytelling |

---

## Proposed Acceptance Criteria

- [ ] Sections size to content — no `min-h-screen` on standard sections
- [ ] `density:compact` attribute works in markdown heading attributes
- [ ] Fast scrolling doesn't cause editor flicker (debounced command firing)
- [ ] `example` DSL block renders inline tab switcher
- [ ] Active section heading shown in MacOSChrome title
- [ ] `subtext` blocks fade in on scroll (scroll-driven animation)
- [ ] Home page (`/`) and Getting Started (`/guide/getting-started`) feel like continuous documents, not slideshows
- [ ] Mobile experience improved (less forced scrolling)

---

## Related

- Current home page: `markdown/canvas/home/README.md`
- Current getting-started: `markdown/canvas/getting-started/README.md`
- Renderer: `playground/src/canvas/MarkdownCanvasPage.tsx`
- Prose renderer: `playground/src/canvas/CanvasProse.tsx`
- Parser: `playground/src/canvas/parseCanvasMarkdown.ts`
- Crosswalk analysis: `/docs/plans/2026-05-25-syntax-pages-crosswalk-analysis.md`
