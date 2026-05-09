/**
 * paletteDataSources — PaletteDataSource factories for the playground app.
 *
 * Each factory returns a pure search backend with no side effects.
 * The caller receives the selected PaletteItem and decides what to do.
 */

import type { PaletteDataSource, PaletteItem } from '@/components/command-palette/palette-types';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { playgroundDB } from './playgroundDB';
import type { CanvasRoute } from '../canvas/canvasRoutes';

export type WorkoutItem = {
  id: string;
  name: string;
  category: string;
  content?: string;
  searchHidden?: boolean;
};

// ── Global search ─────────────────────────────────────────────────────────

/**
 * Searches canvas pages, workout library items, and recent IndexedDB results.
 * Used for Ctrl+/ global search.
 */
export function globalSearchSource(
  items: WorkoutItem[],
  canvasRoutes?: CanvasRoute[]
): PaletteDataSource {
  return {
    id: 'global-search',
    label: 'Search',
    search: async (query) => {
      const results: PaletteItem[] = [];
      const low = query.toLowerCase();

      // Canvas route pages
      if (canvasRoutes?.length) {
        canvasRoutes
          .filter(r => {
            const title = r.page.sections[0]?.heading ?? r.route;
            return !low || title.toLowerCase().includes(low) || r.route.toLowerCase().includes(low);
          })
          .slice(0, 5)
          .forEach(r => {
            const title = r.page.sections[0]?.heading ?? r.route;
            results.push({
              id: `route:${r.route}`,
              label: title,
              sublabel: r.route,
              category: 'Pages',
              type: 'route',
              payload: { route: r.route },
            });
          });
      }

      // Workout library
      items
        .filter(item =>
          !item.searchHidden &&
          (!low ||
            item.name.toLowerCase().includes(low) ||
            item.category.toLowerCase().includes(low))
        )
        .slice(0, 10)
        .forEach(item => {
          results.push({
            id: item.id,
            label: item.name,
            sublabel: item.category,
            category: item.category,
            type: 'workout',
            payload: item,
          });
        });

      // Recent IndexedDB results
      try {
        const recent = await indexedDBService.getRecentResults(50);
        recent
          .filter(r => {
            const name = r.noteId.split('/').pop()?.toLowerCase() ?? '';
            return !low || name.includes(low) || r.id.toLowerCase().includes(low);
          })
          .slice(0, 5)
          .forEach(r => {
            const date = new Date(r.completedAt).toLocaleDateString();
            const name = r.noteId.split('/').pop() ?? r.noteId;
            results.push({
              id: r.id,
              label: name,
              sublabel: `${date} · ${r.data?.completed ? 'Completed' : 'Partial'}`,
              category: 'Recent',
              type: 'journal-entry',
              payload: r,
            });
          });
      } catch (e) {
        console.error('[globalSearchSource] IndexedDB error', e);
      }

      return results;
    },
  };
}

// ── Collection search ──────────────────────────────────────────────────────

/**
 * Lists items within a single collection.
 * Used when drilling into a collection from global search or nav panel.
 */
export function collectionSource(
  collectionName: string,
  items: WorkoutItem[]
): PaletteDataSource {
  return {
    id: `collection:${collectionName}`,
    label: collectionName,
    search: async (query) => {
      const low = query.toLowerCase();
      return items
        .filter(
          item =>
            item.category === collectionName &&
            (!low || item.name.toLowerCase().includes(low))
        )
        .map(item => ({
          id: item.id,
          label: item.name,
          sublabel: item.category,
          category: item.category,
          type: 'workout' as const,
          payload: item,
        }));
    },
  };
}

// ── WOD block source (for statement builder) ───────────────────────────────

export type { SegmentType } from '@/components/command-palette/segmentSources';
export { segmentSource } from '@/components/command-palette/segmentSources';

// ── Journal "create from" sources ─────────────────────────────────────────

export const CREATE_FROM_SOURCE: PaletteDataSource = {
  id: 'create-from',
  label: 'Create from',
  search: async (query) => {
    const options: PaletteItem[] = [
      { id: 'blank',      label: 'Blank',      sublabel: 'Empty entry with a workout block ready to fill in', category: 'Create from', type: 'action', payload: 'blank' },
      { id: 'template',   label: 'Template',   sublabel: 'Coming soon — saved note templates',               category: 'Create from', type: 'action', payload: 'template' },
      { id: 'collection', label: 'Collection', sublabel: 'Clone a workout from the library into this entry', category: 'Create from', type: 'action', payload: 'collection' },
      { id: 'history',    label: 'History',    sublabel: 'Copy the structure of a past journal entry',       category: 'Create from', type: 'action', payload: 'history' },
    ];
    if (!query) return options;
    const low = query.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(low) || (o.sublabel ?? '').toLowerCase().includes(low)
    );
  },
};

export function journalHistorySource(excludeDateKey?: string): PaletteDataSource {
  return {
    id: 'journal-history',
    label: 'Past Entries',
    search: async (query) => {
      const [lower, upper] = await Promise.all([
        playgroundDB.getPagesByCategory('journal'),
        playgroundDB.getPagesByCategory('Journal'),
      ]);
      const q = query.toLowerCase();
      return [...lower, ...upper]
        .filter(p => {
          const key = p.id.replace(/^journal\//, '');
          return (
            /^\d{4}-\d{2}-\d{2}$/.test(key) &&
            p.id !== `journal/${excludeDateKey}` &&
            (!q || p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
          );
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 30)
        .map(p => ({
          id: p.id,
          label: p.name,
          sublabel: new Date(p.updatedAt).toLocaleDateString(),
          category: 'Journal',
          type: 'journal-entry' as const,
          payload: p,
        }));
    },
  };
}
