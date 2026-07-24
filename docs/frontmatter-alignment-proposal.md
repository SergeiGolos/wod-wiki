# Frontmatter Standard — Proposal

> Status: **proposal** — nothing here is implemented. The working inventory and
> consumer analysis lives in `docs/frontmatter-alignment.md`; the currently
> ratified subset lives in `markdown/collections/README.md`.
>
> This document proposes one standardized frontmatter schema for each of the
> four markdown file types, the unification of feeds and collections into a
> single content type, and a single universal `type:` discriminator.

## The universal discriminator: `type:`

Every markdown file declares what it is with one key. Five values:

| `type:` | What it is | Searchable | Replaces |
|---|---|---|---|
| `canvas` | Interactive page mounted at a route | ✔ | `template: canvas` on canvas pages |
| `group` | Grouping README — combines items under one URL slug | ✔ | `template: canvas` + `collection: true` / `feed: true` flags |
| `note` | Plain content (workout items, general notes) | ✔ | *(default — no key existed)* |
| `syntax` | Syntax-guide samples and prose; excluded from search | ✘ | `search: hidden` |
| `effort` | Exercise definition carrying analytics metadata | ✘ | *(key-sniffing in `sectionParser.ts:166`)* |

**`equipment` is the one other universal key.** Optional on every type —
groupings, items, canvas pages, samples, and efforts may all declare the
apparatus they need. It is a discovery axis ("what can I do with a
kettlebell?"), never an analytics attribute, and shares the controlled-
vocabulary discipline of `category`/`tags` (§5).

**`search: hidden` is abolished.** Searchability is a consequence of type:
`syntax` and `effort` are never searchable; everything else always is. One
key, one concept, no parallel `search:` mechanism.

**Default:** a file with no `type:` is a `note`. Items therefore need no
explicit declaration (though explicit is allowed).

**Collision resolved:** canvas pages already carry `type: syntax|home` for
nav placement (`appNavTree.ts:58`). That key is renamed **`nav:`** so `type:`
can mean file-kind everywhere. Note the deliberate reuse: `type: syntax`
(non-searchable samples) and `nav: syntax` (syntax-guide nav section) are
different axes that happen to share a word — a canvas page about syntax is
`type: canvas` + `nav: syntax`; a sample embedded in it is `type: syntax`.

### Migration mapping

| Current frontmatter | New frontmatter |
|---|---|
| canvas page: `template: canvas` + `type: syntax` | `type: canvas` + `nav: syntax` |
| grouping README: `template: canvas` + `collection: true` / `feed: true` | `type: group` (flags deleted) |
| page sample: `search: hidden` + `title`/`section`/`order` | `type: syntax` + `title`/`section`/`order` (search key deleted) |
| workout item: `tags:` | `type: note` optional (absence defaults to `note`) + `tags:` |
| effort: `slug`/`label`/`aliases`/`met`/… | `type: effort` + same keys |

### Code touchpoints for the rename

| Consumer | Today | After |
|---|---|---|
| `parseCanvasMarkdown.ts:609` | gate: `template === 'canvas'` | gate: `type` ∈ {`canvas`, `group`} |
| `workoutIndex.ts` `deriveSearchHidden` | regex for `search: hidden` | `type === 'syntax'` (or `effort`) → excluded |
| `paletteDataSources.ts:60` | filters `searchHidden` | same flag, new source |
| `appNavTree.ts:58` | `frontmatter.type === 'syntax'` | `frontmatter.nav === 'syntax'` |
| `sectionParser.ts:166` | effort subtype sniffed from `discipline`/`intensityTier`/`aliases`/`derivation` | `type: effort` primary; key-sniffing kept one release for back-compat, then removed |

---

## The four file types

| # | Type | `type:` | Location | Role |
|---|---|---|---|---|
| 1 | **Grouping page** | `group` | `collections/<slug>/README.md` (feeds merge in) | Combines items under one URL slug |
| 2 | **Canvas page** | `canvas` | `canvas/**/*.md` (README-style pages) | Full interactive pages mounted at a route |
| 3 | **Page sample** | `syntax` | `canvas/<page>/<file>.md` | Editable tab examples embedded in canvas pages; never searchable |
| 4 | **Effort** | `effort` | `efforts/<discipline>/<name>.md` | Exercise definitions carrying analytics metadata |

Items (workout files) are not a fifth type — they are `note`s that belong to a
grouping (§1), and their frontmatter is defined there.

---

## 1. Grouping page (`type: group`)

**Feeds and collections become one type.** A grouping is a directory of items
under a slug. The *only* difference between today's two flavors is that feed
items are bound to a calendar day — and that binding moves from the directory
layout (`feeds/<slug>/YYYY-MM-DD/`) into an optional `date:` field on the item
itself. No `collection: true` / `feed: true` flags; no parallel directory trees.

```yaml
---
type: group               # REQUIRED
title: The Golos Method   # REQUIRED — display name (replaces toDisplayName(dir))
description: Short blurb  # OPTIONAL — card text on list pages
category:                 # REQUIRED, 1–3 — controlled vocabulary
  - kettlebell
  - strength
equipment:                # OPTIONAL — apparatus the grouping revolves around
  - kettlebell
listing: by-date          # OPTIONAL — by-date | by-name; default derived (below)
---
```

| Key | Req | Type | Semantics |
|---|---|---|---|
| `type` | ✔ | `group` | Renders as the grouping's landing page at its slug route |
| `title` | ✔ | string | Display name everywhere (chips, cards, nav). Ends path-derived humanization |
| `description` | – | string | Card blurb for the grouping list page |
| `category` | ✔ | 1–3 tags | Controlled vocabulary (alignment doc §6); drives chips/filtering, mirrors to items as `tags` |
| `equipment` | – | list | Apparatus associated with the grouping; discovery filter on list pages. Items inherit unless they declare their own |
| `listing` | – | `by-date` \| `by-name` | Presentation hint. Default: `by-date` if ≥1 item carries `date:`, else `by-name` |

### Item frontmatter (workout files — `type: note`)

```yaml
---
title: Fran               # OPTIONAL — override when filename humanizes poorly
date: 2025-12-08          # OPTIONAL — ISO date; presence binds the item to that
                          #   day in a by-date listing. THIS is the feed marker.
tags:                     # REQUIRED — mirror of the grouping's category
  - crossfit
equipment:                # OPTIONAL — apparatus this item needs; defaults to
  - pull-up-bar           #   the grouping's equipment when omitted
---
```

| Key | Req | Semantics |
|---|---|---|
| `date` | – | **The feed/collection discriminator.** Present → item appears in a day-grouped listing bound to that date; absent → plain named item. Replaces the `YYYY-MM-DD` directory level entirely |
| `tags` | ✔ | Mirror of grouping `category`; per-item extension is an open question (§6) |
| `equipment` | – | Apparatus required to perform the item; inherited from the grouping when absent, so only divergent items declare it |
| `title` | – | Display-name override |
| `type` | – | `note`; may be omitted (absence defaults to `note`) |

### Migration sketch (unification + rename together)

1. `parseCanvasMarkdown`: gate on `type` ∈ {`canvas`, `group`}; read `nav:` for placement.
2. `script-collections.ts` / `script-feeds.ts`: read optional `date:` from item frontmatter instead of the path regex.
3. Script over 868 files: apply the mapping table above (READMEs, canvas pages, samples, efforts, items).
4. For each `feeds/<slug>/<date>/<file>.md`: inject `date: <date>`, move file to `<slug>/<file>.md`; merge `feeds/` into `collections/`.
5. Delete `search: hidden` everywhere; convert affected files to `type: syntax`.
6. Add `title:` to grouping READMEs where slug humanization is poor (all `ZombieFit-org-*`).
7. `workoutIndex.ts`: replace `deriveSearchHidden` with type parsing; fix category depth after the feed move.

---

## 2. Canvas page (`type: canvas`)

```yaml
---
type: canvas              # REQUIRED
route: /guide/syntax      # REQUIRED — mount URL (group READMEs excepted:
                          #   theirs is derived from the slug)
nav: syntax               # OPTIONAL — nav-section membership (was `type:`);
                          #   only `syntax` enters the syntax nav today
equipment:                # OPTIONAL — rarely used on pages; available for
  - kettlebell            #   equipment-specific guide pages
---
```

| Key | Req | Semantics |
|---|---|---|
| `type` | ✔ | `canvas` — page gate |
| `route` | ✔ | React Router mount path; must be unique |
| `nav` | – | Nav placement. Proposed closed vocabulary: `syntax` \| `home` \| `guide` — ratify before more values appear |

Page body features (quests, chapters, widgets, heading attributes) are fenced
DSL, not frontmatter — unchanged by this proposal.

---

## 3. Page sample (`type: syntax`)

Samples are editor-tab content for a parent canvas page. They are **never
searchable** — expressed by the type itself, no separate `search:` key.

```yaml
---
type: syntax              # REQUIRED — marks the file as non-searchable sample
title: Timers and Rest    # REQUIRED — tab label
subtitle: Countdowns...   # OPTIONAL — tab description
section: basics           # REQUIRED — tab group; strict-equality filter key
order: 3                  # REQUIRED — numeric sort within section (default 0
                          #   sorts first, which is never what you want)
equipment:                # OPTIONAL — when the sample demonstrates
  - rower                 #   equipment-specific syntax
---
```

`syntax` is also available for any non-sample prose that should stay out of
search (guides-in-progress, staging notes) — same type, same rule.

---

## 4. Effort (`type: effort`)

```yaml
---
type: effort              # REQUIRED — replaces key-sniffing as the primary
                          #   effort marker (sectionParser.ts:166)
slug: air-squat           # REQUIRED — durable identity; references and
                          #   derivations point here. Never rename casually.
label: Air Squat          # REQUIRED — display name + first fuzzy-match candidate
aliases:                  # REQUIRED (may be []) — fuzzy-match inputs
  - air squat
  - squats
met: 5.5                  # REQUIRED — MET-minutes / calorie analytics input
discipline: bodyweight    # REQUIRED — analytics grouping (disciplineFactor)
intensityTier: moderate   # OPTIONAL — low | moderate | high
equipment:                # OPTIONAL — apparatus the exercise is performed
  - kettlebell            #   with; omit for bodyweight movements
id: effort-bundled-air-squat  # OPTIONAL — registry record id
---
```

**Reserved names:** `slug`, `label`, `aliases`, `met`, `discipline`,
`intensityTier`, `derivation` remain effort-only. During the back-compat
window the editor still sniffs them (`sectionParser.ts:166`), so no other
file type may use these keys; after migration, `type: effort` is the sole
marker and the sniffing code is deleted.

---

## 5. Cross-type invariants

1. **One discriminator:** `type:` ∈ {`canvas`, `group`, `note`, `syntax`, `effort`}. Absence = `note`. Closed set — new values are proposed in this document first.
2. **Searchability is derived from `type:`** (`syntax`, `effort` excluded) — no `search:`, `draft:`, `private:`, or `published:` keys, ever.
3. **Identity is path- or slug-derived, never duplicated in frontmatter** — one exception: grouping READMEs carry `title:` because slug humanization is lossy (`ZombieFit-org-2012-May` → "Zombiefit Org 2012 May").
4. **One tag vocabulary** for discovery (`category` on groupings, mirrored as `tags` on items), kept separate from the analytics taxonomy (`discipline` on efforts).
5. **One equipment vocabulary** (`equipment:`), optional everywhere, block-style list. Discovery metadata only — it must never feed analytics (`met`, `disciplineFactor`). Seed vocabulary to ratify: `bodyweight`, `kettlebell`, `barbell`, `dumbbell`, `clubs`, `macebell`, `sandbag`, `pull-up-bar`, `rings`, `rope`, `rower`, `bike`, `pool`, `box`, `medicine-ball`, `resistance-band`.
6. **Block-style YAML arrays only** (`key:` + indented `- item`) — the existing parser reads nothing else; ratify rather than teach it inline style.
7. **Nav placement is `nav:`**, not `type:` — file-kind and nav-section are different axes.
8. **Inheritance rule:** an item without `equipment:` inherits its grouping's list; an effort without `equipment:` means bodyweight.

---

## 6. Open questions

- [ ] Ratify the seed `equipment` vocabulary (§5) — prune or extend before rollout?
- [ ] Unify routes too (`/library/<slug>`), or keep `/collections/*` and `/feeds/*` over the unified store?
- [ ] May an item's `tags` extend beyond the grouping's `category`, or is mirroring a hard invariant?
- [ ] May one item carry multiple `date`s (appears on several days), or is date single-valued?
- [ ] Deprecate effort `id:` in favor of `slug`?
- [ ] Ratify the `nav:` vocabulary (`syntax | home | guide`) — what values are allowed?
- [ ] Should `type:` be explicit on all 673 items, or is the absence-defaults-to-`note` rule enough?
- [ ] Keep `markdown/collections/` as the unified root name, or rename to `markdown/library/`?
- [ ] Back-compat window for effort key-sniffing: one release, or until all user-created effort docs in IndexedDB are migrated?

---

## 7. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-22 | **Proposed:** rename `template` → `type` with values `canvas`, `group`, `note`, `syntax`, `effort`; abolish `search: hidden` (searchability derives from type); rename old `type:` (nav placement) → `nav:` | User direction; one universal discriminator, searchability as a consequence of file kind. `syntax` chosen over `tutorial` for the non-searchable type |
| 2026-07-22 | **Proposed:** `equipment:` as a standard-but-optional key across all file types; item-level inheritance from the grouping; seed vocabulary in §5 | User direction; discovery axis distinct from `category`/`tags` and from analytics |
| | | |
