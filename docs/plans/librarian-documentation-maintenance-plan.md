# Librarian Documentation Maintenance Plan — WOD Wiki

> **For the Librarian Agent:** Use this document as the operating plan for keeping WOD Wiki documentation organized, current, and easy to navigate.

**Goal:** Maintain a clean, reliable documentation system that prevents drift, duplication, and stale content from returning.

**Architecture:** WOD Wiki docs should stay grouped by purpose: plans, reports, audits, design-system references, deep dives, testing, domain model, and archive. The librarian agent should act as a curator, not a content author: it inventories, classifies, normalizes, archives, links, and flags gaps. When a document no longer reflects current product or architecture state, the librarian should either update it, move it to the archive, or replace it with a short pointer note.

**Tech Stack:** Markdown, Obsidian-style notes, WOD Wiki repo docs, Bun-based project workflow.

---

## Current Problem Summary

The current docs set is much better than it was, but it still has the usual failure modes of a project that moves fast:

- multiple document types mixed together without obvious boundaries
- overlapping content spread across plans, reports, audits, and deep dives
- older research and roadmap docs that are easy to mistake for current truth
- inconsistent naming conventions
- some folders that are only half-defined by convention rather than by explicit rules
- missing index pages / READMEs for people who are new to the docs tree
- no routine maintenance loop to keep the structure healthy

The librarian’s job is to stop this from regressing.

---

## Operating Rules

1. **Prefer organization over deletion.** Archive first unless a file is clearly junk or temporary.
2. **Do not rewrite meaning.** The librarian may restructure and clarify, but should not invent new product intent.
3. **One doc, one purpose.** If a file mixes several purposes, split it or add a pointer note to the canonical doc.
4. **Current truth belongs near the top.** Newest authoritative docs should be easy to find from index pages.
5. **Historical material must be labeled historical.** If it remains useful, move it to archive and mark it clearly.
6. **Every folder needs a purpose.** If a folder cannot be explained in one sentence, it needs cleanup.
7. **When in doubt, add a link or index.** Navigation problems are often solved with better pointers, not more docs.

---

## Task 1: Build and maintain a documentation inventory

**Objective:** Keep a living map of what documentation exists and what each file is for.

**Actions:**
- Scan `docs/` and record each folder’s purpose.
- Group files by type: plans, reports, audits, design-system, deep dives, domain model, testing, archive.
- Tag each file as one of:
  - current / canonical
  - supporting reference
  - historical / archived
  - obsolete / candidate for removal
- Identify orphan files that do not fit the taxonomy.
- Keep the inventory itself in a stable location so future cleanup is repeatable.

**Suggested output files:**
- `docs/reports/documentation-inventory.md`
- `docs/plans/documentation-maintenance-index.md`

---

## Task 2: Normalize folder taxonomy

**Objective:** Make the docs tree self-explanatory.

**Actions:**
- Verify that every top-level docs folder has a clear purpose.
- Consolidate overlapping categories when they create confusion.
- Standardize the meaning of:
  - `plans/`
  - `reports/`
  - `audits/`
  - `design-system/`
  - `deep-dives/`
  - `domain-model/`
  - `testing/`
  - `archive/`
- Move one-off task notes into either a broader plan or the archive.
- Avoid creating new root-level folders unless the taxonomy genuinely needs them.

**Definition of done:** A contributor can guess the correct folder from the filename alone most of the time.

---

## Task 3: Add index pages for every major docs area

**Objective:** Make navigation obvious.

**Actions:**
- Create or update README/index docs for each major folder.
- Each index should answer:
  - what belongs here
  - what does not belong here
  - which docs are canonical
  - which docs are historical
- Add “start here” pointers for high-traffic areas such as:
  - design-system
  - testing
  - plans
  - archive
- Link related docs together so readers do not have to search the tree manually.

**Suggested output files:**
- `docs/README.md`
- `docs/design-system/README.md`
- `docs/plans/README.md`
- `docs/reports/README.md`
- `docs/audits/README.md`
- `docs/archive/README.md`

---

## Task 4: Standardize document naming

**Objective:** Reduce ambiguity and make sorting/search easier.

**Actions:**
- Choose a naming convention for each doc type.
- Prefer descriptive, searchable filenames.
- Use dates only when the date adds value.
- Avoid ambiguous names like `Untitled`, `notes`, `draft`, or generic `README` without context.
- Normalize casing and separator style within each folder.

**Examples of good names:**
- `documentation-maintenance-plan.md`
- `storybook-playground-coverage-assessment.md`
- `navigation-page-contract.md`
- `archive/research-2026-q1/note-editor-prd.md`

**Examples of bad names:**
- `final-final.md`
- `misc.md`
- `notes 2.md`
- `untitled.canvas`

---

## Task 5: Triage stale, duplicate, or misleading docs

**Objective:** Prevent old documents from being mistaken for current guidance.

**Actions:**
- Review docs that describe old proposals, experiments, or roadmap items.
- Decide for each file:
  - keep as current reference
  - update to match implementation
  - archive as historical context
  - remove if it is accidental clutter
- Check for duplicate coverage across:
  - research docs
  - plans
  - audits
  - reports
