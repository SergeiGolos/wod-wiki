Status: resolved
# Frontmatter Typed Tags Synchronization

Type: task
Blocked by: 01

## Question

How should frontmatter properties matching registered tag types synchronize to `Tag` and `NoteTag` storage during note save and load?

Implementation details to deliver:
1. Frontmatter inspection: on note save in `IndexedDBContentProvider` (or persistence layer), query known `tag_types`.
2. Property matching: for each frontmatter property whose key matches a known tag type name, normalize value to a string list (per charting decision 4.B).
3. Tag & NoteTag persistence: for each tag label in the list, ensure a `Tag` record exists with `type: tagTypeName`, and write a `NoteTag` record connecting the note to that tag.
4. Clean removal: if a tag is removed from the frontmatter property list, remove the corresponding `NoteTag` link for that note.
5. Automated test verifying saving frontmatter with typed tags writes expected `Tag` and `NoteTag` records.

## Answer

Resolved by implementation:
1. Added `extractTypedFrontmatterTags` in `apps/playground/src/lib/frontmatter.ts` which parses frontmatter YAML and matches property keys against registered tag types, extracting normalized typed tag lists alongside general tags.
2. Enhanced `StorageService.setNoteTags` to accept `Array<string | { label: string; type?: string }>` inputs, ensuring tags are created or updated with their type, and `note_tags` junctions accurately reflect the note's active tag set.
3. Integrated typed tags extraction into `IndexedDBContentProvider.saveEntry` and `updateEntry`. Removing a tag from frontmatter cleanly removes its `NoteTag` junction for the note while retaining manual/untyped tags.
4. Added automated integration test suite in `apps/playground/src/services/content/__tests__/IndexedDBContentProvider.typedTags.test.ts`.
