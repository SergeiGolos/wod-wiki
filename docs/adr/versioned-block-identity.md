# Versioned Block Identity

A three-part identity model for linking workout results to the blocks they were recorded against, with versioning for content changes.

## The Three Keys

| Key | Scope | Stable across… | Changes when… |
|-----|-------|-----------------|---------------|
| **contentId** | Content | Clone, reorder, edit-above, edit-below | Block content is edited |
| **blockId** | Position | Re-parses at the same position | Block is moved or deleted |
| **version** | Execution | Nothing — increments per content change at a position | Content changes AND a result exists for the current version |

### How they compose

```
Note
 └─ Section (blockId: "wod-5-abc")
     ├─ contentId: "hash-of-fenced-content"
     ├─ version: 2
     └─ Results
         ├─ WorkoutResult(blockId: "wod-5-abc", contentId: "hash-v1", version: 1)
         └─ WorkoutResult(blockId: "wod-5-abc", contentId: "hash-v2", version: 2)
```

- **contentId** answers: *"What workout is this?"*
- **blockId** answers: *"Where in the note is this?"*
- **version** answers: *"Which generation of this block's content?"*

## Version Lifecycle

```mermaid
sequenceDiagram
    participant U as Athlete
    participant E as Editor
    participant P as Parser
    participant R as Recorder
    participant S as Storage

    Note over E,S: Step 1 — Block created
    U->>E: Types ```wod block
    E->>P: Parse sections
    P->>E: Section(blockId=wod-5, contentId=hashA, version=1)

    Note over E,S: Step 2 — First run (no version bump)
    U->>E: Runs workout
    E->>R: record(blockId=wod-5, contentId=hashA, version=1)
    R->>S: Save WorkoutResult(v1)

    Note over E,S: Step 3 — Second run (same version, result accumulates)
    U->>E: Runs workout again
    E->>R: record(blockId=wod-5, contentId=hashA, version=1)
    R->>S: Save WorkoutResult(v1) — now 2 results for v1

    Note over E,S: Step 4 — Edit block content (version bump!)
    U->>E: Edits WOD content (hashA → hashB)
    E->>P: Re-parse
    P->>S: Any results for (wod-5, hashA, v1)?
    S-->>P: Yes — 2 results
    P->>E: Section(blockId=wod-5, contentId=hashB, version=2)

    Note over E,S: Step 5 — Run edited block
    U->>E: Runs workout
    E->>R: record(blockId=wod-5, contentId=hashB, version=2)
    R->>S: Save WorkoutResult(v2)

    Note over E,S: Rendering
    E->>S: Get results for (wod-5, version=2)
    S-->>E: [v2 result]
    E->>U: Shows v2 results inline + "v1: 2 previous" badge
```

**The trigger rule**: a new version is created when the block content changes AND at least one result exists for the current version. If no result has been recorded, editing just updates version 1 in place (the content hash changes, but the version number stays).

## System Overview

```mermaid
graph TB
    User([Athlete])
    Editor[Note Editor<br/>CodeMirror 6]
    Parser[Section Parser<br/>section-state.ts]
    Recorder[Result Recorder<br/>resultRecorder.ts]
    Widget[Results Widget<br/>whiteboard-results-widget.ts]
    Panel[Inline Result Panel<br/>InlineResultPanel.tsx]
    Clone[Clone / Append<br/>journalWorkout.ts]
    IDB[(IndexedDB<br/>results store)]

    User -->|"writes & runs"| Editor
    Editor --> Parser
    Parser -->|"mints contentId,<br/>tracks version"| Editor
    Editor -->|"record()"| Recorder
    Recorder -->|"writes (blockId,<br/>contentId, version)"| IDB
    Editor -->|"filter by<br/>blockId + version"| IDB
    IDB -->|"matched results"| Editor
    Editor --> Widget
    Widget --> Panel
    User -->|"clone from collection"| Clone
    Clone -->|"dedup by contentId"| IDB

    style Parser fill:#1e293b,color:#fff
    style Recorder fill:#1e293b,color:#fff
    style IDB fill:#0f172a,color:#fff
