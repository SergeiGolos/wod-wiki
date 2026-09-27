---
title: "WQL Evolution & Query Composition Guide"
date: 2026-09-27
status: architectural-guide
tags:
  - wql
  - domain-model
  - query-composition
  - architecture
---

# WQL Evolution & Query Composition Guide

This guide details how **WQL (Wod Query Language)** operates under the new domain structure, specifically addressing the separation of **Page** (placement) from **Note** (authored entity), the dynamic **Typed Tags** system, and cross-store compositional joins.

---

## 1. Domain Foundations & Core Cardinality

Under the updated architecture, cardinality is strictly partitioned between placement, authored content, and recorded facts:

```
[Page] (placement & routing anchor: date or slug)
   │
   ▲ (N:M via `page_notes`)
   │
[Note] (canonical authoring container)
   ├── [NoteSegment] (versioned markdown/script content)
   ├── [BlockIndexRow] (searchable derived blocks: wod, headings)
   ├── [Session] (workout execution metadata)
   ├── [EventRecord] (output telemetry facts)
   └── [Attachment] (temporal sensor blobs: GPS, HR)
   │
   ▲ (N:M via `note_tags`)
   │
[Tag] ─── (N:1) ───► [TagType] (dynamic: category, equipment, discipline...)
```

### Key Invariants
1. **Notes own content and telemetry**: `segments`, `block_index`, `sessions`, `events`, and `attachments` link strictly to `noteId`.
2. **Pages are placement anchors**: A `Page` has no body text, no segments, and no telemetry of its own. It groups notes via `page_notes`.
3. **Tags are typed dimensions**: Tags link to notes via `note_tags` and belong to dynamic types in `tag_types` (e.g. `category`, `type`, `equipment`, `discipline`). Frontmatter keys matching registered types synchronize into `Tag` and `NoteTag` records.

---

## 2. Core Goal 1: Search Pages or Notes by Tags / Frontmatter

### Current State
Today, `find:note` filters by tag labels using `tags:<label>` or `{tags:a|b}`. It can also filter by `type:<kind>`, `source:<scope>`, and text snippets.

### New Domain Behavior
With dynamic typed tags and frontmatter synchronization:
1. **Any typed tag acts as a first-class filter key**:
   - Because frontmatter properties like `equipment: barbell` or `discipline: gymnastics` synchronize to `Tag.type` and `note_tags`, WQL filters query by specific dimensions:
     ```wql
     find:note{equipment:barbell}
     find:note{discipline:gymnastics, category:benchmark}
     ```
2. **General tags filter**:
   ```wql
   find:note{tags:girl}
   ```
3. **Notes vs Pages**:
   - `find:note`: Discovers notes directly by tags, types, or frontmatter attributes.
   - `find:page`: Discovers parent pages/groupings by filtering through the notes placed on them:
     ```wql
     find:page{tags:benchmark}
     find:page{equipment:kettlebell}
     ```
   - **Resolution Mechanics**:
     $$\text{Tag Filters } \{k: v\} \xrightarrow{\text{note\_tags}} \text{Matching Note IDs } \xrightarrow{\text{page\_notes}} \text{Matching Page IDs}$$

---

## 3. Core Goal 2: Search Blocks by Notes Searches or Efforts

A block (`BlockIndexRow`) represents a parsed section of a note (such as a `wod` block or a heading). Blocks are indexed by `noteId` and content hash (`blockContentId`).

### Current State
- `find:block{text:amrap}`: Content substring match across blocks.
- `find:block where sum:totalVolume{} > 5000`: Cross-store metric join.

### New Domain Behavior
1. **Search Blocks by Note Searches (Compositional Join)**:
   - To find all workout blocks contained within notes matching specific tags, frontmatter, or dates:
     ```wql
     find:block where find:note{equipment:barbell, source:journal}
     ```
   - Or direct scope filter:
     ```wql
     find:block{note:note-uuid}
     find:block{tags:benchmark}
     ```
   - **Resolution Mechanics**:
     1. Evaluates the nested `find:note{...}` query $\to$ returns set of candidate `noteId`s.
     2. Filters `block_index` table where `block.noteId IN (candidateNoteIds)`.

