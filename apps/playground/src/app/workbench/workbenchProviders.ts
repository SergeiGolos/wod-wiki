import { StaticContentProvider } from '@/hooks/useBrowserServices';
import { createNotePersistence, type INotePersistence } from '@/services/persistence';
import { getScriptContent } from '@/repositories/script-loader';
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

export async function loadStaticWorkbenchContent(routeId: string): Promise<string | null> {
  return (await getScriptContent(routeId)) ?? null;
}
