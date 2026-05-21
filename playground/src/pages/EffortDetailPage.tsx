/**
 * EffortDetailPage — /effort/:slug
 *
 * Shows effort documents inside the standard note-page shell.
 * Bundled efforts are read-only until cloned. User efforts are editable.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from '@heroicons/react/20/solid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteEditor } from '@/components/Editor/NoteEditor';
import { useTheme } from '@/components/theme/ThemeProvider';
import { JournalPageShell } from '@/panels/page-shells';
import { effortToDocument, documentToEffort } from '../components/efforts/effortYaml';
import { useEffortRegistry } from '../components/efforts/EffortRegistryContext';
import type { IEffort } from '@/effort-registry';
import { effortsPath, effortPath } from '../lib/routes';
import { toast } from '@/hooks/use-toast';
import { TEST_IDS } from '@/testing/contracts/TestIdContract';

function OriginBadge({ source }: { source: IEffort['registrySource'] }) {
  switch (source) {
    case 'bundled':
      return <Badge variant="secondary">Bundled</Badge>;
    case 'user':
      return <Badge variant="default">Custom</Badge>;
    case 'synthetic-unresolved':
      return <Badge variant="outline">Estimated</Badge>;
    default:
      return null;
  }
}

export function EffortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const { registry, isReady, refresh } = useEffortRegistry();
  const [isEditing, setIsEditing] = useState(modeParam === 'create');
  const [cloneBase, setCloneBase] = useState<IEffort | null>(null);
  const { theme } = useTheme();
  const actualTheme = theme === 'dark' ? 'dark' : 'vs';

  const effort = useMemo(() => {
    if (!slug || !isReady || slug === 'new') return null;
    return registry.resolve(slug);
  }, [slug, isReady, registry]);

  const draftEffort = useMemo((): IEffort => {
    if (modeParam === 'create' && slug === 'new') {
      return {
        id: `effort-user-${uuidv4()}`,
        slug: '',
        label: '',
        aliases: [],
        baseAttributes: { met: 5.0 },
        registrySource: 'user',
      };
    }

    if (cloneBase) {
      return {
        ...cloneBase,
        id: `effort-user-${uuidv4()}`,
        slug: `${cloneBase.slug}-custom`,
        label: `${cloneBase.label} (Custom)`,
        registrySource: 'user',
        derivation: {
          parentSlug: cloneBase.slug,
          coefficients: {},
          hardOverrides: {},
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return effort ?? {
      id: `effort-user-${uuidv4()}`,
      slug: '',
      label: '',
      aliases: [],
      baseAttributes: { met: 5.0 },
      registrySource: 'user',
    };
  }, [modeParam, slug, cloneBase, effort]);

  const [document, setDocument] = useState(() => (draftEffort ? effortToDocument(draftEffort) : ''));
  const lastDraftEffortIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isEditing && draftEffort) {
      const draftId = draftEffort.id;
      if (lastDraftEffortIdRef.current !== draftId) {
        lastDraftEffortIdRef.current = draftId;
        setDocument(effortToDocument(draftEffort));
      }
    }

    if (!isEditing) {
      lastDraftEffortIdRef.current = null;
    }
  }, [isEditing, draftEffort]);

  const handleSave = useCallback(
    async (updated: IEffort) => {
      try {
        await registry.upsert(updated);
        toast({ title: 'Saved', description: `"${updated.label}" has been saved.` });
        setIsEditing(false);
        setCloneBase(null);
        await refresh();

        if (updated.slug !== slug) {
          navigate(effortPath(updated.slug), { replace: true });
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to save effort.',
          variant: 'destructive',
        });
      }
    },
    [registry, refresh, slug, navigate],
  );

  const handleSaveFromDocument = useCallback(async () => {
    const { effort: parsedEffort, errors } = documentToEffort(document, draftEffort);
    if (errors.length > 0) {
      toast({
        title: 'Invalid YAML',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    parsedEffort.slug = parsedEffort.slug.trim().toLowerCase().replace(/\s+/g, '-');
    parsedEffort.label = parsedEffort.label.trim();
    parsedEffort.updatedAt = new Date().toISOString();
    await handleSave(parsedEffort);
  }, [document, draftEffort, handleSave]);

  const handleDelete = useCallback(async () => {
    if (!slug || slug === 'new') return;

    try {
      await registry.delete(slug);
      toast({ title: 'Deleted', description: 'The custom effort has been removed.' });
      await refresh();
      navigate(effortsPath());
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete effort.',
        variant: 'destructive',
      });
    }
  }, [registry, refresh, slug, navigate]);

  const handleClone = useCallback(() => {
    if (!effort) return;
    setCloneBase(effort);
    setIsEditing(true);
    toast({
      title: 'Cloned',
      description: `Created a custom copy of "${effort.label}". Edit and save to finalize.`,
    });
  }, [effort]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setCloneBase(null);
    if (slug === 'new') {
      navigate(effortsPath());
    }
  }, [slug, navigate]);

  const effectiveEffort = cloneBase || effort;
  const pageTitle = isEditing
    ? draftEffort.label || 'New Custom Effort'
    : effectiveEffort?.label ?? 'New Custom Effort';
  const badgeSource = isEditing
    ? draftEffort.registrySource
    : effectiveEffort?.registrySource;
  const isUser = effectiveEffort?.registrySource === 'user';
  const isNew = slug === 'new';
  const previewDocument = useMemo(
    () => (effectiveEffort ? effortToDocument(effectiveEffort) : ''),
    [effectiveEffort],
  );

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!effort && slug !== 'new') {
    return (
      <div data-testid={TEST_IDS.EFFORT_NOT_FOUND} className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Effort "{slug}" not found.</p>
        <Button variant="outline" onClick={() => navigate(effortsPath())}>
          Back to efforts
        </Button>
      </div>
    );
  }

  return (
    <div data-testid={TEST_IDS.EFFORT_DETAIL_ROOT} className="flex flex-col h-full">
      <span data-testid={TEST_IDS.EFFORT_DETAIL_LABEL} className="sr-only">
        {pageTitle}
      </span>

      <JournalPageShell
        title={pageTitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(effortsPath())}>
              <ArrowLeftIcon className="size-4 mr-1.5" />
              All efforts
            </Button>

            {badgeSource && (
              <span data-testid={TEST_IDS.EFFORT_DETAIL_SOURCE}>
                <OriginBadge source={badgeSource} />
              </span>
            )}

            {!isEditing && effectiveEffort && (
              <>
                {(isUser || effectiveEffort.registrySource === 'bundled') && (
                  <Button data-testid={TEST_IDS.EFFORT_DETAIL_CLONE_BTN} variant="outline" size="sm" onClick={handleClone}>
                    <DocumentDuplicateIcon className="size-4 mr-1.5" />
                    Clone
                  </Button>
                )}
                {isUser && (
                  <Button data-testid={TEST_IDS.EFFORT_DETAIL_EDIT_BTN} variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <PencilIcon className="size-4 mr-1.5" />
                    Edit
                  </Button>
                )}
              </>
            )}

            {isEditing && (
              <>
                <Button data-testid={TEST_IDS.EFFORT_DETAIL_SAVE_BTN} size="sm" onClick={handleSaveFromDocument} disabled={!document.trim()}>
                  Save
                </Button>
                <Button data-testid={TEST_IDS.EFFORT_DETAIL_CANCEL_BTN} variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                {isUser && !isNew && (
                  <Button data-testid={TEST_IDS.EFFORT_DETAIL_DELETE_BTN} variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        }
        editor={
          <div data-testid={TEST_IDS.EFFORT_DETAIL_NOTEBOOK_EDITOR} className="px-6 py-6 md:px-10 md:py-8">
            <NoteEditor
              noteId={isEditing ? `effort/${draftEffort.slug || 'draft'}` : effectiveEffort ? `effort/${effectiveEffort.slug}` : 'effort/new'}
              value={isEditing ? document : previewDocument}
              onChange={isEditing ? setDocument : () => {}}
              readonly={!isEditing}
              theme={actualTheme}
              showLineNumbers={true}
              enableLinting={isEditing ? false : true}
              mode="edit"
              className="min-h-[320px]"
            />
          </div>
        }
      />
    </div>
  );
}
