/**
 * useCollectionsQueryState — nuqs-backed URL state for the Collections page.
 *
 * Manages two URL parameters:
 *   `q`          — text search query (default: '')
 *   `categories` — active category slugs (comma-separated, default: '')
 *
 * Both the CollectionsNavPanel (writer) and CollectionsPage (reader) share
 * this hook so the URL is always the source of truth.
 */

import { useQueryState } from 'nuqs';
import { useMemo, useCallback } from 'react';

const CATEGORIES_SEPARATOR = ',';

function parseCategories(raw: string): string[] {
  if (!raw) return [];
  return raw.split(CATEGORIES_SEPARATOR).filter(Boolean);
}

function serializeCategories(cats: string[]): string {
  return cats.filter(Boolean).join(CATEGORIES_SEPARATOR);
}

export function useCollectionsQueryState() {
  // ── Text search ───────────────────────────────────────────────────────
  const [text, setText] = useQueryState('q', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  // ── Category filter ───────────────────────────────────────────────────
  const [categoriesParam, setCategoriesParam] = useQueryState('categories', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedCategories = useMemo(
    () => parseCategories(categoriesParam),
    [categoriesParam],
  );

  const setSelectedCategories = useCallback(
    (cats: string[]) => setCategoriesParam(serializeCategories(cats)),
    [setCategoriesParam],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      const next = selectedCategories.includes(slug)
        ? selectedCategories.filter(c => c !== slug)
        : [...selectedCategories, slug];
      setSelectedCategories(next);
    },
    [selectedCategories, setSelectedCategories],
  );

  const clearCategories = useCallback(
    () => setCategoriesParam(''),
    [setCategoriesParam],
  );

  return {
    text,
    setText,
    selectedCategories,
    setSelectedCategories,
    toggleCategory,
    clearCategories,
  };
}
