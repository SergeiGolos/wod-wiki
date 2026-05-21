/**
 * EffortsPage — /efforts
 *
 * Lists all bundled and user-defined efforts from the EffortRegistry.
 * Each effort links to its detail page at /effort/:slug.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DumbbellIcon, ChevronRightIcon } from 'lucide-react';
import { EffortRegistry, InMemoryEffortStore } from '@/services/effort-registry';
import { BUNDLED_EFFORTS } from '@/services/effort-registry';
import type { EffortRecord } from '@/services/effort-registry';
import { effortDetailPath } from '../lib/routes';

function EffortRow({ effort }: { effort: EffortRecord }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(effortDetailPath(effort.slug))}
      className="w-full flex items-center gap-4 px-6 py-4 text-left group"
      data-testid={`effort-row-${effort.slug}`}
    >
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <DumbbellIcon className="size-4 text-metric-effort" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {effort.label}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1">
          <p className="text-xs text-muted-foreground font-medium">
            {effort.discipline}
          </p>
          {effort.modality && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {effort.modality}
            </span>
          )}
          {effort.intensityTier && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              data-testid={`effort-intensity-${effort.slug}`}
              style={{
                backgroundColor:
                  effort.intensityTier === 'recovery'
                    ? 'hsl(200 30% 85%)'
                    : effort.intensityTier === 'easy'
                      ? 'hsl(150 40% 85%)'
                      : effort.intensityTier === 'moderate'
                        ? 'hsl(45 60% 85%)'
                        : effort.intensityTier === 'hard'
                          ? 'hsl(15 70% 85%)'
                          : 'hsl(0 70% 85%)',
                color:
                  effort.intensityTier === 'recovery'
                    ? 'hsl(200 40% 30%)'
                    : effort.intensityTier === 'easy'
                      ? 'hsl(150 50% 25%)'
                      : effort.intensityTier === 'moderate'
                        ? 'hsl(45 80% 25%)'
                        : effort.intensityTier === 'hard'
                          ? 'hsl(15 80% 30%)'
                          : 'hsl(0 80% 30%)',
              }}
            >
              {effort.intensityTier}
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function EffortsPage() {
  const [efforts, setEfforts] = useState<EffortRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const registry = useMemo(() => {
    const store = new InMemoryEffortStore({
      bundled: BUNDLED_EFFORTS,
      user: [],
    });
    return new EffortRegistry(store);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      await registry.load();
      if (!cancelled) {
        setEfforts([...registry.list()]);
      }
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [registry]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground" data-testid="efforts-loading">
        Loading efforts…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="efforts-page">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">Efforts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {efforts.length} exercise{efforts.length !== 1 ? 's' : ''} in the registry
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {efforts.map((effort) => (
            <EffortRow key={effort.slug} effort={effort} />
          ))}
        </div>
        {efforts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 text-sm text-muted-foreground" data-testid="efforts-empty">
            No efforts found.
          </div>
        )}
      </div>
    </div>
  );
}
