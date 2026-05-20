/**
 * EffortsCatalogPage — /efforts
 *
 * Catalog of all registered efforts (bundled + user-created).
 * Supports search by label/alias/slug and filter by origin and discipline.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/20/solid';
import { Button } from '@/components/ui/button';
import { EffortCard } from '../components/efforts/EffortCard';
import { useEffortRegistry, useEffortCatalog } from '../components/efforts/EffortRegistryContext';
import type { EffortRegistrySource } from '@/effort-registry';
import { effortPath } from '../lib/routes';
import { cn } from '@/lib/utils';

const ORIGIN_OPTIONS: { value: EffortRegistrySource | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bundled', label: 'Bundled' },
  { value: 'user', label: 'Custom' },
];

export function EffortsCatalogPage() {
  const navigate = useNavigate();
  const { isReady, error, refresh } = useEffortRegistry();
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });
  const [originFilter, setOriginFilter] = useQueryState('origin', { defaultValue: 'all' });
  const [disciplineFilter, setDisciplineFilter] = useState('');

  const efforts = useEffortCatalog({
    origin: (originFilter as any) || 'all',
    discipline: disciplineFilter || undefined,
    query: query || undefined,
  });

  // Derive unique disciplines from visible efforts
  const disciplines = useMemo(() => {
    const set = new Set<string>();
    for (const e of efforts) {
      if (e.baseAttributes.discipline) set.add(e.baseAttributes.discipline);
    }
    return Array.from(set).sort();
  }, [efforts]);

  const handleCreateCustom = useCallback(() => {
    // Navigate to detail page with a synthetic slug that signals "new"
    navigate('/effort/new?mode=create');
  }, [navigate]);

  const handleSelectEffort = useCallback((slug: string) => {
    navigate(effortPath(slug));
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-destructive font-medium">Failed to load effort registry.</p>
        <Button variant="outline" onClick={() => refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 px-6 lg:px-10 py-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Efforts</h1>
            <p className="text-sm text-muted-foreground">
              {isReady ? `${efforts.length} effort${efforts.length !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
          <Button onClick={handleCreateCustom}>
            <PlusIcon className="size-4 mr-2" />
            Create Custom
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={query ?? ''}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, alias, or slug…"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="size-4 text-muted-foreground" />
            <div className="flex gap-1">
              {ORIGIN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOriginFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                    originFilter === opt.value
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
                value={disciplineFilter}
                onChange={e => setDisciplineFilter(e.target.value)}
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
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-6 lg:px-10 py-6">
        {isReady ? (
          efforts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {efforts.map(effort => (
                <EffortCard
                  key={effort.slug}
                  effort={effort}
                  onClick={() => handleSelectEffort(effort.slug)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <p className="text-muted-foreground text-sm">No efforts match your filters.</p>
              <Button variant="outline" onClick={() => { setQuery(''); setOriginFilter('all'); setDisciplineFilter(''); }}>
                Clear Filters
              </Button>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse h-4 w-32 bg-muted rounded"></div>
          </div>
        )}
      </div>
    </div>
  );
}
