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
  // 7. results (legacy alias of sessions)
  { name: 'results', keyPath: ['id'], indexes: [
    { name: 'by-segment', keyPath: ['segmentId'] },
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-completed', keyPath: ['createdAt'] },
    { name: 'by-content', keyPath: ['blockContentId'] },
    { name: 'by-block', keyPath: ['blockId'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-origin', keyPath: ['origin'] },
    { name: 'by-user', keyPath: ['userId'] },
  ] },
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
