import { formatPlaygroundTimestampLabel } from '@/lib/playgroundDisplay';
import { getWodContent } from '@/repositories/wod-loader';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';

export function createTemplateEntry(id: string, content: string): HistoryEntry {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : id;
  const now = Date.now();

  return {
    id,
    title,
    rawContent: content,
    type: 'template',
    tags: [],
    createdAt: now,
    updatedAt: now,
    targetDate: now,
    schemaVersion: 1,
  };
}

export async function loadWorkbenchDisplayEntry(
  routeId: string,
  provider: Pick<IContentProvider, 'mode' | 'getEntry'>,
): Promise<HistoryEntry | null> {
  if (provider.mode === 'history') {
    try {
      const entry = await provider.getEntry(routeId);
      if (entry) {
        return entry;
      }
    } catch (error) {
      console.warn('[WorkbenchEntryLoader] Failed to load entry from provider', error);
    }
  }

  const fallbackContent = getWodContent(routeId);
  return fallbackContent ? createTemplateEntry(routeId, fallbackContent) : null;
}

export function getWorkbenchDocumentTitle(
  currentEntry: HistoryEntry | null,
  routeId?: string,
): string {
  if (currentEntry?.title) {
    return `Wod.Wiki - ${currentEntry.title}`;
  }

  if (currentEntry?.type === 'playground') {
    return `Wod.Wiki - ${formatPlaygroundTimestampLabel(currentEntry.createdAt)}`;
  }

  if (routeId) {
    return 'Wod.Wiki - Untitled note';
  }

  return 'Wod.Wiki';
}
