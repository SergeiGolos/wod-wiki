# Atomic Design Methodology

> Source: Brad Frost, *Atomic Design* Chapter 2 — atomicdesign.bradfrost.com/chapter-2
> Key insight: Atomic design is **not a linear pipeline**. It is a **mental model** that lets
> you simultaneously view a UI as a whole and as a collection of parts.

---

## The Chemistry Analogy

Just as the physical world is composed of atoms → molecules → organisms, every user
interface — web, mobile, desktop, kiosk — is composed of:

```
Atoms → Molecules → Organisms → Templates → Pages
```

This is not a waterfall. You move back and forth between stages during design and
development, refining atoms when a page reveals a problem, and confirming page layouts
when atoms are in danger of being too abstract.

---

## Stage 1 — Atoms

**Definition:** The smallest functional building blocks of UI. They cannot be broken
down further without losing their identity or function.

### Characteristics
- Maps to basic HTML elements: `<input>`, `<button>`, `<label>`, `<a>`, `<img>`, `<h1>`…`<h6>`, `<select>`, etc.
- Also includes **design tokens** (color swatches, font scales, spacing units, border radii)
- Each atom has **intrinsic properties** (dimensions, font size, color) that influence how
  it behaves in larger compositions
- Atoms rarely make sense in isolation; they come alive inside molecules/organisms

### Decision rule: Is this an atom?
> Can it be split into smaller UI elements **and still be useful**?
> - YES → it is not an atom; continue decomposing
> - NO → it is an atom

### Examples
| Element Type | Examples |
|-------------|---------|
| Form controls | text input, checkbox, radio button, select, textarea |
| Action triggers | primary button, icon button, link, toggle |
| Display text | heading (h1–h6), body text, caption, badge, tag |
| Media | image, icon, avatar, video |
| Decorative | divider, spacer, spinner/loader |
| Tokens | color swatch, type scale specimen, spacing scale |

---

## Stage 2 — Molecules

**Definition:** Simple, purposeful groups of atoms bonded together to perform **one
specific job**.

### Characteristics
- Single responsibility: do one thing well
- Internally: composed of 2–5 atoms (roughly)
- Portable and reusable — can be dropped into any organism or layout that needs that function
- Easier to test in isolation than organisms

### Decision rule: Is this a molecule?
> Does it combine atoms into **one clear, reusable function**?
> - Function is clear and singular → molecule
> - Contains sub-groupings with their own distinct function → organism

### Examples
| Molecule | Composed of |
|---------|-------------|
| Search form | label + text input + submit button |
| Form field | label + input + error/hint text |
| Navigation item | icon atom + link atom |
| Notification toast | icon + body text + dismiss button |
| Product card thumbnail | image + title text + price text |
| Avatar with name | avatar image + display name text |
| Rating control | set of star icons + numeric label |

---

## Stage 3 — Organisms

**Definition:** Relatively complex components composed of groups of molecules and/or atoms
(and sometimes other organisms). They form **discrete, self-contained sections** of an
interface.

### Characteristics
- Stand-alone sections: header, footer, sidebar, product grid, data table, comment thread
- Can include **heterogeneous** molecules (logo + nav + search form in a header)
- Can include **homogeneous** repeating molecules (product card × N in a product grid)
- They provide designers/developers important **context** — small atoms make sense here
- Reusable across different templates

### Decision rule: Is this an organism?
> Does it form a **recognisable, standalone section** of the interface with its own
> identity, even if lifted out of the page?
> - YES → organism
> - NO (it's just a helper group inside something larger) → molecule

### Examples
| Organism | Composed of |
|---------|-------------|
| Site header | logo atom + primary nav molecule + search form molecule + auth buttons |
| Product grid | product card molecules × many |
| Data table | column header row + data row molecules |
| Comment thread | comment item organisms (recursive) |
| Article body | hero image + byline molecule + body text + share buttons molecule |
| Modal dialog | overlay atom + title + body content + action buttons molecule |
| Side navigation | section heading atoms + nav item molecules |

---

## Stage 4 — Templates

**Definition:** Page-level layouts that **place organisms and molecules into a structure**
and define the underlying **content skeleton** — without real content.

### Characteristics
- Templates are **wireframes with real components** — they reveal content shape
- Focus on **content structure**, not actual copy or images (use placeholders / grey boxes)
- Define critical constraints: image aspect ratios, headline character limits, column widths
- Allow testing: "Does the layout hold up with a 300-char headline vs a 15-char headline?"
- Stakeholder communication: templates are concrete enough for sign-off meetings
- One template can power many pages (e.g., an "Article" template used for every article)

### What templates answer
- Where does each organism live on the page?
- What are the grid/layout rules?
- How does the layout respond to different content lengths / breakpoints?
- What areas are dynamic vs static?

### Examples
| Template | Key organisms |
|---------|--------------|
| Homepage template | hero organism + featured content organism + CTA organism |
| Article template | header organism + article body organism + related content organism |
| Product detail page | header + product info organism + recommendations organism |
| Dashboard template | nav organism + stats grid organism + activity feed organism |
| Search results template | header + filters sidebar organism + result list organism |

---

## Stage 5 — Pages

**Definition:** Specific **instances** of templates with **real representative content**
poured in. The most concrete stage of atomic design.

### Characteristics
- Pages are what **users actually see and interact with**
- Pour in real (or realistic) copy, images, and data
- Expose weaknesses in the design system: if a real headline breaks the layout → fix it at
  the molecule/organism/template level
- Test **content variations**: admin vs guest, empty state vs full state, 1 item vs 100 items
- Essential for stakeholder sign-off and user research sessions

### What pages answer
- Does the design system hold up with production-quality content?
- How do edge cases look (very long text, missing images, empty state)?
- Does personalisation / role-based content break the template?

### Content variation examples to always test:
- Short title (10 chars) vs long title (200+ chars)
- Empty state vs fully populated state
- Low permission user vs admin user
- Single list item vs many list items
- Missing optional content (no avatar, no subtitle, no badge)

---

## Key Principles (Always Apply)

| Principle | What it means |
|-----------|--------------|
| **Non-linearity** | Move between stages freely — refining atoms based on page insights |
| **Part and whole** | Design systems and final UIs are co-created, not sequential |
| **Content & structure** | Templates are structure; pages add content. Both shape each other |
| **Single responsibility** | Molecules especially must do ONE thing well |
| **Technology-agnostic** | Atomic design applies to any UI — React, native mobile, desktop apps |
| **Flexible naming** | Rename stages to fit your org culture if needed (basics/components/features) |
