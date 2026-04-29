import { useCallback } from 'react';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { CollectionImportStrategy } from '@/components/command-palette/strategies/CollectionImportStrategy';
import { HistoryImportStrategy } from '@/components/command-palette/strategies/HistoryImportStrategy';
import type { WodBlockExtract } from '@/lib/wodBlockExtract';
import type { IContentProvider } from '@/types/content-provider';

interface UseCollectionImportOptions {
  onInsert: (blocks: WodBlockExtract[]) => void;
  provider?: IContentProvider;
}

/**
 * Hook that opens the command palette with collection or history import strategies.
 *
 * Returns:
 * - `openCollectionImport`: opens the 3-level collection → workout → block picker
 * - `openHistoryImport`: opens a 2-level history entry → block picker (requires provider)
 */
export function useCollectionImport({ onInsert, provider }: UseCollectionImportOptions) {
  const { setIsOpen, setStrategy } = useCommandPalette();

  const openCollectionImport = useCallback(() => {
    const strategy = new CollectionImportStrategy(onInsert, setStrategy);
    setStrategy(strategy);
    setIsOpen(true);
  }, [onInsert, setStrategy, setIsOpen]);

  const openHistoryImport = useCallback(async () => {
    if (!provider) return;
    const strategy = new HistoryImportStrategy(provider, onInsert, setStrategy);
    await strategy.init();
    setStrategy(strategy);
    setIsOpen(true);
  }, [provider, onInsert, setStrategy, setIsOpen]);

  return { openCollectionImport, openHistoryImport };
}
