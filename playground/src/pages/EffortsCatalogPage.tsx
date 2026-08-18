/**
 * EffortsCatalogPage — /efforts
 *
 * Catalog of all registered efforts (bundled + user-created) behind the same
 * search interface as the Library: the standard `StickyPageHeader` with a
 * `WqlComposer` in the subheader slot. The composer compiles
 * `find:effort{…} in all` and the query runs through the WQL engine's
 * effort plane (`QueryService.runFindEffort`) — text/discipline/intensity/
 * origin/effort filters are engine-applied, so the page holds no filter
 * logic of its own. The `source` head is fixed at `efforts` and hidden from
 * the pill row (the page IS the efforts scope — no radio per decision).
 *
 * URL state round-trips through `useEffortsComposerState` (shared
 * `useComposerQueryState` core): back/forward restores the composer, and the
 * page's legacy `?q=text&origin=&discipline=` params migrate to clauses.
 *
 * Selecting a row navigates to the effort detail page.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { Badge } from '@/components/atoms/primitives/badge';
import { queryService } from "@/services/queryService";
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-engine';;
import {
  WqlComposer,
  clausesToWql,
  type WqlExecutor,
} from '@bitcobblers/wod-wiki-ui';
import { StickyPageHeader } from '@/panels/page-shells';
import type { IEffort } from '@/effort-registry';
import { effortPath } from '../lib/routes';
import { useEffortsComposerState } from '../hooks/useEffortsComposerState';
import { Flame, Activity, Dumbbell } from 'lucide-react';
import { TEST_IDS } from '@/testing/contracts/TestIdContract';

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
    <div data-testid={`effort-row-${slug}`} className="w-full flex items-center gap-4 px-6 py-4 text-left group">
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

export interface EffortsCatalogPageProps {
  /**
   * Header action bar, injected by the composition root (App.tsx) as a
   * fully-wired `PageActions`. Optional so the page stays renderable in
   * isolation (tests, stories) without app-wide context providers.
   */
  actions?: ReactNode;
}

export function EffortsCatalogPage({ actions }: EffortsCatalogPageProps) {
  const navigate = useNavigate();
  const { clauses, setClauses, urlQueryError } = useEffortsComposerState();
  const [efforts, setEfforts] = useState<IEffort[]>([]);
  const [loading, setLoading] = useState(false);

  const wql = useMemo(() => clausesToWql(clauses), [clauses]);
  const parsed = useMemo(() => parseQuery(wql), [wql]);
  const composedError = !isFindQuery(parsed) || parsed.error ? (parsed.error ?? 'Not a find query') : null;
  const queryError = urlQueryError ?? composedError;

  // Live stage counts in the composer's diagnostics strip, same executor
  // dispatch as the Library.
  const execute = useCallback<WqlExecutor>(
    ast => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  );

  useEffect(() => {
    if (composedError || !isFindQuery(parsed)) return;
    let cancelled = false;
    setLoading(true);

    queryService
      .runFind(parsed as ParsedFindQuery)
      .then(result => {
        if (!cancelled) setEfforts(result.efforts ?? []);
      })
      .catch(() => {
        if (!cancelled) setEfforts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parsed, composedError]);

  const handleCreateCustom = useCallback(() => {
    navigate('/effort/new?mode=create');
  }, [navigate]);

  return (
    <div data-testid={TEST_IDS.EFFORTS_CATALOG_ROOT} className="bg-card flex flex-col flex-1">
      <StickyPageHeader
        title="Efforts"
        subtitle="Catalog of registered efforts — bundled + custom"
        actions={
          <div className="flex items-center gap-3">
            <Button data-testid={TEST_IDS.EFFORTS_CATALOG_CREATE_BTN} onClick={handleCreateCustom}>
              <PlusIcon className="size-4 mr-2" />
              Create Custom
            </Button>
            {actions}
          </div>
        }
        subheader={
          <div className="px-6 py-2.5">
            <WqlComposer
              clauses={clauses}
              onClausesChange={setClauses}
              execute={execute}
              hiddenClauseTypes={['source']}
            />
          </div>
        }
      />

      {queryError && (
        <div
          className="mx-6 mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2"
          data-testid="efforts-query-error"
        >
          <TriangleAlertIcon className="size-3.5 mt-0.5 text-red-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-red-600">
              {urlQueryError ? 'Invalid URL query — showing the default query instead.' : 'Invalid WQL — fix the highlighted clause.'}
            </span>{' '}
            <code className="font-mono text-red-600/90">{queryError}</code>
          </div>
        </div>
      )}

      {loading && efforts.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">Loading…</div>
      )}

      {!loading && !queryError && efforts.length === 0 && (
        <div
          className="px-6 py-12 text-center text-sm text-muted-foreground/50"
          data-testid={TEST_IDS.EFFORTS_CATALOG_EMPTY_STATE}
        >
          No efforts match this query.
        </div>
      )}

      <div className="flex flex-col divide-y divide-border/50">
        {efforts.map(effort => (
          <button
            key={effort.slug}
            type="button"
            onClick={() => navigate(effortPath(effort.slug))}
            className="text-left hover:bg-muted/40 transition-colors"
          >
            <EffortRow effort={effort} />
          </button>
        ))}
      </div>
    </div>
  );
}
