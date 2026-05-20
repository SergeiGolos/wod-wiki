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
import { Dumbbell, Flame, Activity, Tag, Eye, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NoteEditor } from '@/components/Editor/NoteEditor';
import { useTheme } from '@/components/theme/ThemeProvider';
import { effortToDocument, documentToEffort } from '../components/efforts/effortYaml';
import { useEffortRegistry } from '../components/efforts/EffortRegistryContext';
import { EffortResolver } from '@/effort-registry';
import type { IEffort, ResolvedEffort } from '@/effort-registry';
import { effortsPath, effortPath, parseEffortRouteModifiers, parseEffortRouteOptions } from '../lib/routes';
import { toast } from '@/hooks/use-toast';

function EffortResolvedView({
  resolved,
  effort,
  navigate,
}: {
  resolved: ResolvedEffort;
  effort: IEffort;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Effective values card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Effective Resolution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Effective MET</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold">{resolved.met.toFixed(1)}</p>
                {Math.abs(resolved.met - (effort.baseAttributes.met || 0)) > 0.01 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    (base: {effort.baseAttributes.met.toFixed(1)})
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Discipline Factor</p>
              <p className="text-2xl font-bold mt-1">{resolved.disciplineFactor.toFixed(2)}×</p>
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Resolved From</p>
            <div className="flex gap-2 items-center">
              <Badge variant={resolved.resolvedFrom === 'user' ? 'default' : 'secondary'}>
                {resolved.resolvedFrom}
              </Badge>
              {resolved.isEstimated && <Badge variant="outline">Estimated</Badge>}
            </div>
          </div>
          {resolved.discipline && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Discipline</p>
              <p className="text-sm font-medium capitalize">{resolved.discipline}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applied modifiers card */}
      {Object.keys(resolved.modifiers).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applied Modifiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(resolved.modifiers).map(([key, value]) => (
                <div key={`${key}-${value}`} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-muted-foreground">{key}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent chain card */}
      {resolved.definition.derivation?.parentSlug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parent Chain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button
                onClick={() => navigate(effortPath(resolved.definition.derivation!.parentSlug!))}
                className="text-sm text-primary hover:underline font-mono"
              >
                {resolved.definition.derivation.parentSlug}
              </button>
              {resolved.definition.derivation.coefficients &&
                Object.keys(resolved.definition.derivation.coefficients).length > 0 && (
                  <div className="pl-4 border-l-2 border-muted space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Coefficients</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(resolved.definition.derivation.coefficients).map(([key, val]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {val}×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              {resolved.definition.derivation.hardOverrides &&
                Object.keys(resolved.definition.derivation.hardOverrides).length > 0 && (
                  <div className="pl-4 border-l-2 border-muted space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Hard Overrides</p>
                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-w-xs">
                      {JSON.stringify(resolved.definition.derivation.hardOverrides, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pb-4">
        <p>Effort: {resolved.slug}</p>
        <p>Modifiers: {Object.keys(resolved.modifiers).length}</p>
      </div>

      {/* Analytics placeholder */}
      <AnalyticsPlaceholder />
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <Card className="hidden md:block border-dashed bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-4" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Workout metrics and trend visualizations will appear here once analytics
          integration is complete.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
            <TrendingUp className="size-3.5 shrink-0" />
            <span>Workout frequency over time</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
            <TrendingUp className="size-3.5 shrink-0" />
            <span>Average intensity trends</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
            <TrendingUp className="size-3.5 shrink-0" />
            <span>Volume / load progression</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const tabParam = searchParams.get('tab') ?? (searchParams.size > 0 ? 'resolved' : 'definition');
  const { registry, isReady, refresh } = useEffortRegistry();
  const [isEditing, setIsEditing] = useState(modeParam === 'create');
  const [cloneBase, setCloneBase] = useState<IEffort | null>(null);
  const [activeTab, setActiveTab] = useState<'definition' | 'resolved'>(tabParam as 'definition' | 'resolved');
  const { theme } = useTheme();
  const actualTheme = theme === 'dark' ? 'dark' : 'vs';

  const effort = useMemo(() => {
    if (!slug || !isReady) return null;
    if (slug === 'new') return null;
    return registry.resolve(slug);
  }, [slug, isReady, registry]);

  const resolver = useMemo(() => new EffortResolver(registry), [registry]);

  const modifiers = useMemo(() => parseEffortRouteModifiers(searchParams), [searchParams]);
  const routeOptions = useMemo(() => parseEffortRouteOptions(searchParams), [searchParams]);

  const resolved = useMemo((): ResolvedEffort | null => {
    if (!effort || !isReady) return null;
    return resolver.resolveEffort(effort.slug, { modifiers });
  }, [effort, isReady, resolver, modifiers]);

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

  const [document, setDocument] = useState(() => effortToDocument(draftEffort));

  // Sync document when draftEffort changes (entering edit mode, clone, etc.)
  useEffect(() => {
    if (isEditing) {
      setDocument(effortToDocument(draftEffort));
    }
  }, [isEditing, draftEffort]);

  const handleSaveFromDocument = useCallback(() => {
    const { effort, errors } = documentToEffort(document, draftEffort);
    if (errors.length > 0) {
      toast({
        title: 'Invalid YAML',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }
    // Normalize slug
    effort.slug = effort.slug.trim().toLowerCase().replace(/\s+/g, '-');
    effort.label = effort.label.trim();
    effort.updatedAt = new Date().toISOString();
    handleSave(effort);
  }, [document, draftEffort, handleSave]);

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

      {/* Tabs for resolved vs definition view */}
      {!isEditing && effectiveEffort && Object.keys(modifiers).length > 0 && (
        <div className="flex gap-1 px-6 lg:px-10 py-2 border-b bg-muted/50">
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition ${
              activeTab === 'resolved'
                ? 'bg-background border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="size-4" />
            Resolved
          </button>
          <button
            onClick={() => setActiveTab('definition')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition ${
              activeTab === 'definition'
                ? 'bg-background border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="size-4" />
            Definition
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 lg:px-10 py-6">
        {isEditing ? (
          <div className="max-w-2xl space-y-4">
            <NoteEditor
              value={document}
              onChange={setDocument}
              theme={actualTheme}
              showLineNumbers={true}
              enablePreview={false}
              enableLinting={false}
              mode="edit"
              className="border rounded-md min-h-[320px]"
            />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={handleSaveFromDocument} disabled={!document.trim()}>
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {isUser && !isNew && (
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ) : effectiveEffort && activeTab === 'resolved' && resolved ? (
          <EffortResolvedView resolved={resolved} effort={effectiveEffort} navigate={navigate} />
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

            {/* Notes / Description card */}
            {effectiveEffort.body && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap text-foreground">
                    {effectiveEffort.body}
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Analytics placeholder */}
            <AnalyticsPlaceholder />
          </div>
        ) : null}
      </div>
    </div>
  );
}
