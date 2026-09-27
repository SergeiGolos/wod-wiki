Status: resolved
# Tag Types Storage Schema and StorageService CRUD

Type: task

## Question

How should the data model, IndexedDB stores, and storage adapters be updated to support dynamic tag types alongside tags?

Implementation details to deliver:
1. Data contracts: define `TagTypeRecord` (`{ id: string, name: string, label: string, color?: string, createdAt: number }`) and widen `Tag.type` from hardcoded union to string in `packages/core/src/types/storage.ts` and `apps/playground/src/types/storage.ts`.
2. IndexedDB migration: bump `DB_VERSION` from 22 to 23 in `apps/playground/src/services/storage/IndexedDBStorage.ts`, create `tag_types` object store with index `by-name` (unique).
3. Test storage: add `tag_types` store support to `InMemoryStorage.ts`.
4. StorageService operations: expose `getTagTypes()`, `getTagType(nameOrId)`, `putTagType(type)`, `deleteTagType(id)`, and ensure `getTags(type?)` / `putTag(tag)` properly support dynamic types.
5. Automated test verifying store migration and CRUD operations.

## Answer

Resolved by implementation:
1. Added `TagTypeRecord` (`{ id, name, label, color?, createdAt }`) and widened `Tag.type` to dynamic string in both `packages/core/src/types/storage.ts` and `apps/playground/src/types/storage.ts`.
2. Bumped `DB_VERSION` from 22 to 23 in `IndexedDBStorage.ts` with `tag_types` object store indexed by unique `name`.
3. Added `tag_types` to `StorageSchema` in `IStorage.ts` and `STORE_CONFIGS` in `InMemoryStorage.ts`.
4. Added tag type CRUD methods to `StorageService` (`getAllTagTypes`, `getTagType`, `putTagType`, `deleteTagType`, `getTags`, `putTag`, `updateTagType`).
5. Verified with automated suite in `apps/playground/src/services/storage/TagTypeStorage.test.ts`.
