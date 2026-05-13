# Template: FocusTemplate

**Component:** `FocusTemplate` (Template)
**Atomic Level:** Template — full-screen single-column layout shell
**Status:** Design Draft — implementation tracked in [WOD-261](/WOD/issues/WOD-261)
**Last Updated:** 2026-05-01

---

## Overview

`FocusTemplate` is a stripped-down layout shell for pages that require the user's undivided attention — workout execution (TrackerPage), post-workout review (ReviewPage), and Chromecast display surfaces. It provides a single full-height content column with an optional sticky header bar. No left panel, no right panel, no nav sidebar.

`FocusTemplate` mirrors the **same slot interface as `AppTemplate`** so that page-type templates (`RuntimeTemplate`, `ReportTemplate`) can declare `FocusTemplate` as their layout parent without changing their context contract. Slots that `FocusTemplate` cannot render (`leftPanel`, `rightPanel`) accept values and silently no-op — injections are stored in `AppLayoutContext` but never rendered.

This interchangeability means any page built on `RuntimeTemplate` or `ReportTemplate` can be embedded in `AppTemplate` (for inline overlays) or `FocusTemplate` (for full-screen and Chromecast) without code changes to the page itself.

---

## Use Cases

| Surface | Template | Notes |
|---------|----------|-------|
| `/tracker/:runtimeId` | `FocusTemplate` → `RuntimeTemplate` | Full-screen timer; no nav distraction |
| `/review/:runtimeId` | `FocusTemplate` → `ReportTemplate` | Full-screen results; no nav distraction |
| Chromecast receiver | `FocusTemplate` → `RuntimeTemplate` | TV display; no nav, large layout |
| Chromecast review | `FocusTemplate` → `ReportTemplate` | TV display; overscan-safe, large text |
| Desktop inline overlay | `AppTemplate` → `RuntimeTemplate` | `FullscreenTimer` at `fixed inset-0 z-50` — uses AppTemplate but suppresses panels |

---

## Slot Interface (Identical to AppTemplate)

`FocusTemplate` accepts the same slot props as `AppTemplate`. Unsupported slots are accepted but produce no rendered output.

| Slot | `AppTemplate` | `FocusTemplate` | Behaviour when provided |
|------|--------------|----------------|------------------------|
| `leftPanel` | Rendered as persistent sidebar | **No-op** | Stored in context, not rendered |
| `contentPanel` | Flex-1 main area | **Rendered** — full viewport width | Content occupies 100% width |
| `rightPanel` | Persistent or drawer panel | **No-op** | Stored in context, not rendered |
| `contentHeader` | Sticky bar above content | **Rendered** — sticky top-0 | Same sticky bar semantics |

### `AppLayoutContext` (shared, same interface)

Both `AppTemplate` and `FocusTemplate` provide the same `AppLayoutContext` value so child components can call `usePageLayout()` identically regardless of which layout is active.

```ts
interface AppLayoutContext {
  // Slot injection — same API regardless of template
  setLeftPanel: (node: ReactNode) => void
  setContentPanel: (node: ReactNode) => void
  setRightPanel: (node: ReactNode) => void
  setContentHeader: (node: ReactNode) => void

  // Viewport state
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  isFocusMode: boolean           // true when FocusTemplate is the root

  // Scroll
  scrollToSection: (id: string) => void

  // Section index (L3 items)
  l3Items: NavItemL3[]
  setL3Items: (items: NavItemL3[]) => void
}
```

`isFocusMode: true` allows child components to adapt (e.g. larger text, no breadcrumb, overscan-safe padding on Chromecast).

---

## Panel Model

One zone. No breakpoint transitions — always full-screen.

```
╔══════════════════════════════════════════════════╗
║  ┌────────────────────────────────────────────┐  ║
║  │  [contentHeader — sticky top-0]            │  ║  ← optional, 0px height when absent
║  ├────────────────────────────────────────────┤  ║
║  │                                            │  ║
║  │  [contentPanel — flex-1 overflow-auto]     │  ║
║  │                                            │  ║
║  │  100vw × (100svh − header height)          │  ║
║  │                                            │  ║
║  └────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════╝
```

- No max-width constraint — content fills the viewport
- `bg-background` base (inherits theme from parent or standalone)
- Chromecast variant applies `safe-area-inset` padding and larger base font

---

## Breakpoint Behaviour

FocusTemplate has **no breakpoint transitions**. The layout is identical at all viewport sizes. Child components are responsible for any internal responsive behaviour (e.g. `FullscreenTimer` using `lg:` classes for larger displays).

---

## Chromecast Variant

When rendered in the Chromecast receiver context, `FocusTemplate` applies:

| Property | Value | Reason |
|----------|-------|--------|
| Font size | `text-2xl` base | TV viewing distance |
| Padding | `p-safe` (env safe-area) | Overscan compensation |
| Background | `bg-black` | TV black levels |
| `isFocusMode` | `true` | Signals child components to use TV layout |

The Chromecast receiver page imports `FocusTemplate` directly — no `AppTemplate` wrapper.

---

## Relationship to AppTemplate

```
AppTemplate                          FocusTemplate
├── leftPanel (sidebar)              ├── leftPanel → no-op
├── contentPanel (flex-1)            ├── contentPanel (100vw)
├── rightPanel (contextual)          ├── rightPanel → no-op
└── contentHeader (sticky)           └── contentHeader (sticky)

Both implement AppLayoutContext — child page-templates are unaffected
```

The two templates are **substitutable** at the layout root. A page-template (e.g. `RuntimeTemplate`) declares its preferred layout root but can be overridden by the page route configuration.

---

## Template Hierarchy

```
FocusTemplate
├── RuntimeTemplate   (/tracker/:id, Chromecast runtime)
│     └── TrackerPage
└── ReportTemplate    (/review/:id, Chromecast review)
      └── ReviewPage
```

Compare with AppTemplate's hierarchy for the same templates:
```
AppTemplate (inline overlay mode)
├── RuntimeTemplate   (FullscreenTimer at fixed inset-0 z-50)
└── ReportTemplate    (FullscreenReview inside contentPanel)
```

---

## Page Contract

Pages and page-templates that render inside `FocusTemplate` must not assume the existence of `leftPanel` or `rightPanel`. Any component that reads from `AppLayoutContext` will receive the no-op variants — calls to `setLeftPanel` are safe but silently discarded.

| Assumption | Safe? |
|------------|-------|
| `leftPanel` slot will be rendered | ❌ No |
| `rightPanel` slot will be rendered | ❌ No |
| `contentHeader` slot will be rendered | ✅ Yes |
| `contentPanel` fills full viewport width | ✅ Yes |
| `scrollToSection()` works | ✅ Yes (scrolls within contentPanel) |
| `isFocusMode` is available | ✅ Yes |