2. **Search Blocks by Efforts**:
   - Workouts contain specific exercise movements/efforts (e.g. `thruster`, `pull-up`):
     ```wql
     find:block{effort:thruster}
     find:block{discipline:gymnastics}
     ```
   - **Resolution Mechanics**:
     - Resolves the effort slug to canonical `blockContentId` hashes from the exercise registry/logs.
     - Selects matching rows from `block_index` where `block.blockContentId IN (effortContentIds)`.

---

## 4. Core Goal 3: Search Sessions by Notes Searches and Efforts

Workout executions (`Session` metadata and `EventRecord` telemetry) represent the runtime execution history.

### Current State
- `rows:all{note:note-uuid}` / `rows:segment{block:blockContentId}`: Scoped statement rows.
- `rows:segment [window]`: Cross-workout segment observations.
- Aggregates (`sum:totalVolume{...}`): Fact analytics across workouts.

### New Domain Behavior
1. **Search Sessions / Statement Rows by Note Searches**:
   - Retrieve all completed workout runs from notes matching specific typed tags, categories, or pages:
     ```wql
     rows:all where find:note{category:benchmark}
     rows:segment{equipment:barbell} last 8w
     ```
   - **Resolution Mechanics**:
     1. Execute note predicate: `find:note{category:benchmark}` $\to$ yields `[noteId_1, noteId_2, ...]`.
     2. Scans `events` or `sessions` where `noteId IN (matchedNotes)`.
     3. Groups statements by `resultId` / `timestamp`.

2. **Search Sessions by Efforts**:
   - Search session outputs and telemetry for a specific movement:
     ```wql
     rows:segment{effort:fran} last 12w
     rows:segment{effort:clean-and-jerk, origin:user}
     ```
   - Or aggregated telemetry:
     ```wql
     max:resistance{effort:back-squat} last 6m
     sum:totalVolume{discipline:strength} by {week} last 12w
     ```

---

## 5. Query Translation & Comparison Matrix

Here is how common queries today translate to the new domain model:

| Goal | Query Under Old Schema (V10-V20) | Query Under New Domain (V23+) | What Changed Internally |
| :--- | :--- | :--- | :--- |
| **Find notes by typed metadata** | `find:note{tags:barbell}` *(untyped tag)* | `find:note{equipment:barbell}` | Frontmatter property `equipment` is indexed as a typed tag (`type: 'equipment'`). |
| **Find pages containing typed notes** | `find:page{source:journal}` *(queried notes table directly)* | `find:page{category:benchmark}` | Resolves matching notes via `note_tags`, then joins to `page` via `page_notes`. |
| **Blocks from tagged notes** | `find:block{text:fran}` *(text search fallback)* | `find:block where find:note{category:benchmark}` | Clean relational composition: resolves notes by category, then pulls their blocks. |
| **Blocks for specific exercise** | `find:block{text:thruster}` | `find:block{effort:thruster}` | Directly targets the effort resolver rather than fuzzy text match. |
| **Session statement rows by note metadata** | `rows:all{note:123}` *(requires knowing UUID)* | `rows:all where find:note{equipment:kettlebell}` | Declarative subquery composition joins `events.noteId` to candidate notes. |
| **Session metrics by discipline** | `sum:totalVolume{tags:strength}` | `sum:totalVolume{discipline:strength}` | Discipline is recognized as a typed frontmatter / fact dimension. |
| **Calendar-dated workout queries** | Evaluated on `Note.createdAt` *(skewed by import time)* | Evaluated on `Note.date` and `EventRecord.metricDate` | Civil date anchoring preserves the true workout date regardless of import time. |

---

## 6. Execution Seams & Next Steps

1. **`QueryService.runFind` Target Extension**:
   - Add explicit support for `find:page` resolving via `page_notes` rather than filtering the `notes` table for `type !== 'note'`.
2. **Predicate Resolution in `runRows`**:
   - Allow `rows:all` and `rows:segment` to accept `where find:note{...}` predicates (currently supported in `runAgg`, but not yet wired in `runRows`).
3. **Filter Key Registration**:
   - In `packages/wql/src/vocabulary.ts`, allow registered tag types from `tag_types` to be valid filter keys in addition to the static `WQL_TAG_KEYS`.