```

## Impact Areas

### 1. Section Parser (`section-state.ts`, `sectionParser.ts`)

**Current**: Mints `contentId` from fenced content hash. No version tracking.

**Change**: When a section's `contentId` changes between re-parses, check if results exist for the old `contentId` at this `blockId`. If yes, increment `version`. If no, keep version at 1.

The parser already re-parses on every doc change and carries forward stable identities via `mapIdentities`. The version check is a new step in that mapping pass.

### 2. Result Recorder (`resultRecorder.ts`)

**Current**: Writes `blockContentId: runBlock.contentId`.

**Change**: Also write `blockId` (the section's `id`) and `version` (the section's current version).

```ts
WorkoutResult {
  blockId: string         // section identity (position)
  blockContentId: string  // content hash (what workout)
  version: number         // content generation at this position
}
```

### 3. Result Filtering (`NoteEditor.tsx`, `useScriptBlockResults.ts`, `useNotePageNav.ts`)

**Current**: Filter by `r.blockContentId === section.contentId`.

**Change**: Filter by `r.blockId === section.id && r.version === section.version`. Results from older versions don't match the current section — they're hidden but preserved in storage.

To view previous versions: the inline results panel gets a "Previous versions" toggle that relaxes the version filter to `r.blockId === section.id` (all versions), with each `ResultRow` badged with its version number.

### 4. Clone / Append (`journalWorkout.ts`)

**Current**: Dedup check by exact fenced content match (just added).

**Change**: No change needed. Clone deduplication stays content-based. Cloned blocks with the same content share `contentId` but get their own `blockId` and start at version 1.

### 5. Inline Editing UX

```mermaid
graph LR
    subgraph "Results Bar (current version)"
        RB["```wod block (v2)<br/>━━━━━━━━━━━━━━━<br/>Result: 4:12 — today"]
    end

    subgraph "Version Toggle (expanded)"
        VT["v2 — Fran (95lb)<br/>Result: 4:12 ✓ current"]
        VT2["v1 — Fran (original)<br/>Result: 3:47 — 2 days ago"]
    end

    RB -->|"▾ Previous"| VT
```

- **Version badge** on each results bar: shows current version number. Green dot = results exist for current version. Gray = no results yet.
- **Previous versions toggle**: expands a panel below the results bar showing all versions for this `blockId`, each with its result summary and timestamp.
- **Inline diff**: clicking a previous version shows the old content alongside the current (future enhancement).

## Data Model

```mermaid
erDiagram
    EditorSection {
        string id PK "blockId — position-stable"
        string contentId "content hash"
        int version "0 if no results, increments on content change"
    }

    WorkoutResult {
        string id PK "UUID"
        string noteId FK "parent note"
        string blockId FK "section position"
        string blockContentId "content hash at recording time"
        int version "section version at recording time"
        json data "WorkoutResults"
        int completedAt
    }

    EditorSection ||--o{ WorkoutResult : "results join on blockId + version"
```

## Version Bump Algorithm

```
On section re-parse (content changed):

  oldContentId = previousSection.contentId
  newContentId = hash(newFencedContent)
  blockId = section.id

  if newContentId === oldContentId:
      # Content unchanged — keep version
      section.version = previousSection.version
      return

  # Content changed — check if results exist for the old version
  hasResults = await getResultsForBlock(blockId, oldContentId, previousSection.version)

  if hasResults:
      # Bump version — old results stay linked to old contentId + version
      section.version = previousSection.version + 1
  else:
      # No results yet — update version 1 in place
      section.version = 1

  section.contentId = newContentId
```

## Why Three Keys Instead of One

The current model has one key (`blockContentId`) that conflates three questions:

| Question | Current (one key) | Proposed (three keys) |
|----------|-------------------|----------------------|
| Which workout? | `blockContentId` | `contentId` |
| Where in the note? | *(implicit — all blocks with same contentId share results)* | `blockId` |
| Which generation? | *(lost — editing content silently hides old results)* | `version` |

**Problem with one key**: if two blocks have the same content (same workout cloned into two sections), both render the same results. If a block is edited after recording, old results become invisible (different `contentId`, no match).

**With three keys**: each block position has its own result history. Editing creates a version boundary. Previous results are preserved, not lost.