- If two docs overlap but only one should be canonical, add a pointer note from the non-canonical doc to the canonical one.

**Definition of done:** No important document leaves the reader guessing whether it is current.

---

## Task 6: Create archive rules and retention policy

**Objective:** Preserve history without letting archive become a junk drawer.

**Actions:**
- Split archive into subfolders by time period or theme.
- Add a README explaining what belongs in archive.
- Define retention rules:
  - keep high-value historical references
  - remove temporary artifacts and obsolete scratch notes
  - periodically re-evaluate archive bloat
- Add a short “archived because…” note to moved files when useful.

**Recommended archive buckets:**
- `archive/research-2026-q1/`
- `archive/feature-roadmap-2026-04/`
- `archive/diagrams/`
- future dated buckets as needed

---

## Task 7: Maintain design-system integrity

**Objective:** Keep the design-system docs coherent and useful as a source of truth.

**Actions:**
- Review design-system docs for overlap between layout, navigation, templates, and page routes.
- Ensure templates and routes are clearly separated.
- Keep guidance docs distinct from spec docs.
- Add links from design-system docs to the implementation docs they describe.
- Mark obsolete design guidance as archived if the implementation has changed.

**High-value checks:**
- Are page routes documented in a way that matches current navigation?
- Do templates describe actual reusable patterns, or just old experiments?
- Is there one obvious place to look for a new page pattern?

---

## Task 8: Keep plans from turning into permanent archives

**Objective:** Prevent the plans folder from accumulating stale work-in-progress forever.

**Actions:**
- Review plans for completion status.
- Move finished plans to a completion summary or archive when appropriate.
- Split large planning docs into:
  - current action items
  - completed history
  - future ideas
- Maintain a short index of active plans.
- Remove or archive plans that are fully superseded.

**Definition of done:** Active planning docs are truly active, not just old project memory.

---

## Task 9: Keep reports and audits easy to trust

**Objective:** Make reports a reliable record of analysis, not a pile of stale investigations.

**Actions:**
- Ensure each report clearly states:
  - date
  - scope
  - conclusion
  - whether it remains valid
- Group reports by topic when needed.
- Add explicit “superseded by” links when a newer report replaces an older one.
- Prevent audits from being mistaken for requirements.

**Rule:** Reports explain the state of the system; they do not define the system.

---

## Task 10: Add maintenance hygiene checks

**Objective:** Stop documentation drift before it grows.

**Recurring checks:**
- monthly inventory review
- quarterly archive review
- stale-doc review after major feature work
- naming and folder compliance check before adding new docs
- link check for obvious broken references or outdated pointers

**Outputs:**
- a short hygiene log
- a list of docs needing review
- a list of newly archived items

---

## Task 11: Create contributor-facing documentation rules

**Objective:** Teach future contributors how to keep the docs clean.

**Actions:**
- Write a short “how to add docs” guide.
- Document where each doc type belongs.
- Explain when to use:
  - plan
  - report
  - audit
  - design-system note
  - archive
- Provide examples of good filenames and good folder placement.
- Make the rules concise enough that people will actually read them.

**Suggested location:**
- `docs/README.md`
- optionally `docs/plans/documentation-authoring-guide.md`

---

## Task 12: Flag unresolved doc gaps to humans

**Objective:** Avoid silent assumptions.

**Actions:**
- If the librarian cannot determine whether a document is current, mark it for review.
- If a folder’s purpose is unclear, ask for a decision instead of guessing.
- If two docs conflict, surface the conflict and recommend the likely canonical path.
- If a cleanup would remove information that might still matter, preserve it in archive and note the uncertainty.

**Rule:** The librarian can organize, but humans decide intent when the source of truth is ambiguous.

---

## Suggested Priority Order

### Phase 1 — Stabilize
1. inventory the docs tree
2. add missing index pages
3. normalize naming conventions
4. flag obvious stale or duplicate docs

### Phase 2 — Clean
5. archive historical material
6. consolidate overlapping planning docs
7. trim accidental artifacts and dead notes
8. mark canonical docs clearly

### Phase 3 — Govern
9. establish retention and review cadence
10. add contributor guidance
11. maintain monthly/quarterly hygiene passes

---

## Verification Checklist

Before closing a maintenance pass, confirm:

- [ ] each major docs folder has a clear purpose
- [ ] canonical docs are easy to identify
- [ ] historical docs are clearly archived
- [ ] no obvious duplicates remain at the top level
- [ ] filenames are consistent and searchable
- [ ] index pages point readers to the right place
- [ ] stale docs are either updated, archived, or explicitly marked
- [ ] the docs tree still reflects the current project structure

---

## Success Criteria

The librarian is doing its job when:

- new contributors can find the right doc quickly
- older research no longer looks like current guidance
- folder purpose is obvious from the tree
- docs stay organized without periodic major rescue work
- cleanup becomes routine instead of a one-off project

---

## Notes for the Librarian Agent

- Prefer small, reversible moves.
- Preserve useful history.
- Make the structure obvious.
- Leave breadcrumbs for humans.
- When a document is questionable, annotate it rather than silently redefining it.

This plan is intentionally operational: it should help the librarian keep WOD Wiki from drifting back into messy documentation chaos.
