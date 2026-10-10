---
name: catalog-handoff
description: Build a sourced collection/catalog in markdown/collections/<slug>/ — source vetting, PDF parsing, wod-wiki time-block syntax, file conventions, and the scale pattern for parallel agents.
license: MIT
---

# Handoff: Build a Catalog

Generic playbook for adding a sourced collection to `markdown/collections/<slug>/`.

## 1. Understanding sourced data
- **Primary source first**: official PDFs/rulebooks/publisher pages. Third-party only when the official one is gated (app/email) — attribute in-file, name the program and author.
- **PDF parsing**: `pdftotext -layout`; for multi-column layouts crop columns vertically to kill running heads/footers. Spot-check hero rows by name — footers shred first data columns.
- **Dates**: normalize to `YYYY-MM-DD`. Cross-check each against the source's own "first posted" lines; flag name-reuse (a name reassigned to a different workout — manifest/original wins), impossible dates (enlistment year ≠ post year), and publication-date-only entries (flag as collection-add, not first post).
- **Conflicts**: source text beats current site regressions; record every conflict decision in the final report.

## 2. wod-wiki syntax (validated, not guessed)
- All workout content goes in ` ```time ` blocks. Bar: `createParser().read(block, 'crossfit')` from repo root — **zero errors**.
- `(N)` round header owns indented lines; label optional `(3 Rounds)`.
- Durations: `10:00 AMRAP` countdown; bare line or `^` = count-up stopwatch.
- EMOM: `(10) :60 EMOM` + indented work; `(5) 2:00 EMOM` for longer windows; sibling lines rotate across windows.
- Rest: `*:30 Rest` = required (unskippable); `:30 Rest` = optional; the word `Rest` = cue.
- Rep schemes: dash-separated (`21-15-9`) = one round per value.
- Loads inline (`30 Clean & Jerks 185lb`); gender scaling as `## Scaling` tables built from the source's ♀/♂ lines — omit the section when the workout has no differentiation.

## 3. Structure keys
- **Location**: `markdown/collections/<slug>/` — flat; sibling catalogs (games/heroes/girls/zombiefit/mark-wildman) are named for the subject, no forced prefix.
- **README.md** (the catalog card): frontmatter `template: canvas`, `collection: true`, `category: [...]` (add `equipment:`/`quality:` only for gear catalogs); body = source attribution, entry count, naming rule, per-file conventions.
- **Content frontmatter by domain** — don't invent:
  - dated events (games): `date, domain, format, intent`
  - benchmarks/heroes: `date, domain, format, intent: benchmark`
  - program days: `week, day, domain, format, intent: training` — never synthetic dates
- **File naming**: date-prefixed for events (`YYYY-MM-DD-event-NN.md`); slug for people/workouts; `week-NN-day.md` for programs. Rest days get no file.
- **Sections per file**: `# Title`, `## Description`, time block, `## Scaling` (if applicable), `## Profile|Notes|Breakdown`, `## Collectible Metrics` — follow the nearest sibling catalog and don't fork conventions.
- **Gate + cleanup**: after writing, parse every `time` block in the collection; `rm` temp check scripts; never run repo tests/build mid-flight; never edit another catalog's README; unexpected repo changes are the user's — adapt, don't revert.

## 4. Scale pattern
- Under ~15 files: write directly.
- Larger: lock conventions in one contract, fan parallel agents (slices of ~27), each self-validates with the parser; parent handles name-fixes, renames, cross-collection gate, and assembles the index README from disk — not from agent messages.
