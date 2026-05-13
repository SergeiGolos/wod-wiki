import { StaticContentProvider } from '@/hooks/useBrowserServices';
import { createNotePersistence, type INotePersistence } from '@/services/persistence';
import { getWodContent } from '@/repositories/wod-loader';
import type { ContentProviderMode, IContentProvider } from '@/types/content-provider';

export interface ResolvedWorkbenchProvider {
  readonly provider: IContentProvider;
  readonly notePersistence: INotePersistence;
  readonly mode: ContentProviderMode;
}

export function resolveWorkbenchProvider(
  initialContent: string,
  externalProvider?: IContentProvider,
): ResolvedWorkbenchProvider {
  const provider = externalProvider ?? new StaticContentProvider(initialContent);
  return {
    provider,
    notePersistence: createNotePersistence(provider),
    mode: provider.mode,
  };
}

export function loadStaticWorkbenchContent(routeId: string): string | null {
  return getWodContent(routeId) ?? null;
}
