/**
 * wqlSearchSource — WQL-driven data sources for the global Search Palette
 * (issue #834, decision #828).
 *
 * The palette embeds the shared WqlComposer; the composed WQL is the query
 * every source receives. `wqlSearchSource` resolves it through the shared
 * `searchEntries` pipeline (the same semantics as /library) and maps entries
 * to palette items. Text-only sources (canvas pages, construct reference)
 * are kept alive via `withWqlText`, which extracts the query's free-text
 * terms so they keep matching while the user composes.
 */
import type { PaletteDataSource, PaletteItem } from '@/components/organisms/command-palette/palette-types';
import { queryService } from '@/services/queryService';
import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-engine';;
import type { WqlExecutor } from '@bitcobblers/wod-wiki-ui';
import { entryOpenHref } from '../lib/entryActions';
import { searchEntries } from '../lib/entrySearch';
import type { Entry, EntryKind } from '../lib/entryMapper';

const MAX_RESULTS = 20;

const KIND_CATEGORY: Record<EntryKind, string> = {
  note: 'Journal',
  session: 'Collections',
  post: 'Feeds',
};

function toPaletteItem(entry: Entry): PaletteItem {
  return {
    id: `entry:${entry.id}`,
    label: entry.title,
    sublabel: entry.subtitle ?? entry.date ?? undefined,
    category: KIND_CATEGORY[entry.kind],
    type: 'entry',
    payload: entry,
  };
}

/**
 * WQL-driven search: valid find queries execute through the engine; invalid
 * (mid-edit) WQL yields no rows — the composer's diagnostics strip carries
 * the error, so the palette stays quiet instead of flashing stale results.
 */
export function wqlSearchSource(): PaletteDataSource {
  return {
    id: 'wql-search',
    label: 'Search',
    search: async (wql) => {
      const entries = await searchEntries(wql);
      return entries.slice(0, MAX_RESULTS).map(toPaletteItem);
    },
  };
}

/**
 * Extract the free-text terms of a WQL query. Valid queries contribute their
 * `text:` filter values; invalid (mid-edit) queries are salvaged by
 * stripping WQL syntax so typed words still reach text-based sources.
 */
export function paletteTextFromWql(wql: string): string {
  const parsed = parseQuery(wql);
  if (isFindQuery(parsed) && !parsed.error) {
    return parsed.filters
      .filter(f => f.key === 'text' && !f.negate)
      .flatMap(f => f.values.map(v => v.value))
      .join(' ');
  }
  return wql
    .replace(/^find:\w+/, ' ')
    .replace(/\bin\s+\w+/g, ' ')
    .replace(/\blast\s+\w+/g, ' ')
    .replace(/\bwhere\b/g, ' ')
    .replace(/[{()}]/g, ' ')
    .replace(/\b\w+:/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adapt a plain-text palette source to a WQL-mode request: the source sees
 * only the query's free-text terms, never WQL syntax.
 */
export function withWqlText(source: PaletteDataSource): PaletteDataSource {
  return {
    id: `${source.id}:wql-text`,
    label: source.label,
    search: (wql) => source.search(paletteTextFromWql(wql)),
  };
}

/**
 * Palette-specific slot defaults (issue #834): whole-note results across all
 * sources with no time window — the fuzzy palette this replaces searched
 * everything, unbounded by date.
 */
export function searchPaletteQuery(): string {
  return 'find:note';
}

/** Stage-count executor for the palette's diagnostics strip, wired at the
 *  service layer so the generic PaletteShell stays decoupled from analytics.
 *  Dispatches on query kind: find queries run the find engine, aggregate
 *  queries run the analytics engine. */
export const paletteExecute: WqlExecutor = ast =>
  isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw);

/** Route/construct items carry `{ route }` by source contract. */
interface RoutePayload {
  route: string;
}

/**
 * The single result dispatch for the global Search Palette — shared by the
 * Cmd+K opener (App) and the landing page so both navigate identically.
 */
export function navigatePaletteResult(item: PaletteItem, navigate: (to: string) => void): void {
  if (item.type === 'route') {
    const payload = item.payload as RoutePayload;
    navigate(payload.route);
  } else if (item.type === 'entry') {
    // WQL items carry the Entry produced by wqlSearchSource.
    const entry = item.payload as Entry;
    navigate(entryOpenHref(entry));
  }
}
