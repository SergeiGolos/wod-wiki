# Frontmatter Alignment — Working Document

> Status: **draft / in discussion** — not ratified.
> Purpose: propose and track alignment of frontmatter properties and tag
> vocabularies across all markdown content. Edit inline; every table has a
> **Proposal** and **Notes** column for decisions.
>
> Related: `markdown/collections/README.md` (ratified workout/collection standard).

Legend: 🔒 = consumed by code (breaking if renamed) · 📖 = documentation-only (no consumer) · 🆕 = new standard, no consumer yet

**How to read the "How the code uses it" column:** the exact mechanism, not
just the file — what decision the code makes based on the key, and what breaks
or changes if the key is absent/renamed.

---

## 1. Dialect map (868 markdown files, 20 keys, 4 dialects)

| Dialect | Files | Keys | Notes |
|---|---|---|---|
| Workout files (`collections/**`, `feeds/**`) | 673 | `tags` | |
| Collection/feed READMEs | 67 | `template`, `category`, `collection`, `feed` | |
| Canvas pages (`canvas/**`) | 75 | `template`, `route`, `type`, `search`, `title`, `subtitle`, `section`, `order` | |
| Effort definitions (`efforts/**`) | 53 | `id`, `slug`, `label`, `aliases`, `met`, `discipline`, `intensityTier` | |

**Notes:**

-

---

## 2. Workout files (`collections/<slug>/*.md`, `feeds/<slug>/<date>/*.md`)

| Key | Files | Status | Represents | How the code uses it | Proposal | Notes |
|---|---|---|---|---|---|---|
| `tags` | 673 | 🆕 | Discovery labels mirrored from parent collection `category` | **Nothing.** No reader exists. Only generic rendering applies (see §8). | | |
| `title` | 0 | optional | Display-name override | **Nothing.** Display name falls back to `fileToDisplayName(filename)` in `script-collections.ts` / `script-feeds.ts`. | | |
| `search: hidden` | 0 | 🔒 | Exclude from global search | `workoutIndex.ts` `deriveSearchHidden` regexes the raw file for `search:\s*hidden` inside the leading `---` block → sets `WorkoutItem.searchHidden` → `paletteDataSources.ts:60` filters the item out of the **global command palette** results. ⚠️ Narrow effect: `collectionSource` deliberately ignores the flag (`paletteDataSources.test.ts:335`), and it does not hide the file from collection lists or routes — only palette search. | | |

**Notes:**

-

---

## 3. Collection / feed READMEs (`<slug>/README.md`)

| Key | Files | Status | Represents | How the code uses it | Proposal | Notes |
|---|---|---|---|---|---|---|
| `template: canvas` | 67 | 🔒 | "Render me as a canvas page" | **Hard gate.** `parseCanvasMarkdown.ts:609` returns `null` unless `template === 'canvas'`; `canvasRoutes.ts` then drops the file entirely — no route, no page. Missing key = collection has no landing page. | | |
| `category` | 66 | 🔒 | 1–3 grouping tags (controlled vocab, §6) | `parseFrontmatterCategories` (block-YAML `category:` + `- item` lines only — inline `category: [a, b]` is **not** parsed) → stored as `ScriptCollection.categories` / `ScriptFeed.categories` → `collectionGroups.ts` `getCategoryGroups()` inverts it into category→collections map → drives **category filter chips** (`CollectionsNavPanel`), **grouping + filtering** (`CollectionsPage` via `useCollectionsQueryState` URL params), and the **category chip on collection detail pages** (`MarkdownCanvasPage`). Absent key = collection lands in the ungrouped pile. | | |
| `collection: true` | 64 | 📖 | "This directory is a collection" | **Nothing.** Grepped: zero readers. The collections/feeds split is decided by directory path (`markdown/collections/` vs `markdown/feeds/`), not this flag. | | |
| `feed: true` | 2 | 📖 | "This directory is a feed" | **Nothing.** Same as above. | | |
| `description` | 0 | proposed | Card blurb for list pages | Would need a new reader; nothing today. | | |

Identity is **path-derived, never in frontmatter**: collection id = dir name, workout name = filename, feed date = `YYYY-MM-DD` dir (`script-feeds.ts` path regex — a feed item outside a date dir is silently ignored).

**Notes:**

-

---

## 4. Canvas pages (`markdown/canvas/**`)

