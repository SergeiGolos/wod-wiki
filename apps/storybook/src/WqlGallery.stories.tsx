/**
 * WQL Example Gallery — Interactive Corpus Gallery (ticket 008)
 *
 * Curated gallery of WQL examples across all query families and seeded
 * corpus journals (crossfit-multi-week, endurance-block, mixed-wellness,
 * climb-yoga).
 *
 * Each card executes its query live through QueryService over the real
 * corpus data, rendered with the appropriate @bitcobblers/wod-wiki-ui widget.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  QueryService,
  parseQuery,
  isRowsQuery,
  type QueryResult,
  type RowsQueryResult,
  inMemoryEventStore,
  type NoteQueryStore,
} from '@bitcobblers/wod-wiki-engine';
import type { Note, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
  RowsTable,
} from '@bitcobblers/wod-wiki-ui';

import crossfitJournal from '../../../packages/wql/fixtures/corpus/crossfit-multi-week.json';
import enduranceJournal from '../../../packages/wql/fixtures/corpus/endurance-block.json';
import wellnessJournal from '../../../packages/wql/fixtures/corpus/mixed-wellness.json';
import climbJournal from '../../../packages/wql/fixtures/corpus/climb-yoga.json';

const meta: Meta = {
  title: 'Gallery/WQL Example Gallery',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

type JournalKey = 'crossfit' | 'endurance' | 'wellness' | 'climb';

interface RawJournal {
  id: string;
  title: string;
  description: string;
  notes: Array<{ id: string; title: string; createdAt: number; tags?: string[] }>;
  records: UnifiedEventRecord[];
}

const JOURNALS: Record<JournalKey, RawJournal> = {
  crossfit: crossfitJournal as unknown as RawJournal,
  endurance: enduranceJournal as unknown as RawJournal,
  wellness: wellnessJournal as unknown as RawJournal,
  climb: climbJournal as unknown as RawJournal,
};

function buildServiceForJournal(journal: RawJournal): QueryService {
  const noteStore: NoteQueryStore = {
    getAllNotes: async () => journal.notes as Note[],
    getNoteIdsForTag: async (label: string) =>
      new Set(journal.notes.filter((n) => n.tags?.includes(label)).map((n) => n.id)),
    getNoteTagLabels: async (noteId: string) =>
      journal.notes.find((n) => n.id === noteId)?.tags ?? [],
  };
  return new QueryService(inMemoryEventStore(journal.records), noteStore);
}

interface ExampleCardProps {
  title: string;
  description: string;
  query: string;
  journalKey: JournalKey;
  preferredUnit?: string;
}

function ExampleCard({ title, description, query, journalKey, preferredUnit }: ExampleCardProps) {
  const journal = JOURNALS[journalKey];
  const service = useMemo(() => buildServiceForJournal(journal), [journal]);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [rowsResult, setRowsResult] = useState<RowsQueryResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const parsed = parseQuery(query);
        if (parsed.error) {
          if (!cancelled) setError(parsed.error);
          return;
        }
        if (isRowsQuery(parsed)) {
          const r = await service.runRows(parsed);
          if (!cancelled) {
            setRowsResult(r);
            setError(r.error);
          }
          return;
        }
        const newest = Math.max(...journal.records.map((r) => r.timestamp));
        const r = await service.run(parsed, { rangeEnd: newest, preferredUnit });
        if (!cancelled) {
          setResult(r);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [query, service, journal, preferredUnit]);

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3 shadow-xs"
      data-testid={`example-card-${journalKey}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {journal.id}
        </span>
      </div>

      <div className="rounded bg-muted/40 px-2 py-1 font-mono text-xs text-primary">
        <code>{query}</code>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && !error && (
        <div className="h-48 pt-1">
          {result.parsed.groupBy.length === 0 ? (
            <WidgetFrame title="Scalar" question={description} query={query}>
              <QueryValue result={result} label={result.unit ? `in ${result.unit}` : 'value'} />
            </WidgetFrame>
          ) : result.parsed.groupBy.length === 1 && result.parsed.groupBy[0] === 'week' ? (
            <WidgetFrame title="Weekly Trend" question={description} query={query}>
              <WqlTimeseries result={result} />
            </WidgetFrame>
          ) : (
            <WidgetFrame title="Breakdown" question={description} query={query}>
              {result.series.length > 3 ? (
                <TopList result={result} limit={6} />
              ) : (
                <WqlBars result={result} />
              )}
            </WidgetFrame>
          )}
        </div>
      )}

      {rowsResult && !error && (
        <div className="max-h-64 overflow-y-auto rounded border border-border/50 bg-background/50 pt-2">
          <RowsTable result={rowsResult} />
        </div>
      )}
    </div>
  );
}

export function WqlGalleryView() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl" data-testid="wql-gallery">
      <div>
        <h2 className="text-xl font-bold text-foreground">WQL Example Gallery</h2>
        <p className="text-sm text-muted-foreground">
          Curated collection of WQL queries across families, executed live against the seeded
          corpus journals.
        </p>
      </div>

      {/* Section 1: Scalar Summaries */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-foreground border-b border-border pb-1">
          1. Scalar Summaries
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <ExampleCard
            title="Total Volume"
            description="Overall training volume across 6 weeks"
            query="sum:totalVolume{}"
            journalKey="crossfit"
            preferredUnit="lb"
          />
          <ExampleCard
            title="Average Sleep"
            description="Mean sleep hours recorded in wellness journal"
            query="avg:sleep{}"
            journalKey="wellness"
          />
          <ExampleCard
            title="Recovery Load"
            description="Total session load for recovery discipline"
            query="sum:sessionLoad{discipline:recovery}"
            journalKey="climb"
          />
        </div>
      </section>

      {/* Section 2: Grouped Breakdowns */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-foreground border-b border-border pb-1">
          2. Grouped Breakdowns
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <ExampleCard
            title="Volume by Discipline"
            description="Gymnastics vs kettlebell vs bodyweight volume"
            query="sum:totalVolume{} by {discipline}"
            journalKey="crossfit"
            preferredUnit="lb"
          />
          <ExampleCard
            title="Session Load by Discipline"
            description="Endurance discipline distribution (running, rowing, cycling)"
            query="sum:sessionLoad{} by {discipline}"
            journalKey="endurance"
          />
        </div>
      </section>

      {/* Section 3: Weekly Trends */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-foreground border-b border-border pb-1">
          3. Weekly Trends
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <ExampleCard
            title="Gymnastics Volume Progression"
            description="Weekly volume on the Fran benchmark progression"
            query="sum:totalVolume{discipline:gymnastics} by {week}"
            journalKey="crossfit"
          />
          <ExampleCard
            title="Weekly Running Distance"
            description="Progression of weekly interval running kilometers"
            query="sum:distance{discipline:running} by {week}"
            journalKey="endurance"
          />
        </div>
      </section>

      {/* Section 4: Rows & Scoped Views */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-foreground border-b border-border pb-1">
          4. Session Rows &amp; Statement Scopes
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <ExampleCard
            title="Fran Session Statements"
            description="All output statements for week 0 Fran workout"
            query="rows:all{result:res-fran-w0}"
            journalKey="crossfit"
          />
          <ExampleCard
            title="Bouldering Event Statements"
            description="Problem completion event statements for week 4 boulder session"
            query="rows:all{result:res-boulder-w4}"
            journalKey="climb"
          />
        </div>
      </section>
    </div>
  );
}

export const Gallery: Story = {
  render: () => <WqlGalleryView />,
};
