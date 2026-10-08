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
 * Data story: the tiles execute their WQL against the isolated example
 * dataset (a real QueryService over the engine's in-memory event store — see
 * `homeAnalyticsData.ts`), mirroring `DashboardView`. The dataset never
 * touches visitor storage and is always populated, so the showcase teaches
 * by example on a fresh home; a clear "Example data" badge labels it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { type AnyParsedQuery } from '@bitcobblers/wod-wiki-engine';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlTable,
  TopList,
  StackedBar,
} from '@bitcobblers/wod-wiki-ui';
import { ParsedQueryChips } from '@/components/organisms/analytics';
import { WQL_AGGREGATORS, WQL_METRIC_AGGREGATES, WQL_METRIC_FAMILIES, WQL_TAG_KEYS, WQL_VIRTUAL_DIMS, WQL_INTENSITY_TIERS, WQL_ROLLUP_PERIODS } from '@bitcobblers/wod-wiki-engine';
import {
  HOME_ANALYTICS_QUERIES,
  getHomeExampleQueryService,
  type HomeAnalyticsData,
} from './homeAnalyticsData';

/**
 * Example-data results for the showcase: run the showcase queries against
 * the isolated in-memory example store (real engine, zero visitor-storage
 * writes). State is discriminated — loading / error / ready — so a query
 * failure renders an explicit error instead of leaking `undefined` into
 * widgets behind a cast.
 */
export type HomeAnalyticsDataState =
  | { state: 'loading' }
  | { state: 'error'; error: string }
  | { state: 'ready'; data: HomeAnalyticsData };

export function useHomeAnalyticsData(): HomeAnalyticsDataState {
  const [state, setState] = useState<HomeAnalyticsDataState>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const service = getHomeExampleQueryService();
    void (async () => {
      try {
        const [repsByEffort, weeklyVolume, loadByIntensity, volumeByEffort, avgTis, totalVolume] = await Promise.all(
          HOME_ANALYTICS_QUERIES.map((query) => service.runQuery(query.query)),
        );
        if (!cancelled) {
          setState({ state: 'ready', data: { repsByEffort, weeklyVolume, loadByIntensity, volumeByEffort, avgTis, totalVolume } });
        }
      } catch (e) {
        if (!cancelled) setState({ state: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
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
function Chips({ parsed }: { parsed: AnyParsedQuery }) {
  return (
    <div className="mb-2">
      <ParsedQueryChips parsed={parsed} />
    </div>
  );
}

export function TableTile({ data }: { data: HomeAnalyticsData }) {
  return (
    <Tile kind="Table list">
      <WidgetFrame title="Reps by effort" question="Which movements?" query="sum:totalReps{} by {effort} last 6w">
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
        <WidgetFrame title="Weekly tonnage" question="Is volume rising?" query="sum:totalVolume{} by {week} last 6w">
          <Chips parsed={data.weeklyVolume.parsed} />
          <div className="h-40">
            <WqlTimeseries result={data.weeklyVolume} unit="kg" />
          </div>
        </WidgetFrame>
        <WidgetFrame title="Load by intensity" question="Is training polarized?" query="sum:sessionLoad{} by {intensity, week} last 6w">
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
      <div className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3 [&_.text-5xl]:text-2xl">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Training Block Review</h3>
          <span className="text-[11px] text-muted-foreground italic text-right">
            {HOME_ANALYTICS_QUERIES.length - 1} WQL widgets · mirrors DashboardView
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <WidgetFrame title="Avg TIS" question="How hard?" query="avg:tis{} last 6w">
            <QueryValue result={data.avgTis} unit="pts" label="training intensity" />
          </WidgetFrame>
          <WidgetFrame title="Total volume" question="How much?" query="sum:totalVolume{} last 6w">
            <QueryValue result={data.totalVolume} unit="kg" label="total volume" />
          </WidgetFrame>
          <div>
            <WidgetFrame title="Weekly tonnage" question="Rising?" query="sum:totalVolume{} by {week} last 6w">
              <div className="h-32">
                <WqlTimeseries result={data.weeklyVolume} unit="kg" />
              </div>
            </WidgetFrame>
          </div>
          <WidgetFrame title="Volume by effort" question="Where?" query="sum:totalVolume{discipline:strength} by {effort} last 6w">
            <div className="h-32">
              <TopList result={data.volumeByEffort} unit="kg" limit={4} />
            </div>
          </WidgetFrame>
          <WidgetFrame title="Load by intensity" question="Polarized?" query="sum:sessionLoad{} by {intensity, week} last 6w">
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
   * against the isolated in-memory example store.
   */
  data?: HomeAnalyticsData;
}

/** Presentational section — pure over the widget data. */
export function HomeAnalyticsSectionView({ data }: { data: HomeAnalyticsData }) {
  return (
    <section data-testid="home-analytics-section" className="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 py-16 lg:px-12">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Own the analytics
          <span
            data-testid="home-analytics-example-badge"
            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium normal-case text-muted-foreground"
          >
            Example data
          </span>
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          Query what you just did — in WQL
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every result is one query away. WQL turns your journal into queryable
          facts: pick an <strong>aggregator</strong> and a <strong>metric</strong>,
          filter by <strong>tag</strong>, group by a <strong>dimension</strong>,
          roll up over <strong>time</strong>. The same elements drive a table, a
          graph, or a full dashboard — executed here against a clearly labelled
          example dataset, never your journal.
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

/** Live-data variant — executes the showcase queries against the example store. */
function LiveHomeAnalyticsSection() {
  const state = useHomeAnalyticsData();
  if (state.state === 'loading') return null;
  if (state.state === 'error') {
    return (
      <div role="alert" data-testid="home-analytics-error" className="mx-auto max-w-[1500px] px-6 py-16 lg:px-12">
        <p className="text-sm text-muted-foreground">
          Example data failed to load: {state.error}
        </p>
      </div>
    );
  }
  return <HomeAnalyticsSectionView data={state.data} />;
}

/**
 * The home analytics section. Pass `data` for a static render (Storybook /
 * tests); omit it to execute the queries against the isolated in-memory
 * example store (real engine — never visitor storage), labelled "Example data".
 */
export function HomeAnalyticsSection({ data }: HomeAnalyticsSectionProps) {
  return data ? <HomeAnalyticsSectionView data={data} /> : <LiveHomeAnalyticsSection />;
}

export default HomeAnalyticsSection;
