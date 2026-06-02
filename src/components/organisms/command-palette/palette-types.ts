import type React from 'react';

/**
 * The request a caller passes to `usePaletteStore.open()`.
 * Sources drive the search; the caller handles the result.
 */
export interface PaletteRequest {
  placeholder?: string;
  initialQuery?: string;
  /** Optional contextual UI rendered below the search input (e.g. breadcrumbs, segment display). */
  header?: React.ReactNode;
  sources: PaletteDataSource[];
}

/**
 * A single pluggable search backend.
 * Pure async function — no side effects, no navigation.
 */
export interface PaletteDataSource {
  id: string;
  /** Displayed as a group heading above this source's results. */
  label?: string;
  search: (query: string) => PaletteItem[] | Promise<PaletteItem[]>;
}

/** A single result row returned by a PaletteDataSource. */
export interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Used as group header in the results list. */
  category?: string;
  type?: 'journal-entry' | 'collection' | 'workout' | 'action' | 'statement-part' | 'route';
  /** Caller-defined; returned as-is in PaletteResponse. */
  payload?: unknown;
}

/** What the palette resolves with when the user acts or dismisses. */
export type PaletteResponse =
  | { dismissed: true }
  | { dismissed: false; item: PaletteItem };
