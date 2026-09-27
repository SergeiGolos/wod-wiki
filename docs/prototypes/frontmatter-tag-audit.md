# Frontmatter & Typed-Tag Audit

**Status:** Typed-tag conversion **landed** (2026-09-27): 748 corpus files migrated to canonical frontmatter typed keys (`domain`, `format`, `equipment`, `quality`, `intent`), redundant `category:` and uncalibrated `difficulty:` dropped; `SeedImporter` simplified to use native `extractTypedFrontmatterTags` with zero category hacks; `generate:seed` recompiled; full test suite passes (packages 1668, playground unit 2553, storybook 104, seed 11/11).
**Date:** 2026-09-27
**Corpus:** `markdown/` — 888 files: `collections/` 728, `canvas/` 87, `efforts/` 53, `feeds/` 14, `dashboards/` 6. One file has no frontmatter: `markdown/canvas/home/sample-script.md`.
**Related:** `docs/prototypes/seed-data-unification.md` (seed pipeline is the natural processing point), `apps/playground/src/lib/frontmatter.ts` (existing tag extraction)

## Goal

Identify every frontmatter/body property that carries **classification** semantics, and decide which should be converted into **dynamically typed tags** at processing time (seed compile or seed import). The unifying principle: **equipment, type, category, and tags are all one mechanism** — namespaced typed tags — instead of today's three competing systems.

## Current state — three classification systems, zero overlap

| System                               | Where                                | Vocabulary control                                                               |
| ------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- |
| `tags:` frontmatter                  | 680 files (wods, feeds, dashboards)  | Clean: 20 distinct values                                                        |
| `category:` frontmatter              | 67 files (collection READMEs, feeds) | Same words as `tags` — parallel spelling                                         |
| Body pseudo-frontmatter / bold prose | 494 ZombieFit wods + ~110 others     | Broken: 80 distinct free-text `Type` values, 12 incompatible `Difficulty` scales |

The app already treats `tags` and `category` as one slot — `frontmatter.ts:184` reads `meta['tags'] ?? meta['category']` — but nothing classifies beyond that.

## 1. Core frontmatter structure per section

| Key                                                            | wod | README | canvas   | efforts | feeds | dashboards | Purpose                             |
| -------------------------------------------------------------- | --- | ------ | -------- | ------- | ----- | ---------- | ----------------------------------- |
| `template`                                                     | ✓   | ✓      | `canvas` | —       | ✓     | —          | flags the note type as 'template'   |
| `collection: true`                                             | ✓   | ✓      | —        | —       | —     | —          | flags the note type as 'collection' |
| `category` (list)                                              | —   | ✓      | —        | —       | ✓     | —          | is a tag type                       |
| `tags` (list)                                                  | ✓   | —      | —        | —       | ✓     | ✓          | is a default tag type               |
| `title`                                                        | —   | —      | ✓        | —       | —     | ✓          | used to create the page slug        |
| `subtitle` / `section` / `order` / `route` / `type` / `search` | —   | —      | ✓        | —       | —     | —          |                                     |
| `id` / `slug` / `label`                                        | —   | —      | —        | ✓       | —     | —          | id                                  |
| `aliases` (list)                                               | —   | —      | —        | ✓       | —     | —          |                                     |
| `baseAttributes` (map)                                         | —   | —      | —        | ✓       | —     | —          |                                     |
| `feed: true` / `dashboard: true`                               | —   | —      | —        | —       | ✓     | ✓          |                                     |

## 2. The `tags` vocabulary (n=680 files, 20 values)

Values decompose cleanly into four implicit dimensions — evidence that one flat list is several tag types wearing a trench coat:

| Value | n | Implicit dimension |
|---|---|---|
| `parkour` | 494 | domain |
| `crossfit` | 86 | domain |
| `competition` | 71 | intent |
| `kettlebell` | 50 | equipment |
| `strength` | 49 | quality |
| `endurance` | 29 | quality |
| `swimming` | 28 | domain |
| `benchmark` | 18 | intent |
| `sport` | 14 | intent |
| `unconventional` | 11 | equipment |
| `conditioning` | 8 | quality |
| `cardio` | 6 | quality |
| `clubs` | 6 | equipment |
| `minimalist` | 6 | equipment |
| `dashboard` | 6 | ⚠ page-type leak, not a tag |
| `barbell` | 5 | equipment |
| `triathlon` | 4 | domain |
| `climbing` | 1 | domain |
| `recovery` | 1 | quality |
| `coaching` | 1 | ⚠ audience, not a tag |

## 3. Body pseudo-frontmatter (ZombieFit, 494 files)

Second `---` block inside the body — the values actually rendered on effort pages:

| Key                            | Distinct | Values                                                                                                           |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `Category`                     | 1        | `zombie-fit` (constant, derivable from collection — redundant)                                                   |
| `Type`                         | 6        | For Time (339), Intervals (55), EMOM (42), AMRAP (39), Skill (16), Max Weight (4)                                |
| `Difficulty`                   | 4        | `Beginner / Advanced / Expert` (488 — carries no information), Advanced (4), Beginner/Advanced (2), Beginner (1) |
| `date`                         | 487      | `yyyy-mm-dd`, ≈ filename identity — temporal, **not** a tag                                                      |
| `original_url` / `wayback_url` | 494      | provenance links — **not** tags                                                                                  |

## 4. Bold inline prose (other collections, 89–109 files)

| Key               | Distinct  | Sample                                                                                                                                   |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `**Category:**`   | 63        | `CrossFit Benchmark`(14), `The Golos Method`(5), `Girevoy Sport Training`(3)… — mostly restates the collection name; redundant           |
| `**Type:**`       | 80        | `For Time`(13), `AMRAP (As Many Rounds As Possible)`, `Strength Complex`, `Competition Event`, `Individual Medley`, `Aerobic Endurance`… |
| `**Difficulty:**` | 12 scales | Intermediate(25), Advanced(25), Intermediate to Advanced(23), Elite(7), Olympic(4)…                                                      |
| `**Format:**`     | 3         | prose spellings of AMRAP/EMOM/For Time                                                                                                   |

