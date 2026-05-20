/**
 * EffortsCatalogPage — /efforts
 *
 * Catalog of all registered efforts (bundled + user-created).
 * Uses CollectionListTemplate for consistent list layout with keyboard navigation.
 * Supports search by label/alias/slug and filter by origin and discipline.
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, FunnelIcon } from '@heroicons/react/20/solid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffortRegistry } from '../components/efforts/EffortRegistryContext';
import { useEffortsQueryState } from '../hooks/useEffortsQueryState';
import type { IEffort, EffortRegistrySource } from '@/effort-registry';
import { effortPath } from '../lib/routes';
import { CollectionListTemplate, type CollectionListTemplateContext } from '../templates/CollectionListTemplate';
import { TextFilterStrip } from '../views/queriable-list/TextFilterStrip';
import { Flame, Activity, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORIGIN_OPTIONS: { value: EffortRegistrySource | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bundled', label: 'Bundled' },
  { value: 'user', label: 'Custom' },
];

function OriginBadge({ source }: { source: IEffort['registrySource'] }) {
  switch (source) {
    case 'bundled':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Bundled
        </Badge>
      );
    case 'user':
      return (
        <Badge variant="default" className="text-[10px]">
          Custom
        </Badge>
      );
    case 'synthetic-unresolved':
      return (
        <Badge variant="outline" className="text-[10px]">
          Estimated
        </Badge>
      );
    default:
      return null;
  }
}

function IntensityIcon({ tier }: { tier?: string }) {
  switch (tier) {
    case 'high':
      return <Flame className="size-3.5 text-orange-500" />;
    case 'moderate':
      return <Activity className="size-3.5 text-yellow-500" />;
    case 'low':
      return <Activity className="size-3.5 text-green-500" />;
    default:
      return <Dumbbell className="size-3.5 text-muted-foreground" />;
  }
}

function EffortRow({ effort }: { effort: IEffort }) {
  const { label, slug, baseAttributes, registrySource } = effort;
  const { met, discipline, intensityTier } = baseAttributes;

  return (
    <div className="w-full flex items-center gap-4 px-6 py-4 text-left group">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {label}
          </h3>
          <p className="text-xs text-muted-foreground font-mono flex-shrink-0">{slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {discipline && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {discipline}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <IntensityIcon tier={intensityTier} />
            MET {met.toFixed(1)}
          </span>
          {intensityTier && (
            <span className="text-[10px] font-medium capitalize text-muted-foreground">
              {intensityTier}
            </span>
          )}
        </div>
      </div>
      <OriginBadge source={registrySource} />
    </div>
  );
}

interface EffortsQuery {
  text: string;
  origin: EffortRegistrySource | 'all';
  discipline: string;
}

function EffortsFilterSlot({
  context,
}: {
  context: CollectionListTemplateContext<EffortsQuery, IEffort, IEffort>;
}) {
  const { origin, setOrigin, discipline, setDiscipline } = useEffortsQueryState();
  const disciplines = useMemo(() => {
    const set = new Set<string>();
    for (const effort of context.items) {
      if (effort.baseAttributes.discipline) set.add(effort.baseAttributes.discipline);
    }
    return Array.from(set).sort();
  }, [context.items]);

  return (
    <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-6 lg:px-10 py-3">
        <FunnelIcon className="size-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1">
          {ORIGIN_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setOrigin(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                origin === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {disciplines.length > 0 && (
          <select
            value={discipline}
            onChange={e => setDiscipline(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All disciplines</option>
            {disciplines.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function EffortsHeaderCanvas() {
  const navigate = useNavigate();

  const handleCreateCustom = useCallback(() => {
    navigate('/effort/new?mode=create');
  }, [navigate]);

  return (
    <div className="px-6 lg:px-10 py-6 border-b">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Efforts</h1>
          <p className="text-sm text-muted-foreground">
            Catalog of all registered efforts (bundled + custom)
          </p>
        </div>
        <Button onClick={handleCreateCustom}>
          <PlusIcon className="size-4 mr-2" />
          Create Custom
        </Button>
      </div>
    </div>
  );
}

export function EffortsCatalogPage() {
  const navigate = useNavigate();
  const { isReady, error, refresh, registry } = useEffortRegistry();
  const { text, origin, discipline } = useEffortsQueryState();

  const query = useMemo(
    () => ({ text, origin, discipline }),
    [text, origin, discipline],
  );

  const loadEfforts = useCallback(
    (currentQuery: EffortsQuery) => {
      if (!isReady) return [];

      let efforts = registry.list();

      if (currentQuery.origin && currentQuery.origin !== 'all') {
        efforts = efforts.filter(e => e.registrySource === currentQuery.origin);
      }

      if (currentQuery.discipline) {
        efforts = efforts.filter(e => e.baseAttributes.discipline === currentQuery.discipline);
      }

      if (currentQuery.text?.trim()) {
        const q = currentQuery.text.trim().toLowerCase();
        efforts = efforts.filter(e =>
          e.label.toLowerCase().includes(q) ||
          e.aliases.some(a => a.toLowerCase().includes(q)) ||
          e.slug.toLowerCase().includes(q)
        );
      }

      return efforts;
    },
    [isReady, registry],
  );

  const handleSelectEffort = useCallback(
    (effort: IEffort) => {
      navigate(effortPath(effort.slug));
    },
    [navigate],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center h-full">
        <p className="text-destructive font-medium">Failed to load effort registry.</p>
        <Button variant="outline" onClick={() => refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <CollectionListTemplate
      query={query}
      loadRecords={loadEfforts}
      mapRecordToItem={effort => effort}
      getItemKey={effort => effort.slug}
      prependedCanvas={<EffortsHeaderCanvas />}
      searchSlot={<TextFilterStrip paramName="q" placeholder="Search by name, alias, or slug…" navigationScope="q" />}
      filterSlot={context => <EffortsFilterSlot context={context} />}
      renderPrimaryContent={effort => <EffortRow effort={effort} />}
      getItemActions={effort => [
        {
          id: 'open',
          label: 'Open',
          onSelect: handleSelectEffort,
        },
      ]}
      loadingState={
        <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground">
          Loading efforts…
        </div>
      }
      emptyState={<div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <p className="text-sm font-medium">No efforts match your filters.</p>
      </div>}
    />
  );
}
