import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wodwiki:showPlaygrounds';

export function useShowPlaygrounds(): [boolean, (value: boolean) => void] {
  const [showPlaygrounds, setShowPlaygroundsState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setShowPlaygroundsState(e.newValue ? JSON.parse(e.newValue) : false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setShowPlaygrounds = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setShowPlaygroundsState(value);
    // Sync across same-tab instances
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(value),
      }),
    );
  }, []);

  return [showPlaygrounds, setShowPlaygrounds];
}
