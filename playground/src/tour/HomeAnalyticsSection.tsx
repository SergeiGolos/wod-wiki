/**
 * HomeAnalyticsSection.tsx — the home-page WQL-elements showcase (#938).
 *
 * Replaces the hero runway's single-workout session-review stages
 * (`analytics-scorecard` / `analytics-grid`) with a section that *lists the
 * elements of WQL*: a vocabulary reference strip plus three example
 * presentations (table list, graphs, multi-query dashboard), each led by the
 * parsed WQL chips — aggregate / metric / filter / group-by / rollup — not a
 * single result number.
 *
 * Slotted into the composition as a full-bleed section the hero runway
 * releases into (it is a content grid, not a pinned-window demo, so it does
 * not live inside the runway). One render across form factors: the tile grid
 * stacks on mobile and the section is static (no scroll animation), so it is
 * inherently reduced-motion safe.
 *
 * Data story: the tiles execute their WQL against the live IndexedDB store
 * (via `useHomeAnalyticsData`), mirroring `DashboardView`; when the store is
 * empty (Storybook, fresh journal) each widget falls back to the illustrative
 * sample so the showcase always teaches by example.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { queryService } from '@/services/queryService';
import { type ParsedQuery, type QueryResult } from '@bitcobblers/wod-wiki-engine';;
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlTable,
  TopList,
  StackedBar,
} from '@bitcobblers/wod-wiki-ui';
import { ParsedQueryChips } from '@/components/organisms/analytics';
import { WQL_AGGREGATORS, WQL_METRIC_AGGREGATES, WQL_METRIC_FAMILIES, WQL_TAG_KEYS, WQL_VIRTUAL_DIMS, WQL_INTENSITY_TIERS, WQL_ROLLUP_PERIODS } from '@bitcobblers/wod-wiki-engine';;
import {
  HOME_ANALYTICS_QUERIES,
  HOME_ANALYTICS_WEEKS,
  SAMPLE_HOME_ANALYTICS,
  hasPoints,
  type HomeAnalyticsData,
} from './homeAnalyticsData';

const WEEK_MS = 7 * 86_400_000;

/**
 * Live data for the showcase: run the showcase queries against the store and
 * fall back per-widget to the illustrative sample whenever the store has no
 * points for that query — or is unavailable (empty journal, unit tests).
 *
 * Self-contained (not `useAnalyticsQueries`) so every query failure is caught
 * and swallowed into the sample fallback: the showcase is a marketing
 * presentation that must never throw, block, or leak an unhandled rejection,
 * regardless of store state.
 */
