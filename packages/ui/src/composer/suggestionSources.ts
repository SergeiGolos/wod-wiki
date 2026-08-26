import type { BlockIndexRow } from '@bitcobblers/wod-wiki-core';

export interface SuggestionItem {
  value: string;
  label?: string;
  description?: string;
  icon?: string;
}

export type SuggestionCachePolicy = 'static' | { ttlMs: number };

export interface SuggestionBinding {
  load: () => Promise<SuggestionItem[]>;
  cache: SuggestionCachePolicy;
  open: boolean;
  emptyText: string;
}

export function tagsFromStaticBlocks(blocks: BlockIndexRow[]): string[] {
  const set = new Set<string>();
  for (const b of blocks) {
    const row = b as any;
    if (row.frontmatter?.tags && Array.isArray(row.frontmatter.tags)) {
      for (const t of row.frontmatter.tags) {
        if (typeof t === 'string' && t.trim().length > 0) set.add(t.trim());
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function catalogOf(noteId: string): string {
  return noteId.startsWith('feeds/') ? noteId.split('/')[1]! : noteId.split('/')[0]!;
}

export function catalogIdsFromBlocks(blocks: BlockIndexRow[]): string[] {
  const set = new Set<string>();
  for (const b of blocks) {
    if (b.sourceId && b.sourceId.startsWith('collection:')) {
      set.add(catalogOf(b.noteId));
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function blockTypesFromBlocks(blocks: BlockIndexRow[]): string[] {
  const set = new Set<string>();
  for (const b of blocks) {
    if (b.dataType && b.dataType.trim().length > 0) set.add(b.dataType.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function mergeTagSuggestions(userLabels: string[], corpusLabels: string[]): string[] {
  const map = new Map<string, string>();
  for (const label of corpusLabels) {
    const trimmed = label.trim();
    if (trimmed) map.set(trimmed.toLowerCase(), trimmed);
  }
  for (const label of userLabels) {
    const trimmed = label.trim();
    if (trimmed) map.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

const builtinBindings: Record<string, SuggestionBinding> = {
  tag: {
    load: async () => [],
    cache: { ttlMs: 30_000 },
    open: true,
    emptyText: 'No tags yet — type one to filter by it',
  },
  effort: {
    load: async () => [],
    cache: { ttlMs: 60_000 },
    open: true,
    emptyText: 'No efforts yet — create one on an effort page',
  },
  discipline: {
    load: async () => [
      { value: 'crossfit', label: 'CrossFit' },
      { value: 'weightlifting', label: 'Weightlifting' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'gymnastics', label: 'Gymnastics' },
      { value: 'climbing', label: 'Climbing' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'habits', label: 'Habits' },
    ],
    cache: 'static',
    open: false,
    emptyText: 'No disciplines available',
  },
  catalog: {
    load: async () => [],
    cache: 'static',
    open: false,
    emptyText: 'No catalogs in the static corpus',
  },
  type: {
    load: async () => [
      { value: 'wod', label: 'WOD' },
      { value: 'movement', label: 'Movement' },
      { value: 'workout', label: 'Workout' },
    ],
    cache: { ttlMs: 300_000 },
    open: false,
    emptyText: 'No indexed block types yet',
  },
  has: {
    load: async () => ['timer', 'image', 'metric', 'rx'].map((value) => ({ value })),
    cache: 'static',
    open: false,
    emptyText: 'No features available',
  },
};

export const SUGGESTION_BINDINGS: Record<string, SuggestionBinding> = { ...builtinBindings };

export function setSuggestionBinding(type: string, binding: SuggestionBinding | undefined): void {
  if (binding) {
    SUGGESTION_BINDINGS[type] = binding;
  } else if (builtinBindings[type]) {
    SUGGESTION_BINDINGS[type] = builtinBindings[type];
  } else {
    delete SUGGESTION_BINDINGS[type];
  }
  invalidateSuggestions(type);
}

export function getSuggestionBinding(type: string): SuggestionBinding | undefined {
  return SUGGESTION_BINDINGS[type];
}

interface CacheEntry {
  items: SuggestionItem[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function loadSuggestions(type: string): Promise<SuggestionItem[]> {
  const binding = getSuggestionBinding(type);
  if (!binding) return [];

  const now = Date.now();
  const cached = cache.get(type);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  try {
    const items = await binding.load();
    const ttlMs = typeof binding.cache === 'object' ? binding.cache.ttlMs : Number.POSITIVE_INFINITY;
    cache.set(type, { items, expiresAt: now + ttlMs });
    return items;
  } catch {
    return cached ? cached.items : [];
  }
}

export function invalidateSuggestions(type?: string): void {
  if (type) {
    cache.delete(type);
  } else {
    cache.clear();
  }
}
