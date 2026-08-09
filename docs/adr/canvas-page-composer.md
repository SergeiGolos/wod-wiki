# Canvas Page Composer — One Block-Stream Owner for Every Canvas Page

**Status**: accepted — 2026-08-08 (locked under [#933](https://github.com/SergeiGolos/wod-wiki/issues/933))
**Parent map**: [#932](https://github.com/SergeiGolos/wod-wiki/issues/932) (Unified scroll & home architecture)
**Supersedes**: the per-form-factor redraw route of [#911](https://github.com/SergeiGolos/wod-wiki/issues/911) (closed)

A canvas page is an **ordered block stream**, and one **Page Composer** module owns rendering it: it walks the stream and dispatches each **Page Block** by kind to a **Form Factor**-aware renderer. Scroll runways become **positional** blocks — interleaved with content in document order — not page-level constructs. The three current page components (`HomeView` tour, `ScrollCanvasPage`, `MarkdownCanvasPage`) collapse into thin route hosts that feed the composer a parsed page. Two sticky block kinds exist — the **Demo Runway** (scripted stages) and the **Working-Editor Panel** (live edit+run) — plus flowed **Content Sections** (prose, chapters, analytics, buttons, hero). Each sticky kind renders through one **Runway Adapter** that swaps presentation by form factor (desktop / mobile / reduced-motion).

## Why

The home page's composition is hand-duplicated across three render branches with asymmetries (`CelebrationBridge` missing from the reduced-motion stack; three divergent "Learn the Language" variants), and the tour exists twice — as TS `TOUR_STAGES` (used by `HomeTour`) and as a parsed-but-unused ```` ```scroll ```` block in `markdown/canvas/home/README.md`. Scroll runways are hoisted to page level (`page.scroll` / `page.namedScrolls`, `parseCanvasMarkdown.ts:extractPageScroll`) and stripped before section splitting, so a page cannot place a runway *between* content sections — order and interleaving are hardcoded per page component. The destination (#932) is one architecture across every scroll surface, consistent across form factors, supporting multiple scroll modules with different content types on a single page.

## Considered options

- **A (chosen) — one block-stream composer unifies all canvas pages.** Every canvas page (home, guides, panel pages) is an ordered Page Block stream; the composer renders any mix of runways + working-editor panels + content. The three page components become thin route hosts; the canvas markdown becomes the single source of truth (the TS `TOUR_STAGES` mirror is deleted).
- **B (rejected) — composer owns demo surfaces only; `MarkdownCanvasPage` stays a distinct page type.** Smaller step, but leaves the panel mechanism separate and the page-after-the-demo composition still duplicated across branches.
- **C (rejected) — keep page-level scroll hoisting + an explicit layout map.** Order lives outside the document; doesn't deliver "multiple scroll modules with content in between" from the authored markdown.

**Block-model decision**: **positional block stream** (chosen) over page-level + layout map — extends the existing `proseChunks` precedent (buttons already interleave positionally with prose) so ```` ```scroll ```` blocks sit in document order.

**Taxonomy decision**: **two sticky kinds + content** (chosen) — the pinned-window/cards look is the Demo Runway's mobile/reduced *presentation*, not a third kind; the Working-Editor Panel is the second sticky kind. Rejected "cards as a third kind" (three sticky implementations to keep consistent across form factors) and "runway only" (loses the split-panel canvas layout).

## The block model

`parseCanvasMarkdown` gains `blocks: PageBlock[]` — the ordered, positional stream. ```` ```scroll ```` / ```` ```scroll:<name> ```` blocks parse into positional `runway` blocks in document order (replacing page-level `page.scroll` / `page.namedScrolls` hoisting). Heading-delimited markdown sections become `prose` blocks (preserving `proseChunks` for inline buttons). ```` ```chapter ```` blocks collect into one positional `chapters` registry block.

```ts
type PageBlock =
  | { kind: 'runway';    spec: ScrollSpec }       // ```scroll — Demo Runway (sticky)
  | { kind: 'editor';    /* working editor */ }   // Working-Editor Panel (sticky)
  | { kind: 'prose';     section: CanvasSection }  // markdown content
  | { kind: 'chapters';  chapters: Chapter[] }     // ```chapter registry
  | { kind: 'analytics'; /* WQL / dashboard */ }   // analytics section (#938)
  | { kind: 'buttons';   /* button group */ }
  | { kind: 'hero';      /* hero slot */ }
```

## The seam

- **Page Composer** owns order + dispatch + the page-level runtime (fullscreen timer/review, the run action — one per page, launched with different scripts) and derives **Form Factor** once (`useMediaQuery` breakpoint + `prefers-reduced-motion`), provided via context.
- **Block renderers** own their per-form-factor presentation. The **Runway Adapter** is the sticky-demo seam: the composer hands it `{ spec, formFactor, onRun, onStageEnter, … }`; its per-form-factor internals (slide runway / pinned window / flat stack) are owned by the adapter effort (#936). The Working-Editor Panel swaps side-pane (desktop) / stacked (mobile).

## Naming & cleanup

- `tour/ScrollSection.tsx` (home pinned-window + cards) is absorbed into the Runway Adapter's mobile/reduced presentation — no longer a separate exported component.
- `canvas/ScrollRunwaySection.tsx` becomes the Runway Adapter's desktop implementation.
- `src/panels/page-shells/ScrollSection.tsx` (trivial max-height div) renamed to `BoundedScrollViewport`.
- `TourMobileStack` (forwarder), the 37-prop `HomeTour → TourMobileRunway` drill, and the `TourLearnSection` back-compat alias dissolve once the composer owns the page.

## Consequences

- The canvas markdown becomes the source of truth for page composition; the TS `TOUR_STAGES` mirror is deleted and the home tour moves into the README's ```` ```scroll ```` blocks.
- Migration updates `HomeView` / `ScrollCanvasPage` to feed the composer; `page.scroll` / `page.namedScrolls` are replaced by the positional `blocks` stream (clean cutover, no back-compat shim).
- New domain vocabulary is coined in `CONTEXT.md` (`### Canvas & scroll`): Page Block, Page Composer, Demo Runway, Runway Adapter, Working-Editor Panel, Content Section, Form Factor.
- Unblocks the dependent efforts: [#934](https://github.com/SergeiGolos/wod-wiki/issues/934) (stage-resolution seam — the Runway Adapter consumes it), [#935](https://github.com/SergeiGolos/wod-wiki/issues/935) (canvas-runway seam), [#936](https://github.com/SergeiGolos/wod-wiki/issues/936) (the adapter), [#937](https://github.com/SergeiGolos/wod-wiki/issues/937) (guides migrate), [#938](https://github.com/SergeiGolos/wod-wiki/issues/938) (analytics block).
