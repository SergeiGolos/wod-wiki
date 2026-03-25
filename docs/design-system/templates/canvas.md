# Template: Canvas Page

| | |
|--|--|
| **Name** | Canvas Page |
| **Code** | `playground/src/canvas/CanvasPage.tsx` + `parseCanvasMarkdown.ts` |
| **Source files** | `markdown/canvas/**/*.md` and `markdown/collections/**/README.md` |

## Description

Scroll-driven editorial layout. Sections are parsed from markdown headings. Each section can have a sticky editor panel (a `view` block) on the left or right, prose in the main column, embedded buttons, and scroll-triggered command pipelines. When a section has **no `view` block**, the full viewport width is used with rich markdown prose rendering (tables, images, code blocks, frontmatter cards, file links).

## Layout Modes

| Mode | When | Column split |
|------|------|-------------|
| Two-column | Section contains a `view` block | 40% prose + 60% sticky editor (`NoteEditor` or `RuntimeTimerPanel`) |
| Full-width | Section has no `view` block | 100% width, `max-w-4xl` content container with rich `CanvasProse` markdown |

## Heading Attributes

| Attribute | Effect |
|-----------|--------|
| `{sticky}` | Fires the section's `command` pipeline when it enters the viewport |
| `{dark}` | Dark tint background for this section |
| `{full-bleed}` | Section stretches edge-to-edge; content centred at `max-w-md` |

## DSL Blocks

Stripped from prose, never rendered as code.

| Block            | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `` ```view ``    | Declares the sticky editor panel — source file, alignment, inline buttons      |
| `` ```command `` | Pipeline that fires automatically when the section scrolls into view           |
| `` ```button ``  | Clickable button that fires a pipeline on click — rendered below section prose |

## Pipeline Actions

| Action | Effect |
|--------|--------|
| `set-source: <path>` | Swaps the editor content (supports `markdown/canvas/`, `markdown/collections/`, `wod/` paths) |
| `set-state: track` | Runs the compiled WOD block (opens in `view`, `dialog`, or `route` mode) |
| `navigate: <route>` | Pushes a new browser route |

## Collection README Pattern

Collection pages (`markdown/collections/{slug}/README.md`) use Canvas as a structured tutorial/walkthrough format:
- No `route:` frontmatter — route is auto-derived from folder name at build time
- Prose sections introduce each workout in the collection
- Each workout gets its own `##` heading with description, the WodScript as a fenced `wod` block (preserved as a code block in the prose via `CanvasProse`), and optionally a `button` to load/run it
- The sticky editor panel (`view` block) loads workout content on scroll via `command` blocks
