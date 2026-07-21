# 04 — Workout Result Lifecycle

The write path that feeds every review/analytics surface. Single seam:
`playgroundRecorder → notePersistence.mutateNote` — no page writes results
directly.

```mermaid
sequenceDiagram
    actor User
    participant Src as Source page<br/>(journal/playground/effort/canvas)
    participant RS as pendingRuntimes Map
    participant Run as WallClockPage /run/:id<br/>(or inline timer)
    participant Rec as playgroundRecorder
    participant Per as IndexedDBNotePersistence
    participant DB as wodwiki-db
    participant Rev as ReviewPage / InlineResultPanel

    User->>Src: clicks Run
    alt journal fork first (Run/Plan/Schedule)
        Src->>Per: createJournalNoteFromWorkout
        Per->>DB: new Note(type=journal, pageId=date, sourceId=path)<br/>+ segments
    end
    Src->>RS: set(runtimeId, {block, noteId})
    Src->>Run: navigate /run/:runtimeId
    Run->>RS: get + delete(runtimeId)

    User->>Run: completes/stops workout
    Run->>Run: buildWorkoutResults(outputs)<br/>→ logs: StoredOutputStatement[]
    Run->>Rec: record({noteId, blockId, data, origin})
    Rec->>Per: mutateNote({workoutResult})
    Per->>DB: results.put {segmentVersion=latest,<br/>pageId from note, createdAt=endTime}
    Per->>DB: analytics.put (summary rows,<br/>outputType='analytics' logs only)
    Run->>Rev: navigate /review/:resultId

    Rev->>DB: getResultById(resultId)
    Rev->>Rev: getAnalyticsFromLogs(data.logs) → UI Segments
    Note over Rev: read-only; raw logs in results.data.logs<br/>are the authoritative replay source
```

## Stage-by-stage

| Stage | Where | What happens |
|---|---|---|
| 1. Fork (optional) | `journalWorkout.createJournalNoteFromWorkout` | Creates an independent journal `Note` (UUID, `type='journal'`, `pageId` from date, `sourceId` = source path) containing a cloned ```` ```wod ```` block + Source link. Never mutates older entries. |
| 2. Route handoff | `playground/src/runtimeStore.ts` | `pendingRuntimes.set(runtimeId, {block, noteId})`; WallClockPage consumes and **deletes** on mount. Transient only. |
| 3. Execute | `RuntimeTimerPanel` → `buildWorkoutResults` (`src/app/editor/runtimeTimerModel.ts`) | Live `IOutputStatement`s flattened via `toStoredOutputStatement`: `MetricContainer` → plain `IMetric[]`, hint `Set` → array. Produces `{startTime, endTime, duration, completed, logs[]}`. |
| 4. Record | `resultRecorder.record` | Resolves `origin` (explicit, or `'playground'` when noteId prefix is `playground/`/`canvas:`), stamps `blockId`/`blockContentId`/`segmentId`, delegates to `mutateNote`. |
| 5. Persist | `IndexedDBNotePersistence.mutateNote` → `IndexedDBContentProvider.updateEntry` | Lazily creates a minimal Note if absent; resolves latest `NoteSegment` version; writes `results` row with `segmentVersion`, resolved `noteId` UUID, `pageId` copied from note, `createdAt = data.endTime \|\| now`. Extracts `outputType='analytics'` logs into `analytics` summary rows. |
| 6. Read back | ReviewPage / InlineResultPanel / JournalDatePage / EffortsNavPanel | `getResultById`, `getResultsForNote`, `getRecentResults` (excludes `origin='playground'` by default), `getResultsByContentId`. `data.logs` → `getAnalyticsFromLogs` → UI `Segment`s. |

## Identity fields on a WorkoutResult

| Field | Meaning | Used for |
|---|---|---|
| `noteId` | Parent Note UUID | per-note result lists |
| `segmentId` + `segmentVersion` | Exact `[id, version]` incarnation of the block run | pinning a result to the text as it was |
| `blockId` | Positional (line-based) section identity | per-block journal queries |
| `blockContentId` | Hash of the fenced content | **cross-note aggregation** (same workout, many notes) |
| `pageId` | Copied from parent Note → calendar Page | date-scoped queries |
| `origin` | `journal` \| `playground` | default exclusion of playground rows |

## Journal linkage rules

- Journal date is **not** on the Note row — it is derived via
  `note.pageId → page.date`.
- `sourceId` is metadata (a path like `/effort/<slug>`), not an enforced FK.
- Re-running the same journal block appends **additional** result rows
  (unique result `id` each time); nothing is overwritten.
- Canvas runs record against synthetic note ids (`canvas:<route>`,
  `effort/<slug>`) with `origin='playground'` — viewable but filtered out
  of journal/progress lists by default.
