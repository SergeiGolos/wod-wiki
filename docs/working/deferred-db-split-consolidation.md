# Consolidation Done — The Two-Database Split

> **Status: DONE (2026-06-22).** Confirmed accidental → consolidated via a hard
> cutover. Note content and the note system now live in the single `wodwiki-db`
> database; `playgroundDB` is removed. Full record below.

## The finding

Note **content** and note **data** live in two separate IndexedDB databases,
joined only by a hand-cobbed `noteId` string:

| Database | Store | Holds | Key |
|---|---|---|---|
| `wodwiki-playground` (`playgroundDB`) | `pages` | note markdown **content** (journal / playground / collection / feed entries) | `category/name` or UUID — `playgroundDB.ts:39,70-72` |
| `wodwiki-db` (`indexedDBService`) | `notes`, `segments`, `results`, `attachments`, `analytics`, `efforts` | the structured note entity, versioned segments, workout **results**, analytics… | note `id` — `IndexedDBService.ts:41-125` |

The `noteId` string (`journal/2026-06-20`, `effort/fran`, `playground/my-note`,
`crossfit-girls/fran`) is overloaded as **three things**: (a) a storage key
across *both* databases, (b) the results join key, and (c) a routing
discriminator — `WallClockPage` string-splits it to pick the back-route
(`WallClockPage.tsx:51-60`). The inconsistency is already papered over by
`sameNoteId()` suffix-matching "legacy compat" (`sameNoteId.ts:7`; the
`getResultsForNote` fallback at `IndexedDBService.ts:253-258`).

## Why it's a smell

The architecture doc (`05-architecture.md:118-122`) describes **one**
persistence layer — `IndexedDBService` with a `notes` store. The playground's
separate content database looks like an *accretion*, not a designed seam. A
`MigrationService` already exists (`src/services/db/MigrationService.ts`),
hinting at an unfinished unification.

## The open question (answer before acting)

**Why does the split exist?** Two plausible reasons lead to opposite resolutions:

1. **Accidental** — `playgroundDB` predates the `notes`/`segments` stores and was
   never folded in. → *resolution: unify.*
2. **Intentional** — build-time **static** markdown (collections/feeds shipped in
   the bundle) must stay separate from **user-mutable** notes, so the content DB
   caches static originals + scratch edits without polluting the canonical note
   store. → *resolution: document as a seam, write an ADR.*

**Investigation needed:** git-archaeology on when `playgroundDB` was introduced
vs. the `notes`/`segments` stores; confirm whether static build-time content is
loaded into `pages`, and whether user edits are meant to be first-class notes or
throwaway scratch.

## Two roads

- **Collapse (if accidental).** Route playground content through the documented
  `notes`/`segments` stores — one database, one Note entity. The `noteId` cobble
  and `sameNoteId` shim dissolve (assumes ③ Note Identity has landed). Requires a
  one-time data migration of existing `pages` → `notes`/`segments`.
  *Blast radius: high — touches every note read/write.*
- **Document (if intentional).** Formalize the split as a designed seam with ③'s
  Note Identity as the typed bridge between the two databases; record an ADR so
  future reviews stop re-suggesting it. *Blast radius: low.*

## Recommendation

**Do not start here.** Land ①②③ first. Then run the investigation above.
- If the split is **intentional** → write the ADR and close this doc.
- If **accidental** → plan the collapse as its own dedicated migration, separate
  from the identity work.

## Pointers

- `playground/src/services/playgroundDB.ts` — `wodwiki-playground` schema
- `src/services/db/IndexedDBService.ts:41-125` — `wodwiki-db` schema
- `src/services/db/sameNoteId.ts:7`, `IndexedDBService.ts:253-258` — the compat shim
- `playground/src/pages/WallClockPage.tsx:51-60` — `noteId` parsed for routing
- `src/services/db/MigrationService.ts` — existing migration machinery
- `docs/05-architecture.md:118-122` — the documented single persistence layer
- Full review (throwaway, regenerable): the architecture-review HTML in `/tmp`