## 5. Efforts `baseAttributes` (n=53)

| Field | Distinct | Values |
|---|---|---|
| `discipline` | 10 | strength(19), bodyweight(8), gymnastics(8), kettlebell(4), cycling(3), rowing(3), running(3), recovery(2), swimming(2), walking(1) |
| `intensityTier` | 3 | high(31), moderate(16), low(6) |
| `met` | 15 | 1.0–14.5 numeric — metric, **not** a tag |

## 6. Proposed typed-tag model

Everything classification-shaped becomes a **namespaced typed tag** produced at processing time (seed compile in `scripts/generate-seed.ts`, or import in `SeedImporter` — one place, compile-time preferred since the corpus is static). The stored tag type registry (`TagType` in `src/types/storage.ts:96`, open `string & {}`) already admits arbitrary type names; `frontmatter.ts:223` already excludes `tags`/`category` from typed matching, so no double-counting.

| Tag type | Sources unified | Proposed vocabulary |
|---|---|---|
| `domain` | `tags` (parkour, crossfit, swimming, triathlon, climbing) + `**Category:**` restating collection | 5 values today; derivable from collection for new content |
| `equipment` | `tags` (kettlebell, clubs, barbell, unconventional, minimalist) + `baseAttributes.discipline` equipment half | kettlebell, barbell, clubs, macebell, clubbell, bodyweight, machine… |
| `quality` | `tags` (strength, endurance, conditioning, cardio, recovery) | strength, endurance, conditioning, cardio, recovery — `cardio`→`conditioning` merge candidate |
| `type` (format) | ZombieFit `Type` (6 clean) + `**Type:**` (80 free-text) + `**Format:**` (3) | for-time, amrap, emom, intervals, skill, max-weight, competition — see §7 |
| `intensity` | `baseAttributes.intensityTier` | high, moderate, low |
| `intent` | `tags` (competition, benchmark, sport) | competition, benchmark, sport |

**Stays out of tags:**

- `date` (temporal grouping), `original_url`/`wayback_url` (provenance), `met` (metric)
- `dashboard` / `collection` / `feed` / `template` / `search` — page-type discriminators; `dashboard` currently leaks into `tags` and should be re-homed
- `title`/`label`/`slug`/`order`/`route` — identity and layout
- `Difficulty` — no usable signal: 488/495 files say `Beginner / Advanced / Expert`; 12 incompatible scales elsewhere. Drop, or re-add later as a typed tag with a real ordinal scale.
- `Category` (body) — constant (`zombie-fit`) or restates collection name → derived `domain`, never authored.

## 7. `type` normalization table

ZombieFit's six values are the controlled base; the 80 free-text values map onto them by rule:

| Free-text value | → typed tag |
|---|---|
| `For Time`, `For Time / Volume Training` | `type:for-time` |
| `AMRAP`, `AMRAP (As Many Rounds As Possible)`, `**Format:** AMRAP (…)` | `type:amrap` |
| `EMOM`, `**Format:** EMOM (…)` | `type:emom` |
| `Intervals`, `Distance Intervals` | `type:intervals` |
| `Skill`, `Technique Focus` | `type:skill` |
| `Max Weight` | `type:max-weight` |
| `Competition Event`, `Girevoy Sport Competition` | `type:competition` |
| `Strength Complex`, `Progressive Strength`, `Ballistic / Flow Movement` | `type:strength-complex` (new — review) |
| `Endurance`, `Aerobic Endurance`, `Sport-Specific Endurance`, `Race-Specific` | `type:endurance` (review: quality vs format) |
| `Individual Medley` | `type:swimming-im` (review: domain-specific) |
| anything else | **fallback rule:** lowercase, strip parenthetical, kebab-case; flag in importer parity report |

~15 low-frequency `Type` values have no obvious home (e.g. dance-therapy one-offs) — unresolved, see open questions.

## 8. Decisions needed

1. **Namespace style**: `equipment:kettlebell` prefixed-value vs separate `TagType='equipment'` + value `kettlebell`. The app's `TagType` registry supports the latter natively; the former is one string. Lean: typed type + value (matches `TagTypeStorage`).
2. **Split today's flat `tags` at processing time** (authoritative mapping in §2) vs leave legacy files flat and only type new content. Lean: split at compile time — corpus is static, one migration.
3. **`quality` vs `type` boundary**: is `endurance` a quality (capacity) or a format (session shape)? Appears as both today.
4. **`cardio`/`conditioning` merge** — two values, same meaning.
5. **`difficulty`** — drop entirely vs define a real scale (5-point ordinal) and normalize the 12 ad-hoc scales.
6. **`dashboard` tag** — re-home to a page-type flag like `collection`/`feed`.
7. **Where conversion runs**: `generate-seed.ts` (compile) vs `SeedImporter.ts` (import). Compile-time keeps IDB schema clean; import-time keeps the seed byte-faithful to the markdown.

## Evidence trail

- Audit script: frontmatter keys, `tags` values, pseudo-fm extraction — counts above are exact (walked all 888 files, 2026-09-27).
- Tag-slot equivalence: `apps/playground/src/lib/frontmatter.ts:184` (`meta['tags'] ?? meta['category']`), typed exclusion `:223`.
- Tag type registry: `apps/playground/src/types/storage.ts:96`.
- Seed pipeline: `scripts/generate-seed.ts`, `apps/playground/src/services/seed/SeedImporter.ts`.
