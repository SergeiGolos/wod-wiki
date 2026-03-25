# Atomic Design Validation Checklist

> Run through this checklist after an audit or refactoring is complete.
> Each section maps to one stage of the atomic hierarchy.

---

## Atom Checklist

### Completeness
- [ ] All primitive visual elements are extracted as atoms (no raw `<button>`, `<h2>`, `<img>` in molecules/organisms)
- [ ] Design tokens exist for: colors, spacing, typography scale, border-radius, and shadows
- [ ] Every atom has a named TypeScript interface / prop type
- [ ] All atoms are exported from a barrel file (`atoms/index.ts`)

### Quality
- [ ] Each atom has **one visual responsibility** (e.g., `Button` does not contain layout)
- [ ] Atoms support **variant props** instead of className overrides from outside
- [ ] Atoms carry no business logic and no data fetching
- [ ] Atoms are accessible: semantic HTML, aria-* attributes where needed, focus rings
- [ ] Each atom has a Storybook story demonstrating all its variants

---

## Molecule Checklist

### Completeness
- [ ] Every recurring 2–5 atom group with a single job is a named molecule
- [ ] Form molecules: every `<input>` has a paired `<label>` inside or linked via `htmlFor`
- [ ] Navigation molecules: NavItem, BreadcrumbItem, TabItem are molecules (not inline JSX)
- [ ] Feedback molecules: Toast, Alert, EmptyState, LoadingState, ErrorMessage exist

### Quality
- [ ] Each molecule **does exactly one thing** (single responsibility)
- [ ] Molecules accept **data props** and **callback props** — not components or render props
- [ ] Molecules do NOT fetch data or call APIs
- [ ] Molecules do NOT contain page routing logic
- [ ] Molecules do NOT directly use global state management (Zustand, Redux, Context)
- [ ] Each molecule has a Storybook story with realistic mock props

---

## Organism Checklist

### Completeness
- [ ] Every self-contained UI section (header, footer, grid, form, modal) is an organism
- [ ] No molecule is doing organism-level work (managing multi-section layout)
- [ ] Organisms for navigation: SiteHeader, SiteFooter, SideNav (as applicable to the app)

### Quality
- [ ] Each organism represents a **standalone section** — renderable in isolation (e.g., in Storybook)
- [ ] Organisms may pass callbacks down to molecules but do not contain business logic
- [ ] Organisms do NOT fetch data (data comes in via props from pages/hooks)
- [ ] Complex organisms are composed of named child molecules — not anonymous JSX
- [ ] No organism exceeds ~100–150 lines of JSX (if longer, split into child organisms)

---

## Template Checklist

### Completeness
- [ ] Every distinct page layout has a corresponding template component
- [ ] Templates exist for: main layout, auth layout, error layout, and any other distinct layout
- [ ] Each template is testable in Storybook using placeholder/Lorem Ipsum content

### Quality
- [ ] Templates define **layout only** — no hardcoded content, no real copy
- [ ] Template defines image dimension constraints (aspect ratios, max heights)
- [ ] Template demonstrates how layout adapts to short vs long text
- [ ] Template handles the main responsive breakpoints (mobile / tablet / desktop)
- [ ] One template can serve multiple pages without modification

---

## Page Checklist

### Completeness
- [ ] Every route has exactly one page component
- [ ] All content variation states are handled: loading, empty, error, full, minimal
- [ ] All permission/role variations are handled (admin vs guest vs unauthenticated)
- [ ] Responsive behavior tested at 320px, 768px, 1280px

### Quality
- [ ] Pages are thin: they fetch data via hooks, then pass it to templates/organisms
- [ ] No visual styles live in page components (all styling is in atoms/molecules/organisms)
- [ ] Pages are the only layer that imports from routing, data stores, or auth context
- [ ] Each page has at least one Storybook story testing the most important content state

---

## Cross-Cutting Checks

### Hierarchy integrity
- [ ] No atom imports from a molecule, organism, template, or page
- [ ] No molecule imports from an organism, template, or page
- [ ] No organism imports from a template or page
- [ ] No template imports from a page
- [ ] (Pages may import from any lower layer — that is expected)

### Reusability
- [ ] Atoms appear in 2+ molecules or organisms — if any atom is used only once, consider inlining
- [ ] Molecules appear in 2+ organisms — if used only once, consider whether it should be an organism detail
- [ ] Organisms reused across 2+ templates — organisms are the primary reuse vehicle

### Naming clarity
- [ ] Every component name communicates its stage implicitly or via folder:
  - `Button`, `Avatar`, `Icon` → atoms
  - `SearchForm`, `ProductCard`, `FormField` → molecules
  - `SiteHeader`, `ProductGrid`, `DataTable` → organisms
  - `ArticleTemplate`, `DashboardTemplate` → templates
  - `ShopPage`, `ArticlePage` → pages
- [ ] No vague names: `Container`, `Wrapper`, `BigComponent`, `Section`

### Testing
- [ ] Atoms: unit tested for variant rendering and prop validation
- [ ] Molecules: unit tested for composition and callback wiring
- [ ] Organisms: integration tested for data prop → render correctness
- [ ] Templates: visual snapshot tested at all breakpoints
- [ ] Pages: end-to-end tested for happy path + empty/error states

---

## Summary Scorecard

| Stage | Total possible | Checked | Grade |
|-------|---------------|---------|-------|
| Atoms | — | — | — |
| Molecules | — | — | — |
| Organisms | — | — | — |
| Templates | — | — | — |
| Pages | — | — | — |
| Cross-cutting | — | — | — |

**Grading guide:**
- 90–100% ✅ Production-ready
- 70–89% ⚠️ Functional but needs cleanup
- 50–69% 🔶 Significant structural work needed
- <50% 🔴 Fundamental design system rework required