| Key | Files | Status | Represents | How the code uses it | Proposal | Notes |
|---|---|---|---|---|---|---|
| `search: hidden` | 74 | 🔒 | Exclude from palette search | Same mechanism as §2: `deriveSearchHidden` → `searchHidden` → palette filter. This is where the key is actually used today (74 of 74 occurrences). | | |
| `template: canvas` | 9 | 🔒 | Canvas-page gate | Same hard gate as §3 (`parseCanvasMarkdown.ts:609`). | | |
| `route` | 9 | 🔒 | Mount URL (e.g. `/guide/syntax/basics`) | `parseCanvasMarkdown(raw, defaultRoute)` reads `meta.route` (falling back to the caller-supplied default) → `canvasRoutes.ts` emits `{ route, page }` → `App.tsx:352` registers a React Router `<Route path={route}>` per page. Wrong/duplicate route = broken or shadowed navigation. Collection READMEs omit it and get `/collections/<slug>` from the glob path instead. | | |
| `type` | 9 | 🔒 | Page kind (`syntax`, `home`) | `appNavTree.ts:58` filters `frontmatter?.type === 'syntax'` to build the **syntax section of the nav tree**. Any other value (or absent) = page exists at its route but never appears in that nav section. | | |
| `title` | 65 | 🔒 | Tab label | `page-examples.ts` `getTabExamples(page, section)` — globs `canvas/**`, keeps files whose dir matches `page` **and** `meta.section` matches, then renders `title` as the tab label in the editor's example tabs. | | |
| `subtitle` | 59 | 🔒 | Tab description | Same path as `title` — secondary line under the tab label. | | |
| `section` | 59 | 🔒 | Tab grouping within a page | **Filter key** in `getTabExamples(page, section)` (`page-examples.ts:48`): strict equality against the requested section; a file with the wrong/absent `section` is invisible on that page's tabs. | | |
| `order` | 59 | 🔒 | Sort order within a section | **Sort key** in `getTabExamples` — numeric, defaults to `0` when absent (so missing `order` sorts first, ties broken arbitrarily). | | |

Quests/chapters are **fenced DSL blocks** (` ```quest `, ` ```chapter `) in the body,
not frontmatter — parsed by `parseCanvasMarkdown.ts:410-420`. Out of scope here.

**Notes:**

-

---

## 5. Effort definitions (`markdown/efforts/**`)

Parsed by `src/repositories/effort-markdown.ts` into `IEffort` records in the
effort registry. Two additional code paths watch these keys **in any document**,
not just `efforts/**`:

- `sectionParser.ts:166` (`detectSubtype`): any frontmatter containing `discipline`, `intensityTier`, `aliases`, or `derivation` is classified as an **effort document** → the editor mounts the effort companion overlay on it.
- `FrontmatterCompanion.tsx` reads **and writes** `slug`, `label`, `aliases`, `met`, `discipline`, `intensityTier`, `registrySource` — it supports both the flat shape (these files) and the nested `baseAttributes:` shape.

| Key | Files | Status | Represents | How the code uses it | Proposal | Notes |
|---|---|---|---|---|---|---|
| `id` | 53 | 🔒 | Registry record id (`effort-bundled-air-squat`) | Identity of the `IEffort` record in the registry. | | |
| `slug` | 53 | 🔒 | Durable reference slug | **The identity boundary** (`effort-registry/types.ts:39`: "references should point at the slug"). `EffortResolver.resolveEffort` exact-matches slugs; derivation chains point at `parentSlug`. Rename = every derived effort and stored reference breaks. | | |
| `label` | 53 | 🔒 | Display name | First fuzzy-match candidate and display string. `EffortResolver.ts:49` normalizes and exact-compares label before aliases; also feeds the fuzzy candidate list (`:71`). | | |
| `aliases` | 53 | 🔒 | Alternate names in workout text | **Fuzzy matching input**: `EffortResolver.ts:50-52,71` matches parsed effort text against every alias (`normalizeForFuzzy` exact, then fuzzy). This is how `squats` in a wod block resolves to the `air-squat` effort. | | |
| `met` | 53 | 🔒 | Metabolic equivalent | **Energy analytics input**: `MetMinuteProjectionEngine.ts:43` and `TISProcessor.ts:86` multiply elapsed time by `met` into MET-minutes (calorie projections); unresolved efforts fall back to `DEFAULT_UNRESOLVED_EFFORT_MET` (5.0). Also the base value for derivation coefficients and `hardOverrides.met` (`EffortResolver.ts:125-135`). | | |
| `discipline` | 53 | 🔒 | Movement discipline (analytics) | Rolls up into `disciplineFactor` in the resolved effort (`effortResolution.ts:45`) — the analytics grouping/factor dimension. Distinct from discovery tags (see §7). | | |
| `intensityTier` | 53 | 🔒 | `low` / `moderate` / `high` bucket | Qualitative intensity carried through resolution (`effortResolution.ts:47`, `EffortResolver.ts:155,168`) for analytics/display. Optional — synthetic unresolved efforts have none. | | |

**Notes:**

-

---

## 6. Controlled `category` vocabulary (ratified in `markdown/collections/README.md`)

Current usage across 66 READMEs. Propose renames/merges below; a rename here
means: update READMEs + re-mirror `tags` on that collection's workout files.

