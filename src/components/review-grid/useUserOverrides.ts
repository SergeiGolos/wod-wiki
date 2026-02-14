/**
 * useUserOverrides — CRUD hook for user-supplied fragment overrides.
 *
 * Wraps the Zustand store actions (`setUserOverride`, `clearUserOverride`)
 * with convenience helpers for adding, updating, and removing individual
 * user fragments keyed by `sourceBlockKey`.
 *
 * Optionally persists overrides to localStorage for session survival.
 */

import { useCallback, useEffect } from 'react';
import { FragmentType, type ICodeFragment } from '@/core/models/CodeFragment';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';

const STORAGE_KEY = 'wod-wiki:userOutputOverrides';

// ─── Public Interface ──────────────────────────────────────────

export interface UseUserOverridesReturn {
  /** Current override map (from store) */
  overrides: Map<string, ICodeFragment[]>;

  /** Add or replace a single user fragment for a block+fragmentType */
  setOverride: (blockKey: string, fragmentType: FragmentType, value: unknown, image?: string) => void;

  /** Remove a specific fragment type override for a block */
  removeOverride: (blockKey: string, fragmentType: FragmentType) => void;

  /** Clear all overrides for a block */
  clearBlock: (blockKey: string) => void;

  /** Clear all user overrides */
  clearAll: () => void;
}

export function useUserOverrides(persistToStorage = false): UseUserOverridesReturn {
  const overrides = useWorkbenchSyncStore((s) => s.userOutputOverrides);
  const storeSet = useWorkbenchSyncStore((s) => s.setUserOverride);
  const storeClear = useWorkbenchSyncStore((s) => s.clearUserOverride);

  // ── Restore from localStorage on mount ────────────────────

  useEffect(() => {
    if (!persistToStorage) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, SerializedFragment[]>;
      for (const [blockKey, frags] of Object.entries(parsed)) {
        storeSet(blockKey, frags.map(deserializeFragment));
      }
    } catch {
      // Silently ignore corrupt storage
    }
  }, [persistToStorage, storeSet]);

  // ── Persist to localStorage on change ─────────────────────

  useEffect(() => {
    if (!persistToStorage) return;
    if (overrides.size === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const serializable: Record<string, SerializedFragment[]> = {};
    for (const [key, frags] of overrides) {
      serializable[key] = frags.map(serializeFragment);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [overrides, persistToStorage]);

  // ── Actions ───────────────────────────────────────────────

  const setOverride = useCallback(
    (blockKey: string, fragmentType: FragmentType, value: unknown, image?: string) => {
      const existing = overrides.get(blockKey) ?? [];

      // Replace any existing fragment of the same type, keep others
      const filtered = existing.filter((f) => f.fragmentType !== fragmentType);

      const newFragment: ICodeFragment = {
        type: fragmentType,
        fragmentType,
        value,
        image: image ?? (value !== undefined ? String(value) : undefined),
        origin: 'user',
        sourceBlockKey: blockKey,
        timestamp: new Date(),
      };

      storeSet(blockKey, [...filtered, newFragment]);
    },
    [overrides, storeSet],
  );

  const removeOverride = useCallback(
    (blockKey: string, fragmentType: FragmentType) => {
      const existing = overrides.get(blockKey);
      if (!existing) return;

      const filtered = existing.filter((f) => f.fragmentType !== fragmentType);
      if (filtered.length === 0) {
        storeClear(blockKey);
      } else {
        storeSet(blockKey, filtered);
      }
    },
    [overrides, storeSet, storeClear],
  );

  const clearBlock = useCallback(
    (blockKey: string) => {
      storeClear(blockKey);
    },
    [storeClear],
  );

  const clearAll = useCallback(() => {
    // Clear each block key individually
    for (const key of overrides.keys()) {
      storeClear(key);
    }
  }, [overrides, storeClear]);

  return { overrides, setOverride, removeOverride, clearBlock, clearAll };
}

// ─── Serialization helpers (for localStorage) ─────────────────

interface SerializedFragment {
  type: string;
  fragmentType: FragmentType;
  value?: unknown;
  image?: string;
  origin?: string;
  sourceBlockKey?: string;
  timestamp?: string;
}

function serializeFragment(f: ICodeFragment): SerializedFragment {
  return {
    type: f.type,
    fragmentType: f.fragmentType,
    value: f.value,
    image: f.image,
    origin: f.origin,
    sourceBlockKey: f.sourceBlockKey,
    timestamp: f.timestamp?.toISOString(),
  };
}

function deserializeFragment(s: SerializedFragment): ICodeFragment {
  return {
    type: s.type,
    fragmentType: s.fragmentType,
    value: s.value,
    image: s.image,
    origin: (s.origin as ICodeFragment['origin']) ?? 'user',
    sourceBlockKey: s.sourceBlockKey,
    timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
  };
}
