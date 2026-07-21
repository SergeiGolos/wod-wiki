# 03 — Page Lifecycles

How each playground page loads and saves data. Shared stack under every
page:

```
Page → hook (usePlaygroundContent / useEffortContent / WorkbenchSession)
     → playgroundContent | journalNotes | playgroundRecorder
     → IndexedDBContentProvider | IndexedDBNotePersistence
     → indexedDBService (singleton) → wodwiki-db
```

## 3a. Edit-persist pages (the common pattern)

Applies to: JournalPage, JournalDatePage, PlaygroundNotePage,
WorkoutEditorPage, FeedItemPage, EffortDetailPage. They differ only in load
source and debounce timing.

```mermaid
sequenceDiagram
    actor User
    participant Page
    participant Hook as usePlaygroundContent /<br/>useEffortContent / WorkbenchSession
    participant Prov as IndexedDBContentProvider /<br/>notePersistence
    participant DB as wodwiki-db
    participant MD as bundled markdown

    Page->>Hook: mount(route params)
    Hook->>Prov: getEntry / getNote
    Prov->>DB: notes.get, segments latest per note
    alt IDB hit (user edits exist)
        DB-->>Hook: Note + NoteSegment[]
    else first visit
        Hook->>MD: import.meta.glob content
        Hook->>Prov: saveEntry (seed)
        Prov->>DB: put note + segments v1
    end
    Hook-->>Page: content string

    User->>Page: types in editor
    Page->>Hook: onChange(content)
    Note over Hook: line-idle debounce<br/>(500–5000ms, page-specific)
    Hook->>Prov: updateEntry / mutateNote
    Prov->>DB: segments: new [id, version+1] rows<br/>notes: put
    Note over Hook: flush triggers: line change,<br/>blur, pagehide, unmount
```

## 3b. Journal date aggregation (multi-note day view)

```mermaid
flowchart LR
    subgraph Load
        A["JournalDatePage mount"] --> B["journalNotes.listByDate(date)<br/>→ listNotes{projection:'summary'}"]
        B --> C["page store: by-date → Page.id"]
        C --> D["notes by-page → Note[]"]
        D --> E["getResultsForNote × N<br/>→ allResults[]"]
        E --> F["concat markdown with<br/>line-boundary markers"]
    end
    subgraph Save
        G["onChange"] --> H["500ms debounce"]
        H --> I["walk boundariesRef,<br/>slice content per note"]
        I --> J["journalNotes.update(noteId, slice)<br/>→ mutateNote per note"]
        K["unmount"] --> L["clearTimeout + final save flush"]
    end
```

## 3c. Zip import/export (content transport)

```mermaid
flowchart LR
    subgraph Export
        E1["shareBlock / openInPlayground"] --> E2["encodeZip: gzip + base64url<br/>```dialect fenced block```"]
        E2 --> E3["/load?zip=... URL or clipboard"]
    end
    subgraph Import
        I1["/load?zip → useZipProcessor (global, every route)"] --> D["decodeZip"]
        I2["/load/journal/:date?zip → useJournalZipProcessor"] --> D
        D --> V{"journal + past date?"}
        V -- yes --> C["BackdateConfirmModal"]
        V -- no --> W
        C --> W["journalNotes.create<br/>type=playground | journal"]
        W --> N["navigate to /playground/:id<br/>or journal path"]
    end
```

## 3d. Per-page behavior table

| Page (route) | Loads from | Saves to | Mode / debounce |
|---|---|---|---|
| PlaygroundLandingPage `/` | none (UI only) | `journalNotes.create` via Run-example | import-fork |
| PlaygroundNotePage `/playground/:id` | IDB note `playground/:id`, else seed from `new-playground.md` | notes+segments via playgroundContent | 500ms line-idle + blur/pagehide/unmount flush |
| WorkoutEditorPage `/collections/:cat/:name` | IDB, else bundled collection markdown (seed) | same | 500ms |
| FeedItemPage `/feeds/:f/:d/:i` | IDB `feed/...`, else bundled feed markdown (seed) | same | 500ms |
| JournalPage `/journal/:identity` | notePersistence.getNote (workbench projection) | provider.updateEntry | Zustand autosave 5000ms + flushSave on unmount |
| JournalDatePage `/journal/:date` | page→notes→results per date | per-note slices via mutateNote | 500ms + unmount flush |
| EffortDetailPage `/effort/:slug` | IDB efforts → registry → bundled markdown (3-tier fallback) | efforts store; **bundled edit auto-clones to `-custom` user copy** | 1200ms |
| EffortsCatalogPage `/efforts` | in-memory CompositeEffortRegistry | none | read-only |
| FeedDetailPage `/feeds/:slug` | bundled feed + IDB journal lookups | journal fork only | read-only listing |
| MarkdownCanvasPage `/guide/*` etc. | build-time markdown only | **edits NOT persisted**; results → recorder (origin=playground) | ephemeral edits |
| WallClockPage `/run/:id` | pendingRuntimes Map (in-memory) | results+analytics via mutateNote | write-on-complete |
| ReviewPage `/review/:id` | results store by id | none | read-only replay |
| LoadZipPage / JournalZipLoadPage | `?zip=` param | journalNotes.create (atomic) | import |

## Classification

- **Read-only** — EffortsCatalogPage, FeedDetailPage, ReviewPage
- **Edit-persist** — JournalPage, JournalDatePage, PlaygroundNotePage,
  WorkoutEditorPage, FeedItemPage, EffortDetailPage
- **Import/export** — LoadZipPage (display only; global `useZipProcessor`
  creates), JournalZipLoadPage, PlaygroundLandingPage forks

Result recording from any page is covered in
[04 — Workout Result Lifecycle](04-workout-result-lifecycle.md).