| Tag | Group | Collections using it | Proposal (keep / rename → x / merge → y) | Notes |
|---|---|---|---|---|
| `parkour` | Modality | 41 (all ZombieFit) | | |
| `kettlebell` | Modality | 8 | | |
| `swimming` | Modality | 7 | | |
| `barbell` | Modality | 1 (dan-john-40-day feed) | | |
| `clubs` | Modality | 1 (mark-wildman) | | |
| `unconventional` | Modality | 2 (unconventional, the-golos-method) | | |
| `crossfit` | Style | 7 + crossfit-programming feed | | |
| `strength` | Style | 8 + both feeds | | |
| `endurance` | Style | 7 + keith-weber | | |
| `conditioning` | Style | 1 (crossfit-programming feed) | | |
| `competition` | Context | 7 | | |
| `benchmark` | Context | 1 (crossfit-girls) | | |
| `sport` | Context | 2 (girevoy-sport, joe-daniels) | | |
| `triathlon` | Context | 1 (swimming-triathlete) | | |
| `minimalist` | Context | 1 (the-golos-method) | | |

### New tag proposals

Register here **before** use (per the ratified standard):

| Proposed tag | Group | Rationale | Status |
|---|---|---|---|
| | | | |

**Notes:**

-

---

## 7. Cross-dialect collisions (decision points)

Three overlapping vocabularies that must stay semantically distinct:

| Concept | Key | Level | Code path | Proposal | Notes |
|---|---|---|---|---|---|
| Discovery grouping | `category` | collection/feed | `collectionGroups.ts` → chips/filters | | |
| Discovery labels | `tags` | workout | none yet | | |
| Analytics class | `discipline` | effort | `effortResolution.ts` → `disciplineFactor` | | |

⚠️ **Key-name hazard**: `discipline`, `intensityTier`, `aliases`, `derivation`
are subtype triggers (`sectionParser.ts:166`). Using any of them in a
non-effort frontmatter (e.g. as workout metadata) makes the editor mount the
effort companion overlay on that document. Reserve these names for efforts.

Three different "display name" keys:

| Key | Dialect | Code path | Fallback today | Proposal | Notes |
|---|---|---|---|---|---|
| `title` | canvas pages, workout override | `getTabExamples` tab label | filename humanization | | |
| `label` | efforts | resolver match + display | — (required) | | |
| *(path-derived)* | workouts, collections | `toDisplayName` / `fileToDisplayName` | — | | |

Other overlaps:

| Topic | Keys | Code path | Proposal | Notes |
|---|---|---|---|---|
| Cross-dialect shared keys | `template: canvas`, `search: hidden` | page gate / palette filter | | |
| Dead flags | `collection: true`, `feed: true` | none — path decides | | |
| Collection discriminator | path (`collections/` vs `feeds/`) vs explicit `kind:` | `script-collections.ts` / `script-feeds.ts` path regexes | | |

---

## 8. Generic frontmatter behavior (applies to every key, every dialect)

Independent of any specific consumer, all leading `--- … ---` blocks pass
through two generic paths:

- **Editor**: `section-state.ts:463-503` detects frontmatter (opening `---` at
  doc start, non-blank next line, ≥1 `key:` line before the closing `---`) and
  renders it as a distinct section; `frontmatter-preview.ts` can replace it
  with rich widgets (YouTube, Amazon, effort companion).
- **Canvas prose**: `CanvasProse.tsx` `FRONTMATTER_RE` renders a leading
  frontmatter block as a styled metadata card.

Consequence for new keys: any key you add is visible to users as a metadata
card even before a dedicated consumer exists — and if it collides with a
subtype trigger (§7), it activates specialized UI.

---

## 9. Open questions

- [ ] Should `tags` ever diverge from the parent collection's `category` (per-workout overrides), or is mirroring a hard invariant?
- [ ] Do `collection: true` / `feed: true` flags get a consumer, or get deleted?
- [ ] Should READMEs grow `description:` for card blurbs on CollectionsPage / FeedsPage?
- [ ] Is the singleton tail of the category vocab (`barbell`, `clubs`, `triathlon`, `minimalist`, `conditioning`, `benchmark`) worth keeping, or merged upward?
- [ ] `search: hidden` only filters the global palette, not collection lists — is that the intended semantic, or should it hide pages everywhere?
- [ ] `parseFrontmatterCategories` only reads block-style arrays — ratify block style as the standard, or teach the parser inline `[a, b]`?
- [ ]

---

## 10. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-22 | Workout `tags:` frontmatter added to 673 files, mirrored from collection `category` | Standard ratified in `markdown/collections/README.md` |
| 2026-07-22 | `cardio` merged into `endurance`; removed from vocabulary | Only one user (keith-weber); prevents synonym drift |
| 2026-07-22 | `collection: true` / `feed: true` flags kept as documentation-only | User call; no `kind:` discriminator introduced |
| | | |
