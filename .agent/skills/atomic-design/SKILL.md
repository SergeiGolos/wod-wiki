---
name: atomic-design
description: >
  Atomic Design methodology for decomposing, auditing, and rebuilding existing UIs into
  hierarchical design systems. USE FOR: analyzing an existing UI and categorizing its elements
  into atoms/molecules/organisms/templates/pages; refactoring a monolithic component into
  atomic pieces; building a new design system from scratch; verifying a design system's
  hierarchy and reusability. DO NOT USE FOR: general CSS/styling questions (use
  frontend-design); component state management (use react-patterns); layout algorithms
  (use web-design-guidelines).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design Skill

> **Philosophy:** Interfaces are hierarchies of reusable parts, not isolated pages.
> Decompose before you compose. See the atoms before you paint the page.
> **Source doctrine:** Brad Frost — *Atomic Design* (atomicdesign.bradfrost.com/chapter-2)

---

## 🎯 Selective Reading Rule (MANDATORY)

Read **REQUIRED** files first; consult **Optional** files only when the task demands it.

| File | Status | When to Read |
|------|--------|--------------|
| [methodology.md](methodology.md) | 🔴 **REQUIRED** | Always — the 5-stage model |
| [audit.md](audit.md) | 🔴 **REQUIRED** | When analysing an existing UI |
| [refactoring.md](refactoring.md) | ⚪ Optional | Restructuring existing components |
| [patterns.md](patterns.md) | ⚪ Optional | Common element examples per stage |
| [checklist.md](checklist.md) | ⚪ Optional | Validating a completed design system |

> 🔴 **methodology.md + audit.md are ALWAYS read. Others only when relevant.**

---

## 🔑 Five-Stage Quick Reference

| Stage | What it is | Can be broken down further? | Example |
|-------|-----------|----------------------------|---------|
| **Atom** | Smallest functional UI unit | No | `<button>`, `<input>`, icon, label, color token |
| **Molecule** | Simple group of atoms with one job | Into atoms | Search form (label + input + button) |
| **Organism** | Complex section made of molecules ± atoms | Into molecules/atoms | Header (logo + nav + search form) |
| **Template** | Page layout with component placeholders | Into organisms | Homepage wireframe with real layout |
| **Page** | Template filled with real representative content | Into template | Live homepage with actual copy & images |

---

## ⚠️ CRITICAL: ASK BEFORE ASSUMING

> **If the user points at a UI with no decomposition goal stated, ASK:**

1. **What is the deliverable?**
   - "Do you want a full audit of the existing UI's hierarchy, or are we refactoring specific components?"
2. **What tech stack is in use?**
   - "Are we working in React/Vue/Svelte/plain HTML? This shapes how atoms become components."
3. **What is the target output?**
   - "Should I produce a component inventory, file-structure proposal, or code stubs?"

> ⛔ Do NOT silently assume every HTML element is an atom — assess function first.

---

## 🔧 Workflow: Applying Atomic Design to an Existing UI

Follow this order for decomposition work:

```
1. OBSERVE   → Screenshot / read the existing UI or component tree
2. INVENTORY → List all distinct visual / interactive elements
3. CLASSIFY  → Apply the 5-stage hierarchy (see audit.md)
4. MAP       → Draw dependency graph (which molecules use which atoms)
5. REFACTOR  → Propose or implement restructured files (see refactoring.md)
6. VALIDATE  → Run checklist (see checklist.md)
```

---

## 🔗 Related Skills

| Need | Skill |
|------|-------|
| Styling & visual design | `frontend-design` |
| React component patterns | `react-patterns` |
| Component testing strategy | `testing-patterns` |
| Design documentation | `technical-writer` |
