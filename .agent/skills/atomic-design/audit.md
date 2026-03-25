# Auditing an Existing UI with Atomic Design

> Use this file whenever the task is to **analyse an existing UI** — a codebase, screenshots,
> or a running application — and classify its elements into the atomic hierarchy.

---

## Phase 0 — Gather Materials

Before classifying anything, collect:

| Input | How to get it |
|-------|--------------|
| UI screenshots / Figma frames | Ask user, or take from Storybook / running app |
| Component source files | `Glob` or `Grep` for `.tsx`/`.vue`/`.svelte` etc. |
| Existing component names | Read folder structure + index exports |
| Design tokens / theme file | Look for `tokens.ts`, `theme.ts`, `variables.css` |
| Routing / page structure | Read router file or `pages/` directory |

Produce a **flat inventory list** before doing any classification.

---

## Phase 1 — Flat Inventory

List every distinct visual or interactive element you can identify. Use this template:

```
INVENTORY
=========
[ ] element name / component name
[ ] element name / component name
...
```

Tips:
- Include **design tokens** as elements (they become atoms of the token layer)
- Don't merge obviously different things just because they share a parent file
- Don't classify yet — just list

---

## Phase 2 — Apply the Decision Tree

For each inventory item, walk through this tree:

```
Can this element be broken down into smaller, still-useful UI pieces?
│
├── NO → 🔵 ATOM
│         (base HTML element, icon, token, text style)
│
└── YES → Does it have ONE clear, portable, self-contained job?
          │
          ├── YES → 🟢 MOLECULE
          │         (search form, form field, nav item, card thumbnail)
          │
          └── NO → Does it form a recognisable, self-contained SECTION
                   of the interface on its own?
                   │
                   ├── YES → 🟠 ORGANISM
                   │         (header, footer, product grid, comment thread)
                   │
                   └── NO → Is it a LAYOUT that uses placeholders
                            for real content?
                            │
                            ├── YES → 🟣 TEMPLATE
                            │
                            └── NO → 🔴 PAGE
                                    (real content in a real layout)
```

---

## Phase 3 — Build the Classification Table

Fill in this table as you work through the inventory:

| Element / Component | Stage | Notes / Justification |
|--------------------|-------|-----------------------|
| `<Button>` | Atom | Cannot be broken down; single HTML element |
| `<SearchForm>` | Molecule | Composed of label + input + button atoms; single job |
| `<SiteHeader>` | Organism | Composed of logo + nav + search form; standalone section |
| `HomepageTemplate` | Template | Places organisms in layout; no real content |
| `HomePage` | Page | HomepageTemplate + real marketing copy |

---

## Phase 4 — Draw the Dependency Graph

For complex UIs, a dependency graph reveals coupling and reuse opportunities:

```
Page: HomePage
  └── Template: HomepageTemplate
        ├── Organism: SiteHeader
        │     ├── Atom: Logo
        │     ├── Molecule: PrimaryNav
        │     │     └── Atom: NavItem (×5)
        │     └── Molecule: SearchForm
        │           ├── Atom: Label
        │           ├── Atom: TextInput
        │           └── Atom: Button
        ├── Organism: HeroBanner
        │     ├── Atom: HeadingText
        │     ├── Atom: BodyText
        │     └── Atom: Button (reused!)
        └── Organism: ProductGrid
              └── Molecule: ProductCard (×many)
                    ├── Atom: ProductImage
                    ├── Atom: ProductTitle
                    └── Atom: PriceTag
```

Noting reused atoms (like `Button` appearing in multiple organisms) identifies the most
valuable components to design with care.

---

## Phase 5 — Flag Issues

After classification, look for these common problems:

| Problem | Symptom | Fix |
|---------|---------|-----|
| **God organism** | An organism contains 10+ molecules with unrelated purposes | Split into multiple organisms |
| **Leaking atoms** | Raw HTML in organisms/pages instead of atom component | Extract atom component |
| **Template-as-page** | Template has real content hardcoded | Move content to page layer |
| **Missing atom layer** | All styling hardcoded in molecules | Extract design tokens + atom components |
| **Broken single responsibility** | Molecule does two different jobs | Split into two molecules |
| **Duplicate molecules** | Two molecules with near-identical structure | Merge with props |
| **Page = organism confusion** | A component called "page" but no template exists | Introduce template layer |

---

## Phase 6 — Produce the Audit Report

Return a structured report:

```markdown
## Atomic Design Audit — [UI Name]

### Summary
- X atoms identified (Y missing / to extract)
- X molecules identified (Y to refactor)
- X organisms identified
- X templates (Z missing)
- X pages

### Classification Table
[insert Phase 3 table]

### Dependency Graph
[insert Phase 4 ASCII graph]

### Issues Found
[insert Phase 5 table — only rows with issues]

### Recommendations
1. ...
2. ...
```

---

## Audit Heuristics

### Signs of a healthy atomic hierarchy
- Atoms are stateless and purely presentational where possible
- Molecules do exactly one thing — their name describes a job, not a shape
- Organisms are importable and renderably meaningful without a parent page
- Templates use placeholder/lorem content (or Storybook args)
- Pages are thin — they just pass real data down to templates

### Signs of a bad atomic hierarchy
- Components named `BigThing`, `Section`, `Container` with no clear stage
- Page components contain hundreds of lines of JSX with no sub-components
- Design tokens embedded as magic strings inside molecule CSS
- No component between raw HTML and a full page
