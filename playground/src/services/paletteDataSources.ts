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
import type { WodCollection } from '@/repositories/wod-collections';

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

// ── Collection drill-down sources ───────────────────────────────────────────

/**
 * Lists every WOD collection as a selectable item.
 * Payload: WodCollection
 */
export function collectionListSource(): PaletteDataSource {
  return {
    id: 'collection-list',
    label: 'Collections',
    search: async (query) => {
      // Dynamic import keeps import.meta.glob out of the module-load critical path
      // so test environments don't choke on it.
      const { getWodCollections } = await import('@/repositories/wod-collections');
      const collections = getWodCollections();
      const low = query.toLowerCase();
      return collections
        .filter(c => !low || c.name.toLowerCase().includes(low) || c.id.toLowerCase().includes(low))
        .map(c => ({
          id: c.id,
          label: c.name,
          sublabel: `${c.count} workout${c.count !== 1 ? 's' : ''}`,
          category: 'Collections',
          type: 'collection' as const,
          payload: c,
        }));
    },
  };
}

/**
 * Lists workout items within a single WodCollection.
 * Payload: WodCollectionItem
 */
export function collectionItemsSource(collection: WodCollection): PaletteDataSource {
  return {
    id: `collection-items:${collection.id}`,
    label: collection.name,
    search: async (query) => {
      const low = query.toLowerCase();
      return collection.items
        .filter(item =>
          !low ||
          item.name.toLowerCase().includes(low) ||
          item.id.toLowerCase().includes(low)
        )
        .map(item => ({
          id: item.id,
          label: item.name,
          sublabel: collection.name,
          category: collection.name,
          type: 'workout' as const,
          payload: item,
        }));
    },
  };
}

// ── WOD block extraction ──────────────────────────────────────────────────

export interface ExtractedWodBlock {
  index: number;
  /** The raw wod/log/plan script inside the fence */
  script: string;
  /** First non-empty line — used as a short preview label */
  preview: string;
  /** The dialect: wod | log | plan */
  dialect: 'wod' | 'log' | 'plan';
}

/**
 * Pull every ```wod / ```log / ```plan fenced block out of a markdown string.
 */
export function extractWodBlocks(markdown: string): ExtractedWodBlock[] {
  const blocks: ExtractedWodBlock[] = [];
  const re = /```(wod|log|plan)\r?\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(markdown)) !== null) {
    const dialect = match[1].toLowerCase() as ExtractedWodBlock['dialect'];
    const script = match[2];
    const preview = script.split('\n').find(l => l.trim())?.trim() ?? '(empty block)';
    blocks.push({ index: index++, script, preview, dialect });
  }
  return blocks;
}

/**
 * Lists extracted WOD blocks from a workout's markdown content.
 * Returns a single "whole workout" option when there is only one block.
 * Payload: ExtractedWodBlock
 */
export function wodBlockSource(
  workoutName: string,
  markdown: string
): PaletteDataSource {
  const blocks = extractWodBlocks(markdown);
  return {
    id: `wod-blocks:${workoutName}`,
    label: 'WOD Blocks',
    search: async (query) => {
      const low = query.toLowerCase();
      const items: PaletteItem[] = blocks.map((b, i) => ({
        id: `block-${i}`,
        label: blocks.length === 1 ? workoutName : `Block ${i + 1}: ${b.preview}`,
        sublabel: b.preview !== `Block ${i + 1}: ${b.preview}` ? b.preview : undefined,
        category: workoutName,
        type: 'action' as const,
        payload: b,
      }));
      if (!low) return items;
      return items.filter(it =>
        it.label.toLowerCase().includes(low) ||
        (it.sublabel ?? '').toLowerCase().includes(low)
      );
    },
  };
}

// ── Feed drill-down (recent journal entries as a source pool) ─────────────

/**
 * Lists recent journal entries as workout sources for the Feed path.
 * Payload: PlaygroundPage (with .content)
 */
export function feedSource(excludeDateKey?: string): PaletteDataSource {
  return {
    id: 'feed-source',
    label: 'Recent Feed',
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
          category: 'Recent',
          type: 'journal-entry' as const,
          payload: p,
        }));
    },
  };
}

// ── Journal "create from" sources ─────────────────────────────────────────

export const CREATE_FROM_SOURCE: PaletteDataSource = {
  id: 'create-from',
  label: 'Create from',
  search: async (query) => {
    const options: PaletteItem[] = [
      { id: 'blank',      label: 'Blank',      sublabel: 'Empty entry with a workout block ready to fill in',       category: 'Create from', type: 'action', payload: 'blank' },
      { id: 'collection', label: 'Collection', sublabel: 'Drill into a collection → pick a workout → clone a WOD block', category: 'Create from', type: 'action', payload: 'collection' },
      { id: 'feed',       label: 'Feed',       sublabel: 'Pick a recent entry from your feed and clone a WOD block',  category: 'Create from', type: 'action', payload: 'feed' },
      { id: 'history',    label: 'History',    sublabel: 'Copy the full content of a past journal entry',             category: 'Create from', type: 'action', payload: 'history' },
      { id: 'template',   label: 'Template',   sublabel: 'Coming soon — saved note templates',                          category: 'Create from', type: 'action', payload: 'template' },
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
