/**
 * STORE_DEFS — runtime store/index spec for the wodwiki database, derived
 * verbatim from IndexedDBStorage.open()'s upgrade callback (DB_VERSION 25,
 * apps/playground/src/services/storage/IndexedDBStorage.ts). The API server
 * builds its SQL schema from this spec.
 *
 * V25 adds the memberships store (system) and the by-user ownership index
 * on every store that can hold user-created rows (see USER_OWNED_STORES in
 * membership.ts — the ownership crosswalk).
 *
 * keyPath convention: array of property paths in key order. A single-element
 * array is a simple (scalar) key; multiple elements form a compound key.
 * Dotted paths ('baseAttributes.discipline') address nested properties.
 */

import type { StoreName } from './contract';

// DOMAIN_PROJECTION_VERSION lives in ./domain (re-exported by the package
// index) — deliberately not re-exported here to avoid a star-export
// ambiguity between ./schema and ./domain.

/**
 * Shared IndexedDB schema version — the browser database opens at exactly
 * this version (apps/playground/src/services/storage/IndexedDBStorage.ts
 * imports it), so store/index drift between the app and this spec is a type
 * error, not a runtime surprise. Bump on every store/index change and add
 * the matching guarded upgrade step.
 *
 * 27 supersedes 26: real databases already upgraded to the first 26 cut
 * (before by-source / by-created / the unique note-tag pair) exist in the
 * wild, so "version 26" is ambiguous — 27's presence-guarded repairs bring
 * every mixed DB to the same shape.
 */
export const DB_VERSION = 27;

/**
 * Typed field metadata — column type per extracted field path, shared with
 * the API so its SQL DDL derives DOUBLE PRECISION / INTEGER / BOOLEAN /
 * TEXT from this table instead of a hardcoded per-index allowlist.
 *
 * Extraction rule (API side): a primary-key column `k<i>` takes the type of
 * STORE_DEFS store's keyPath[i]; an index column `i_<index>_<part>` takes the
 * type of that index's keyPath[part] here. Anything absent defaults to TEXT.
 * Civil-date strings stay TEXT on purpose (page.date is 'YYYY-MM-DD');
 * instants are epoch-ms numbers (notes.date, createdAt, timestamp).
 */
export type StorageColumnType = 'number' | 'text' | 'boolean';

export const COLUMN_TYPES: Record<StoreName, Record<string, StorageColumnType>> = {
  notes: { date: 'number', createdAt: 'number' },
  page: { createdAt: 'number' }, // page.date is a civil 'YYYY-MM-DD' string → TEXT
  page_notes: { position: 'number', createdAt: 'number' },
  tags: { createdAt: 'number' },
  tag_types: { createdAt: 'number' },
  note_tags: {},
  segments: {
    version: 'number',
    position: 'number',
    createdAt: 'number',
    updatedAt: 'number',
    isHistory: 'boolean',
  },
  sessions: {
    segmentVersion: 'number',
    version: 'number',
    startTime: 'number',
    endTime: 'number',
    duration: 'number',
    roundsCompleted: 'number',
    totalRounds: 'number',
    repsCompleted: 'number',
    completed: 'boolean',
    createdAt: 'number',
  },
  attachments: { createdAt: 'number' },
  events: {
    timestamp: 'number',
    segmentVersion: 'number',
    line: 'number',
    sourceStatementId: 'number',
    stackLevel: 'number',
    'timeSpan.started': 'number',
    'timeSpan.ended': 'number',
  },
  field_catalog: {},
  field_sources: {},
  field_values: {},
  field_catalog_meta: {},
  efforts: { 'baseAttributes.met': 'number' },
  block_index: {
    segmentVersion: 'number',
    position: 'number',
    createdAt: 'number',
    isStatic: 'boolean',
  },
  block_efforts: { createdAt: 'number', isStatic: 'boolean' },
  meta: {},
  memberships: { createdAt: 'number' },
};

export interface IndexDef {
  name: string;
  keyPath: string[];
  unique?: boolean;
  multiEntry?: boolean;
}

