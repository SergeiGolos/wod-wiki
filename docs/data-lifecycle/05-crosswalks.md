# 05 — Crosswalks & Reference

Lookup tables tying pages, stores, and keys together. Schema detail:
[02 — Database Schema](02-database-schema.md). Flow detail:
[03 — Page Lifecycles](03-page-lifecycles.md).

## Store → writers / readers

| Store | Written by | Read by |
|---|---|---|
| `notes` | createNote, mutateNote (lazy create), savePage seed | every page via provider/persistence |
| `segments` | updateEntry (new version rows), saveEntry | getEntry/getEntries, getLatestSegmentsForNote |
| `results` | mutateNote → saveResult (single seam: playgroundRecorder) | ReviewPage, JournalDatePage, InlineResultPanel, EffortsNavPanel (`getRecentResults`), routeView |
| `analytics` | mutateNote (summary rows from `outputType='analytics'` logs) | trend queries via `by-content` / `by-metric` / `by-effort` |
| `attachments` | mutateNote / saveAttachment | note projection (`includeAttachments`) |
| `efforts` | useEffortContent save (upsert + auto-clone) | EffortDetailPage, CompositeEffortRegistry.loadBundled |
| `page` | getOrCreatePageForDate, createNote (journal date) | journalDate grouping, listByDate |
| `tags` / `note_tags` | setNoteTags | getTagsForNote |

## Persistence seam map

| Layer | Symbol | Role |
|---|---|---|
| Page hooks | `usePlaygroundContent`, `useEffortContent`, `useEditorSave`, WorkbenchSessionStore | load + debounced save per page type |
| Playground services | `journalNotes`, `playgroundContent`, `journalWorkout`, `createPlaygroundPage`, `playgroundRecorder` | typed facades; single result seam |
| Library adapters | `IndexedDBNotePersistence` (`notePersistence` singleton), `IndexedDBContentProvider` | createNote/getNote/listNotes/mutateNote/deleteNote; getEntry/saveEntry/updateEntry/cloneEntry |
| DB driver | `indexedDBService` | raw CRUD over `wodwiki-db` v11 |

## localStorage key inventory (no user content)

| Key | Shape | Writer → Reader |
|---|---|---|
| `wodwiki.profile.v1` | `{trainingGoal?, defaultUnits?, pinnedEffort?, firstNoteUsedAt?}` | playgroundProfile → wizard/banner/cursor-insert |
| `wodwiki.profileInitialized.v1` | `'true'` | updateProfile → useProfileInitialized |
| `wodwiki.firstNoteProgress.v1` | `{step, goal, units, pinnedEffort}` | wizard (resume) |
| `wodwiki.firstNoteDone.v1` | `'true'` | useIsFirstNoteEver |
| `wodwiki.onboarding.v1` | `Record<step, bool>` | useOnboardingProgress / useOnboardingEvents |
| `wodwiki.quests.v1` | `Record<route, Record<questId, bool>>` | questProgress → usePageQuests / useChapterProgress |
| `wodwiki:showPlaygrounds` | JSON boolean | useShowPlaygrounds |
| `wodwiki:history:{id}`, `wodwiki:attachment:{id}`, `wodwiki:note-attachments:{noteId}` | legacy HistoryEntry/Attachment | LocalStorageContentProvider → one-shot MigrationService |
| `wodwiki:migrated-to-idb-v4` | `'true'` | MigrationService gate |
| `wodwiki:notebooks`, `wodwiki:active-notebook` | `Notebook[]` / id | NotebookService |
| `wod-wiki-exercise-index(-version)` | LRU cache + `'3.0.0'` | ExerciseIndexManager |
| `wod-wiki:userOutputOverrides` | `Record<blockKey, fragments[]>` | useUserOverrides (flag-gated) |
| `wod-wiki-audio-enabled`, `wod-wiki-debug-mode`, `debugMode`, `vite-ui-theme`, `wod-wiki-playground-theme` | strings | AudioService / DebugModeContext / PageToolbar / ThemeProvider |

## Debounce timings (file:line)

| Surface | Timing | Source |
|---|---|---|
| useEditorSave default | line-idle 800ms; flush on line change, blur, pagehide, unmount | `playground/src/hooks/useEditorSave.ts` |
| Playground/Workout/FeedItem pages | 500ms | `usePlaygroundContent.ts` |
| JournalDatePage | 500ms + unmount flush | `JournalDatePage.tsx` |
| EffortDetailPage | 1200ms | `useEffortContent.ts` |
| JournalPage (workbench) | 5000ms + flushSave on unmount | `src/stores/workbenchSessionStore.ts` |

## Reset semantics

`resetUserData` wipes everything: `indexedDBService.wipe()` (deletes
`wodwiki-db`), best-effort drop of legacy `wodwiki-playground`,
`localStorage.clear()`, `sessionStorage.clear()`. Build-time markdown is
unaffected — pages re-seed from it on next visit.