export function useHomeAnalyticsData(): { data: HomeAnalyticsData; loading: boolean } {
  const [results, setResults] = useState<Partial<Record<keyof HomeAnalyticsData, QueryResult>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const rangeStart = now - HOME_ANALYTICS_WEEKS * WEEK_MS;
    void (async () => {
      const entries = await Promise.all(
        HOME_ANALYTICS_QUERIES.map(async (q) => {
          try {
            const r = await queryService.runQuery(q.query, { rangeStart, rangeEnd: now });
            return [q.key, r] as const;
          } catch {
            return [q.key, undefined] as const; // store unavailable → sample fallback
          }
        }),
      );
      if (!cancelled) {
        setResults(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (key: keyof HomeAnalyticsData): QueryResult => {
    const live = results[key];
    return hasPoints(live) ? live : SAMPLE_HOME_ANALYTICS[key];
  };

  const data: HomeAnalyticsData = {
    repsByEffort: pick('repsByEffort'),
    weeklyVolume: pick('weeklyVolume'),
    loadByIntensity: pick('loadByIntensity'),
    volumeByEffort: pick('volumeByEffort'),
    avgTis: pick('avgTis'),
    totalVolume: pick('totalVolume'),
  };
  return { data, loading };
}

// ── WQL elements reference strip ───────────────────────────────────────────

function VocabGroup({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span
            key={it}
            className="font-mono text-[11px] rounded bg-muted px-1.5 py-0.5 text-foreground/80"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VocabularyStrip() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border bg-card/50 p-4 md:grid-cols-3 lg:grid-cols-6">
      <VocabGroup label="aggregators" items={WQL_AGGREGATORS} />
      <VocabGroup label="metrics" items={[...WQL_METRIC_FAMILIES, ...WQL_METRIC_AGGREGATES]} />
      <VocabGroup label="filter keys" items={WQL_TAG_KEYS} />
      <VocabGroup label="dimensions" items={WQL_VIRTUAL_DIMS} />
      <VocabGroup label="intensity" items={WQL_INTENSITY_TIERS} />
      <VocabGroup label="rollups" items={WQL_ROLLUP_PERIODS} />
    </div>
  );
}

// ── Example tiles ──────────────────────────────────────────────────────────

function Tile({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {kind}
      </span>
      {children}
    </div>
  );
}

/** A chip row for one parsed query — the WQL elements, front and center. */
function Chips({ parsed }: { parsed: ParsedQuery }) {
  return (
    <div className="mb-2">
      <ParsedQueryChips parsed={parsed} />
    </div>
  );
}

export function TableTile({ data }: { data: HomeAnalyticsData }) {
  return (
    <Tile kind="Table list">
      <WidgetFrame title="Reps by effort" question="Which movements?" query="sum:totalReps{} by {effort}">
        <Chips parsed={data.repsByEffort.parsed} />
        <div className="h-44">
          <WqlTable result={data.repsByEffort} unit="reps" />
        </div>
      </WidgetFrame>
    </Tile>
  );
}

export function GraphsTile({ data }: { data: HomeAnalyticsData }) {
  return (
    <Tile kind="Graphs">
      <div className="flex flex-col gap-3">
        <WidgetFrame title="Weekly tonnage" question="Is volume rising?" query="sum:totalVolume{} by {week}.rollup(1w)">
          <Chips parsed={data.weeklyVolume.parsed} />
          <div className="h-40">
            <WqlTimeseries result={data.weeklyVolume} unit="kg" />
          </div>
        </WidgetFrame>
        <WidgetFrame title="Load by intensity" question="Is training polarized?" query="sum:sessionLoad{} by {intensity}.rollup(1w)">
          <Chips parsed={data.loadByIntensity.parsed} />
          <div className="h-40">
            <StackedBar result={data.loadByIntensity} unit="AU" />
          </div>
        </WidgetFrame>
      </div>
    </Tile>
  );
}

export function DashboardTile({ data }: { data: HomeAnalyticsData }) {
  return (
    <Tile kind="Multi-query dashboard">
      <div className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Training Block Review</h3>
          <span className="text-[11px] text-muted-foreground italic text-right">
            {HOME_ANALYTICS_QUERIES.length - 1} WQL widgets · mirrors DashboardView
          </span>
        </div>
        {/* The composing queries — a dashboard is N WQL elements, listed. */}
        <div className="flex flex-wrap gap-1">
          {HOME_ANALYTICS_QUERIES.slice(1).map((q) => (
            <span
              key={q.key}
              className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-foreground/70 break-all"
            >
              {q.query}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <WidgetFrame title="Avg TIS" question="How hard?" query="avg:tis{}">
            <QueryValue result={data.avgTis} unit="pts" label="avg intensity" />
          </WidgetFrame>
          <WidgetFrame title="Total volume" question="How much?" query="sum:totalVolume{}">
            <QueryValue result={data.totalVolume} unit="kg" label="total volume" />
          </WidgetFrame>
          <div className="col-span-2">
            <WidgetFrame title="Weekly tonnage" question="Rising?" query="sum:totalVolume{} by {week}.rollup(1w)">
              <div className="h-32">
                <WqlTimeseries result={data.weeklyVolume} unit="kg" />
              </div>
            </WidgetFrame>
          </div>
          <WidgetFrame title="Volume by effort" question="Where?" query="sum:totalVolume{discipline:strength} by {effort}">
            <div className="h-32">
              <TopList result={data.volumeByEffort} unit="kg" limit={4} />
            </div>
          </WidgetFrame>
          <WidgetFrame title="Load by intensity" question="Polarized?" query="sum:sessionLoad{} by {intensity}.rollup(1w)">
            <div className="h-32">
              <StackedBar result={data.loadByIntensity} unit="AU" />
            </div>
          </WidgetFrame>
        </div>
      </div>
    </Tile>
  );
}

// ── The section ────────────────────────────────────────────────────────────

export interface HomeAnalyticsSectionProps {
  /**
   * Pre-resolved widget data (Storybook / tests). Omit to execute the queries
   * against the live store with the illustrative sample as the per-widget
   * fallback.
   */
  data?: HomeAnalyticsData;
}

/** Presentational section — pure over the widget data. */
export function HomeAnalyticsSectionView({ data }: { data: HomeAnalyticsData }) {
  return (
    <section data-testid="home-analytics-section" className="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 py-16 lg:px-12">
      <header className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          Own the analytics
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          Query what you just did — in WQL
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every result is one query away. WQL turns your journal into queryable
          facts: pick an <strong>aggregator</strong> and a <strong>metric</strong>,
          filter by <strong>tag</strong>, group by a <strong>dimension</strong>,
          roll up over <strong>time</strong>. The same elements drive a table, a
          graph, or a full dashboard.
        </p>
      </header>

      <VocabularyStrip />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <TableTile data={data} />
        <GraphsTile data={data} />
        <DashboardTile data={data} />
      </div>
    </section>
  );
}

/** Live-data variant — executes the showcase queries against the store. */
function LiveHomeAnalyticsSection() {
  const { data } = useHomeAnalyticsData();
  return <HomeAnalyticsSectionView data={data} />;
}

/**
 * The home analytics section. Pass `data` for a static render (Storybook /
 * tests); omit it to execute the queries against the live IndexedDB store
 * with the illustrative sample as the per-widget fallback.
 */
export function HomeAnalyticsSection({ data }: HomeAnalyticsSectionProps) {
  return data ? <HomeAnalyticsSectionView data={data} /> : <LiveHomeAnalyticsSection />;
}

export default HomeAnalyticsSection;
