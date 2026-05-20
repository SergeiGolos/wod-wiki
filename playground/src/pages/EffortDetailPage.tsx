/**
 * EffortDetailPage — /effort/:slug
 *
 * Shows effort attributes. Bundled efforts are read-only.
 * User efforts are editable. Any effort can be cloned to create a custom variant.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from '@heroicons/react/20/solid';
import { Dumbbell, Flame, Activity, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EffortEditorForm } from '../components/efforts/EffortEditorForm';
import { useEffortRegistry } from '../components/efforts/EffortRegistryContext';
import { EffortResolver } from '@/effort-registry';
import type { IEffort } from '@/effort-registry';
import { effortsPath, effortPath } from '../lib/routes';
import { toast } from '@/hooks/use-toast';

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

function IntensityBadge({ tier }: { tier?: string }) {
  switch (tier) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
          <Flame className="size-3" />
          High
        </span>
      );
    case 'moderate':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
          <Activity className="size-3" />
          Moderate
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
          <Activity className="size-3" />
          Low
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          <Dumbbell className="size-3" />
          Unspecified
        </span>
      );
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

  const effort = useMemo(() => {
    if (!slug || !isReady) return null;
    if (slug === 'new') return null;
    return registry.resolve(slug);
  }, [slug, isReady, registry]);

  const resolver = useMemo(() => new EffortResolver(registry), [registry]);

  // If ?mode=create and no slug, start with a blank template
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
      const cloned: IEffort = {
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
      return cloned;
    }
    return effort!;
  }, [modeParam, slug, cloneBase, effort]);

  const handleSave = useCallback(
    async (updated: IEffort) => {
      try {
        await registry.upsert(updated);
        toast({ title: 'Saved', description: `"${updated.label}" has been saved.` });
        setIsEditing(false);
        setCloneBase(null);
        await refresh();
        // Navigate to the canonical slug if it changed
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

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!effort && slug !== 'new') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Effort "{slug}" not found.</p>
        <Button variant="outline" onClick={() => navigate(effortsPath())}>
          Back to Catalog
        </Button>
      </div>
    );
  }

  const effectiveEffort = cloneBase || effort;
  const isUser = effectiveEffort?.registrySource === 'user';
  const isNew = slug === 'new';

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-6 lg:px-10 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(effortsPath())}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">
            {effectiveEffort?.label ?? 'New Custom Effort'}
          </h1>
        </div>
        {!isEditing && effectiveEffort && (
          <div className="flex items-center gap-2">
            <OriginBadge source={effectiveEffort.registrySource} />
            {(isUser || effectiveEffort.registrySource === 'bundled') && (
              <Button variant="outline" size="sm" onClick={handleClone}>
                <DocumentDuplicateIcon className="size-4 mr-1.5" />
                Clone
              </Button>
            )}
            {isUser && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <PencilIcon className="size-4 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 lg:px-10 py-6">
        {isEditing ? (
          <div className="max-w-2xl">
            <EffortEditorForm
              effort={draftEffort}
              onSave={handleSave}
              onDelete={isUser && !isNew ? handleDelete : undefined}
              onCancel={handleCancel}
            />
          </div>
        ) : effectiveEffort ? (
          <div className="max-w-2xl space-y-6">
            {/* Attributes card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">MET</p>
                    <p className="text-2xl font-bold">{effectiveEffort.baseAttributes.met.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Intensity</p>
                    <div className="mt-1">
                      <IntensityBadge tier={effectiveEffort.baseAttributes.intensityTier} />
                    </div>
                  </div>
                </div>
                {effectiveEffort.baseAttributes.discipline && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Discipline</p>
                    <p className="text-sm font-medium capitalize">{effectiveEffort.baseAttributes.discipline}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aliases card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="size-4" />
                  Aliases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {effectiveEffort.aliases.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {effectiveEffort.aliases.map(alias => (
                      <Badge key={alias} variant="secondary">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No aliases defined.</p>
                )}
              </CardContent>
            </Card>

            {/* Derivation card */}
            {effectiveEffort.derivation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Derivation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {effectiveEffort.derivation.parentSlug && (
                    <p className="text-sm">
                      Parent:{' '}
                      <button
                        onClick={() => navigate(effortPath(effectiveEffort.derivation!.parentSlug!))}
                        className="font-mono text-primary hover:underline"
                      >
                        {effectiveEffort.derivation.parentSlug}
                      </button>
                    </p>
                  )}
                  {effectiveEffort.derivation.coefficients &&
                    Object.keys(effectiveEffort.derivation.coefficients).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Coefficients</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(effectiveEffort.derivation.coefficients).map(([key, val]) => (
                            <Badge key={key} variant="outline">
                              {key}: {val}×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {effectiveEffort.derivation.hardOverrides &&
                    Object.keys(effectiveEffort.derivation.hardOverrides).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Hard Overrides</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                          {JSON.stringify(effectiveEffort.derivation.hardOverrides, null, 2)}
                        </pre>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-mono">ID:</span> {effectiveEffort.id}
              </p>
              <p>
                <span className="font-mono">Slug:</span> {effectiveEffort.slug}
              </p>
              {effectiveEffort.createdAt && (
                <p>Created: {new Date(effectiveEffort.createdAt).toLocaleString()}</p>
              )}
              {effectiveEffort.updatedAt && (
                <p>Updated: {new Date(effectiveEffort.updatedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
