import type React from 'react';
import type { QueryClause, WqlExecutor } from '../wql-composer';

/**
 * WQL mode for the palette (issue #834, decision #828): the plain text input
 * is replaced by the embedded WqlComposer, and sources receive the composed
 * WQL string instead of fuzzy text.
 */
export interface PaletteWqlConfig {
  /**
   * Palette-specific slot configuration — seed clauses for the composer
   * (e.g. its default target/scope/time). Defaults to the composer's own
   * defaults (note / journal / last 2w).
   */
  initialClauses?: QueryClause[];
  /** Extra content rendered inside the composer bar, after the add-filter menu. */
  customSlots?: React.ReactNode;
  /** Render the composer's diagnostics strip (badge, AST summary, stage counts). Default true. */
  showDiagnostics?: boolean;
  /**
   * Executor for live stage counts in the diagnostics strip — dispatch on
   * query kind, e.g. `(ast) => isFindQuery(ast) ? queryService.runFind(ast)
   * : queryService.runQuery(ast.raw)`. When omitted, the strip omits counts
   * and no query is executed.
   */
  execute?: WqlExecutor;
}

/**
 * The request a caller passes to `usePaletteStore.open()`.
 * Sources drive the search; the caller handles the result.
 */
export interface PaletteRequest {
  placeholder?: string;
  initialQuery?: string;
  /** Optional contextual UI rendered below the search input (e.g. breadcrumbs, segment display). */
  header?: React.ReactNode;
  /** WQL mode: embed the WqlComposer and feed composed WQL to the sources. */
  wql?: PaletteWqlConfig;
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
  type?: 'journal-entry' | 'collection' | 'workout' | 'action' | 'statement-part' | 'route' | 'entry';
  /** Caller-defined; returned as-is in PaletteResponse. */
  payload?: unknown;
}

/** What the palette resolves with when the user acts or dismisses. */
export type PaletteResponse =
  | { dismissed: true }
  | { dismissed: false; item: PaletteItem };
