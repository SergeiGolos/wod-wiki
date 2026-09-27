# Wayfinder map: Typed Tags

Labels: wayfinder:map

## Destination

Tags in Wod Wiki support dynamic typing backed by an IndexedDB `tag_types` store (DB v23). Any note frontmatter property matching a registered tag type is treated as a list of tags, synchronized bidirectionally to `Tag` and `NoteTag` records, assisted in the editor with typeahead chips and on-the-fly tag creation, and managed on the Settings page (`/settings/tags`) with tag type definitions and tag-to-type assignments.

## Notes

- **Plan-and-build effort**: per charting decision 1.C, execution is tracked directly inside this map.
- **Architectural Seams**:
  - Storage: `packages/core/src/types/storage.ts` & `apps/playground/src/types/storage.ts` (`TagType`, `Tag`, `TagTypeRecord`), `IndexedDBStorage.ts` (DB v23, `tag_types` store), `InMemoryStorage.ts`, `StorageService.ts`.
  - Persistence & sync: `apps/playground/src/services/content/IndexedDBContentProvider.ts` (frontmatter extraction & `NoteTag` sync).
  - Editor UI: `apps/playground/src/components/organisms/editor/FrontmatterCompanion.tsx` (detecting tag-type property match, typeahead chip list, tag creation).
  - Settings UI: `apps/playground/app/pages/SettingsPage.tsx` & `apps/playground/app/nav/appNavTree.ts` (`/settings/tags` subroute).
- **Domain alignment**:
  - Tags provide classification and discovery; they do not dictate note ownership, parser execution, or editor mode (see `docs/domain-model/Tag.md`).
  - Matching frontmatter keys are treated as lists of tags (charting decision 4.B).
- Skills per ticket: task for implementation; grilling + domain-modeling for emergent schema/cascade decisions.

## Decisions so far

<!-- index: one line per closed ticket; detail lives in the ticket -->
- [Tag Types Storage Schema and StorageService CRUD](issues/01-tag-types-storage-schema.md): `TagTypeRecord` added to core/playground storage types; DB_VERSION 23 with `tag_types` store (`by-name` index); `InMemoryStorage` configured; `StorageService` CRUD methods implemented.
- [Frontmatter Typed Tags Synchronization](issues/02-frontmatter-typed-tags-sync.md): frontmatter keys matching registered tag types are extracted via `extractTypedFrontmatterTags` and synced to `Tag` and `NoteTag` on note save/update; deletions cleanly unlink from the note.
- [Frontmatter Editor Typeahead and Tag Creation](issues/03-editor-typed-tags-typeahead.md): `FrontmatterCompanion.tsx` matches frontmatter keys to registered tag types, renders typeahead chip editors, and creates new tags on-the-fly into `storageService`.
- [Settings Page Tags Management Subroute](issues/04-settings-tags-management.md): `/settings/tags` subroute created with Tag Types definitions management and an audit view of all tags grouped by type with inline reassignment and deletion.

## Not yet specified

- **Tag Type Deletion Cascade**: whether deleting a tag type un-types associated tags (`type = undefined`) or is blocked if tags exist.
- **Seed Tag Types**: whether canonical types (e.g. `discipline`, `equipment`, `workout-type`) should be pre-seeded into `tag_types` on migration.
- **WQL / Query Filter Autocompleter**: surface typed tag suggestions `{property:tag}` in WQL palette search.

## Out of scope

- Hierarchical/nested tag namespaces (e.g. `equipment/barbell/bumper`).
- Global regex find-and-replace across raw markdown prose segments when renaming tags.
- Tag-driven compiler execution or note mode mutation.