export interface StoreDef {
  name: StoreName;
  keyPath: string[];
  indexes: IndexDef[];
  /** System stores survive wipe() (identity must not be reset with data). */
  system?: boolean;
}

export const STORE_DEFS: StoreDef[] = [
  // 1. notes
  { name: 'notes', keyPath: ['id'], indexes: [
    { name: 'by-date', keyPath: ['date'] },
    { name: 'by-created', keyPath: ['createdAt'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 2. page
  { name: 'page', keyPath: ['id'], indexes: [
    { name: 'by-date', keyPath: ['date'], unique: true },
    { name: 'by-slug', keyPath: ['slug'], unique: true },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 2b. page_notes (V22)
  { name: 'page_notes', keyPath: ['id'], indexes: [
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-page-note', keyPath: ['pageId', 'noteId'], unique: true },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 3. tags
  { name: 'tags', keyPath: ['id'], indexes: [
    { name: 'by-label', keyPath: ['label'], unique: true },
    { name: 'by-type', keyPath: ['type'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 3a. tag_types (V23)
  { name: 'tag_types', keyPath: ['id'], indexes: [
    { name: 'by-name', keyPath: ['name'], unique: true },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 4. note_tags
  { name: 'note_tags', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-tag', keyPath: ['tagId'] },
    { name: 'by-note-tag', keyPath: ['noteId', 'tagId'], unique: true },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 5. segments
  { name: 'segments', keyPath: ['id', 'version'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-type', keyPath: ['dataType'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-history', keyPath: ['isHistory'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 6. sessions
  { name: 'sessions', keyPath: ['id'], indexes: [
    { name: 'by-segment', keyPath: ['segmentId'] },
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-completed', keyPath: ['createdAt'] },
    { name: 'by-content', keyPath: ['blockContentId'] },
    { name: 'by-block', keyPath: ['blockId'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-origin', keyPath: ['origin'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 7. results — removed in V26: legacy alias of sessions. The V26 upgrade
  // migrates any residual rows into `sessions` (projecting pre-V21 data.logs
  // into event rows) before dropping the store; no compatibility alias.
  // 8. attachments
  { name: 'attachments', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-time', keyPath: ['createdAt'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-result', keyPath: ['resultId'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 9. events
  { name: 'events', keyPath: ['id'], indexes: [
    { name: 'by-timestamp', keyPath: ['timestamp'] },
    { name: 'by-result-grain', keyPath: ['resultId', 'grain'] },
    { name: 'by-content-grain', keyPath: ['blockContentId', 'grain'] },
    { name: 'by-effort', keyPath: ['effortSlug'] },
    { name: 'by-outputType', keyPath: ['outputType'] },
    { name: 'by-grain', keyPath: ['grain'] },
    { name: 'by-metric-date', keyPath: ['metricDateKeys'], multiEntry: true },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 10. field catalog
  { name: 'field_catalog', keyPath: ['id'], indexes: [
    { name: 'by-path', keyPath: ['path'] },
  ] },
  { name: 'field_sources', keyPath: ['id'], indexes: [] },
  { name: 'field_values', keyPath: ['key'], indexes: [
    { name: 'by-field', keyPath: ['fieldId'] },
  ] },
  { name: 'field_catalog_meta', keyPath: ['id'], indexes: [] },
  // 11. efforts
  { name: 'efforts', keyPath: ['slug'], indexes: [
    { name: 'by-discipline', keyPath: ['baseAttributes.discipline'] },
    { name: 'by-source', keyPath: ['registrySource'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 12. block_index
  { name: 'block_index', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-content', keyPath: ['blockContentId'] },
    { name: 'by-type', keyPath: ['dataType'] },
    { name: 'by-source', keyPath: ['sourceId'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 13. block_efforts
  { name: 'block_efforts', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-effort', keyPath: ['effortSlug'] },
    { name: 'by-block', keyPath: ['blockContentId'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
  // 14. meta
  { name: 'meta', keyPath: ['key'], indexes: [] },
  // 15. memberships (V25, system — survives wipe; truth lives in
  // localStorage locally, in the SQL table on the API)
  { name: 'memberships', keyPath: ['id'], indexes: [], system: true },
];
