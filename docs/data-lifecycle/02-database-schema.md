# 02 — Database Schema (UML)

`wodwiki-db`, version 11, nine object stores. Canonical types:
`src/types/storage.ts`. Store/index declarations:
`src/services/db/IndexedDBService.ts` (`WodWikiDB`).

```mermaid
classDiagram
    class Note {
        +string id  «PK, UUID»
        +string title
        +string? slug  «idx by-slug, unique»
        +string? pageId  «FK → Page»
        +number createdAt
        +NoteKind? type  note|template|playground|journal
        +string? sourceId  «source path, NOT an enforced FK»
    }
    class Page {
        +string id  «PK, UUID»
        +string? date  «idx by-date, YYYY-MM-DD»
        +string? slug  «idx by-slug»
        +string? title
        +number createdAt
    }
    class NoteSegment {
        +string id  «PK [id,version] compound»
        +number version
        +string noteId  «FK → Note, idx by-note»
        +number? position
        +string? pageId
        +SegmentDataType dataType  wod|script|markdown|h1..h6|...
        +any data  «ScriptBlock JSON»
        +string rawContent
        +number createdAt / updatedAt?
        +boolean? isHistory
    }
    class WorkoutResult {
        +string id  «PK, UUID»
        +string noteId  «FK → Note»
        +string? segmentId  «→ NoteSegment.id»
        +number? segmentVersion
        +string? blockId / blockContentId  «hash → cross-note joins»
        +ResultOrigin? origin  journal|playground
        +string? pageId
        +WorkoutResults data  «logs: StoredOutputStatement[]»
        +number createdAt  «idx by-completed»
    }
    class AnalyticsDataPoint {
        +string id  «PK»
        +string noteId / segmentId / resultId
        +number segmentVersion
        +string type  «metric key»
        +any value / string? unit / string label
        +string? grain / effortSlug / discipline / origin / pageId
        +number timestamp / createdAt
    }
    class Attachment {
        +string id  «PK»
        +string noteId / string? resultId / pageId
        +string mimeType / label
        +ArrayBuffer|string data
        +TimeSpan timeSpan
    }
    class Effort {
        +string slug  «PK»
        +string id / label / aliases[]
        +EffortBaseAttributes baseAttributes  met/discipline/tier
        +string registrySource  bundled|user|synthetic
        +EffortDerivation? derivation
    }
    class Tag {
        +string id / label / TagType? type
    }
    class NoteTag {
        +string id / noteId / tagId
    }

    Page "1" <-- "*" Note : pageId
    Note "1" <-- "*" NoteSegment : noteId
    Note "1" <-- "*" WorkoutResult : noteId
    NoteSegment "1" <-- "*" WorkoutResult : segmentId+segmentVersion
    WorkoutResult "1" <-- "*" AnalyticsDataPoint : resultId
    WorkoutResult "1" <-- "*" Attachment : resultId
    Note "1" <-- "*" Attachment : noteId
    Note "*" <-- "*" Tag : via NoteTag
    Effort .. AnalyticsDataPoint : effortSlug (soft ref)
    Note .. Note : sourceId (soft ref, source path)
```

## Store index reference

| Store | Key | Indexes |
|---|---|---|
| `notes` | `id` | `by-slug` (unique), `by-page` |
| `page` | `id` | `by-date` (unique), `by-slug` (unique) |
| `tags` | `id` | `by-label` (unique), `by-type` |
| `note_tags` | `id` | `by-note`, `by-tag` |
| `segments` | `[id, version]` | `by-note`, `by-type`, `by-page`, `by-history` |
| `results` | `id` | `by-segment`, `by-note`, `by-completed`, `by-content`, `by-block`, `by-page`, `by-origin` |
| `attachments` | `id` | `by-note`, `by-time`, `by-page`, `by-result` |
| `analytics` | `id` | `by-type`, `by-segment`, `by-result`, `by-content`, `by-page`, `by-origin`, `by-metric`, `by-effort`, `by-grain`, `by-discipline` |
| `efforts` | `slug` | `by-discipline`, `by-source` |

## Embedded shapes (never their own store rows)

| Shape | Lives inside | Purpose |
|---|---|---|
| `ScriptBlock` | `NoteSegment.data` | parsed ```` ```wod ```` block |
| `WorkoutResults {startTime,endTime,duration,completed,logs[]}` | `WorkoutResult.data` | full execution replay |
| `StoredOutputStatement` | `WorkoutResults.logs[]` | flattened runtime output (metrics as plain arrays) |
| `IMetric` / `MetricContainer` | runtime `OutputStatement` (in-memory only) | metric values; container flattens on save |
| `TimeSpan {started, ended?}` | statements, attachments | interval math |

## Design notes that matter

- `segments` key is compound `[id, version]` — **every edit appends a new
  version row**; `isHistory` marks superseded ones.
- `blockContentId` (content hash) is the cross-note join: the same workout
  text run in different notes aggregates via `results.by-content` /
  `analytics.by-content`.
- `origin='playground'` rows are recorded but excluded from default
  journal/progress queries.
- `sourceId` on a journal Note is a source path
  (`/collections/...`, `/effort/...`), **not** a DB-enforced foreign key.
- Known quirk: analytics index `by-type` was created on field `metricType`
  during upgrade, but new rows write `type` — the `by-metric` index (on
  `metricKey`) is the working join.
- Upgrade path: V4 fresh start → V6 content/block indexes → V8 slug +
  lazy UUID migration → V10 page/tags/note_tags + pageId/origin (analytics
  purged) → V11 destructive field migrations (`completedAt`→`createdAt`,
  Note slim-down, heading segments).
