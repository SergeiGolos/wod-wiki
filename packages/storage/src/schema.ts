/**
 * STORE_DEFS — runtime store/index spec for the wodwiki database, derived
 * verbatim from IndexedDBStorage.open()'s upgrade callback (DB_VERSION 24,
 * apps/playground/src/services/storage/IndexedDBStorage.ts). The API server
 * builds its SQL schema from this spec.
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
}

export const STORE_DEFS: StoreDef[] = [
  // 1. notes
  { name: 'notes', keyPath: ['id'], indexes: [
    { name: 'by-date', keyPath: ['date'] },
  ] },
  // 2. page
  { name: 'page', keyPath: ['id'], indexes: [
    { name: 'by-date', keyPath: ['date'], unique: true },
    { name: 'by-slug', keyPath: ['slug'], unique: true },
  ] },
  // 2b. page_notes (V22)
  { name: 'page_notes', keyPath: ['id'], indexes: [
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-page-note', keyPath: ['pageId', 'noteId'], unique: true },
  ] },
  // 3. tags
  { name: 'tags', keyPath: ['id'], indexes: [
    { name: 'by-label', keyPath: ['label'], unique: true },
    { name: 'by-type', keyPath: ['type'] },
  ] },
  // 3a. tag_types (V23)
  { name: 'tag_types', keyPath: ['id'], indexes: [
    { name: 'by-name', keyPath: ['name'], unique: true },
  ] },
  // 4. note_tags
  { name: 'note_tags', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-tag', keyPath: ['tagId'] },
  ] },
  // 5. segments
  { name: 'segments', keyPath: ['id', 'version'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-type', keyPath: ['dataType'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-history', keyPath: ['isHistory'] },
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
  ] },
  // 8. attachments
  { name: 'attachments', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-time', keyPath: ['createdAt'] },
    { name: 'by-page', keyPath: ['pageId'] },
    { name: 'by-result', keyPath: ['resultId'] },
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
  ] },
  // 12. block_index
  { name: 'block_index', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-content', keyPath: ['blockContentId'] },
    { name: 'by-type', keyPath: ['dataType'] },
  ] },
  // 13. block_efforts
  { name: 'block_efforts', keyPath: ['id'], indexes: [
    { name: 'by-note', keyPath: ['noteId'] },
    { name: 'by-effort', keyPath: ['effortSlug'] },
    { name: 'by-block', keyPath: ['blockContentId'] },
  ] },
  // 14. meta
  { name: 'meta', keyPath: ['key'], indexes: [] },
];
