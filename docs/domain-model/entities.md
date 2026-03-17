# Domain Entities

This document provides the full field specification for every persisted entity in the WOD Wiki domain model.

## Primary Entities

These entities are stored in the IndexedDB V4 database and represent the core data model.

---

### Note

**Source**: [`src/types/storage.ts`](../../src/types/storage.ts)  
**Store**: `notes` (key: `id`)  
**Indexes**: `by-updated` (updatedAt), `by-target-date` (targetDate)

The **root container** for a workout document. A Note owns an ordered list of segments, and is the anchor for results and attachments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID (v4) — primary key |
| `title` | `string` | Yes | Display name shown in history lists |
| `rawContent` | `string` | Yes | Full document text (cached for search/preview). Rebuilt from segments on read. |
| `tags` | `string[]` | Yes | Metadata tags. Includes `notebook:{id}` for notebook membership. |
| `createdAt` | `number` | Yes | Unix ms — immutable, set on creation |
| `updatedAt` | `number` | Yes | Unix ms — bumped on every edit |
| `targetDate` | `number` | Yes | Unix ms — the date the workout is scheduled/associated with. Primary sort key. |
| `segmentIds` | `string[]` | Yes | Ordered list of NoteSegment UUIDs. Defines document structure. |
| `type` | `'note' \| 'template'` | No | Defaults to `'note'`. Templates can be cloned to create new notes. |
| `templateId` | `string` | No | If this note was cloned from another, the source note's ID. |
| `clonedIds` | `string[]` | No | IDs of notes that were cloned FROM this note (reverse links). |

---

### NoteSegment

**Source**: [`src/types/storage.ts`](../../src/types/storage.ts)  
**Store**: `segments` (compound key: `[id, version]`)  
**Indexes**: `by-note` (noteId), `by-type` (dataType)

A **versioned content chunk** within a Note. Every edit to a segment creates a new version row, enabling full edit history. Replaces the legacy `scripts` and `section_history` stores.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID — stable across versions. Part of compound key. |
| `version` | `number` | Yes | Version number (1, 2, 3…). Part of compound key. |
| `noteId` | `string` | Yes | Parent Note UUID (foreign key). |
| `dataType` | `SegmentDataType` | Yes | Content type discriminator (see below). |
| `data` | `any` | Yes | Structured JSON payload. Schema varies by `dataType`. |
| `rawContent` | `string` | Yes | Original markdown / source text for this segment. |
| `level` | `number` | No | Heading level (1–6) for `title` segments. |
| `wodBlock` | `WodBlock` | No | Parsed WOD block data for `wod` segments. |
| `createdAt` | `number` | Yes | Unix ms — when this version was committed. |

#### SegmentDataType

```typescript
type SegmentDataType = 'script' | 'youtube' | 'markdown' | 'header' | 'frontmatter' | 'wod' | 'title';
```

| Value | Description |
|-------|-------------|
| `'wod'` | Workout definition block (fenced code block with `wod`, `log`, or `plan` dialect) |
| `'title'` | Heading line (e.g., `# My Workout`) |
| `'markdown'` | General prose / paragraph content |
| `'frontmatter'` | YAML frontmatter block |
| `'script'` | Legacy script content (pre-V4) |
| `'header'` | Legacy heading (migrated to `'title'`) |
| `'youtube'` | YouTube embed reference |

---

### WorkoutResult

**Source**: [`src/types/storage.ts`](../../src/types/storage.ts)  
**Store**: `results` (key: `id`)  
**Indexes**: `by-segment` (segmentId), `by-note` (noteId), `by-completed` (completedAt)

An **execution log** — the outcome of running a workout segment through the runtime.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID — primary key |
| `noteId` | `string` | Yes | Parent Note UUID (for efficient querying) |
| `segmentId` | `string` | No | The NoteSegment UUID this result is linked to |
| `segmentVersion` | `number` | No | The exact segment version that was executed |
| `sectionId` | `string` | No | Legacy section ID (for backward compatibility) |
| `data` | `WorkoutResults` | Yes | The actual execution results (see below) |
| `completedAt` | `number` | Yes | Unix ms — when execution finished |

#### WorkoutResults (Embedded Value Object)

**Source**: [`src/components/Editor/types/index.ts`](../../src/components/Editor/types/index.ts)

| Field | Type | Description |
|-------|------|-------------|
| `startTime` | `number` | Unix ms — when execution began |
| `endTime` | `number` | Unix ms — when execution ended |
| `duration` | `number` | Total duration in ms |
| `roundsCompleted` | `number?` | Number of rounds completed |
| `totalRounds` | `number?` | Target number of rounds |
| `repsCompleted` | `number?` | Total reps completed |
| `metrics` | `WorkoutMetricFragment[]` | Collected metric snapshots |
| `logs` | `IOutputStatement[]?` | Runtime output log |
| `completed` | `boolean` | Whether workout ran to completion |

#### WorkoutMetricFragment

| Field | Type | Description |
|-------|------|-------------|
| `metric` | `IMetric` | The metric value (type, value, unit, etc.) |
| `origin` | `MetricOrigin?` | Where the metric came from |
| `timestamp` | `number?` | When the metric was captured |

---

### Attachment

**Source**: [`src/types/storage.ts`](../../src/types/storage.ts)  
**Store**: `attachments` (key: `id`)  
**Indexes**: `by-note` (noteId), `by-time` (createdAt)

An **external temporal data blob** attached to a Note — GPS tracks, heart rate streams, or other sensor data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID — primary key |
| `noteId` | `string` | Yes | Parent Note UUID |
| `mimeType` | `string` | Yes | MIME type (e.g., `'application/gpx+xml'`, `'application/json'`) |
| `label` | `string` | Yes | Human-readable name (e.g., "Garmin HR stream") |
| `data` | `ArrayBuffer \| string` | Yes | Raw blob or JSON string |
| `timeSpan` | `{ start: number; end: number }` | Yes | Unix ms time bounds for the data |
| `createdAt` | `number` | Yes | Unix ms — when the attachment was saved |

---

### AnalyticsDataPoint

**Source**: [`src/types/storage.ts`](../../src/types/storage.ts)  
**Store**: `analytics` (key: `id`)  
**Indexes**: `by-type` (type), `by-segment` (segmentId), `by-result` (resultId)

A **denormalized metric** derived from a WorkoutResult, optimized for cross-workout trend queries without reprocessing raw results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID — primary key |
| `noteId` | `string` | Yes | Parent Note UUID |
| `segmentId` | `string` | Yes | Source NoteSegment UUID |
| `segmentVersion` | `number` | Yes | The segment version the metric was derived from |
| `resultId` | `string` | Yes | Source WorkoutResult UUID |
| `type` | `string` | Yes | Metric type key (e.g., `'total_reps'`, `'avg_hr'`, `'pace'`) |
| `value` | `number \| any` | Yes | The metric value |
| `unit` | `string` | No | Unit of measurement (e.g., `'bpm'`, `'m/s'`) |
| `label` | `string` | Yes | Human-readable description (e.g., "Average Heart Rate") |
| `timestamp` | `number` | Yes | Effective workout date (for timeline queries) |
| `createdAt` | `number` | Yes | When this data point was generated |

---

## Ancillary Entities

These entities are not stored in IndexedDB — they use separate storage mechanisms.

---

### Notebook

**Source**: [`src/types/notebook.ts`](../../src/types/notebook.ts)  
**Storage**: `localStorage` key `wodwiki:notebooks` (JSON array)

A named, icon-labeled collection of Notes. Membership is tag-based, not relational.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID |
| `name` | `string` | Yes | Display name |
| `description` | `string` | Yes | User description |
| `icon` | `string` | Yes | Emoji character |
| `createdAt` | `number` | Yes | Unix ms |
| `lastEditedAt` | `number` | Yes | Unix ms — updated on any notebook or entry change |

**Tag convention**: A Note belongs to a Notebook if its `tags` array contains `notebook:{notebookId}`.

Helper functions:

```typescript
toNotebookTag(notebookId: string): string       // → 'notebook:{id}'
fromNotebookTag(tag: string): string | null      // Extract ID from tag
isNotebookTag(tag: string): boolean              // Check if tag is a notebook tag
```

---

### Exercise

**Source**: [`src/exercise.d.ts`](../../src/exercise.d.ts)  
**Storage**: In-memory `Map` inside `ExerciseDefinitionService`

Reference data for exercise definitions. Loaded at app startup from bundled data or an external provider.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Primary identifier and display name |
| `aliases` | `string[]` | No | Alternative names for the exercise |
| `primaryMuscles` | `Muscle[]` | Yes | Primary muscle groups targeted |
| `secondaryMuscles` | `Muscle[]` | Yes | Secondary muscle groups |
| `force` | `Force` | No | Force type: `'pull'`, `'push'`, `'static'` |
| `level` | `Level` | Yes | Difficulty: `'beginner'`, `'intermediate'`, `'expert'` |
| `mechanic` | `Mechanic` | No | `'compound'` or `'isolation'` |
| `equipment` | `Equipment` | No | Required equipment |
| `category` | `Category` | Yes | Exercise category (strength, cardio, crossfit, etc.) |
| `instructions` | `string[]` | Yes | Step-by-step instructions |
| `description` | `string` | No | General description |
| `tips` | `string[]` | No | Coaching tips |

---

### HistoryEntry (Denormalized View)

**Source**: [`src/types/history.ts`](../../src/types/history.ts)  
**Storage**: Not stored directly — assembled by `IContentProvider` implementations from underlying entities.

This is the **data transfer object** that flows between the data layer and UI. It represents a Note with its segments and latest results already joined.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Note UUID |
| `title` | `string` | Yes | Display title |
| `createdAt` | `number` | Yes | Unix ms — immutable |
| `updatedAt` | `number` | Yes | Unix ms — last edit |
| `targetDate` | `number` | Yes | Unix ms — primary sort date |
| `rawContent` | `string` | Yes | Full markdown (reconstructed from segments) |
| `results` | `WorkoutResults?` | No | Latest execution results |
| `extendedResults` | `WorkoutResult[]?` | No | All execution results for this Note |
| `tags` | `string[]` | Yes | Metadata tags |
| `notes` | `string?` | No | User notes / comments |
| `sections` | `Section[]?` | No | Pre-parsed segments for instant rendering |
| `schemaVersion` | `number` | Yes | Always `1` currently |
| `type` | `'note' \| 'template'` | No | Defaults to `'note'` |
| `templateId` | `string?` | No | Source note/template ID |
| `clonedIds` | `string[]?` | No | Reverse links to cloned notes |

---

### WodCollection / WodCollectionItem (Read-Only)

**Source**: [`src/repositories/wod-collections.ts`](../../src/repositories/wod-collections.ts)  
**Storage**: Bundled at build time via Vite `import.meta.glob`

Static workout collections shipped with the app.

#### WodCollection

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Directory name (e.g., `'crossfit-girls'`) |
| `name` | `string` | Display name (e.g., `'Crossfit Girls'`) |
| `parent` | `string?` | Parent collection ID for nested groups |
| `count` | `number` | Number of items |
| `items` | `WodCollectionItem[]` | The workout files |

#### WodCollectionItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Filename without extension (e.g., `'fran'`) |
| `name` | `string` | Display name (e.g., `'Fran'`) |
| `content` | `string` | Raw markdown content |
| `path` | `string` | Full glob path key |
