/**
 * Gallery card + section renderers (wayfinder: analytics-widget-gallery,
 * tickets 004/005). Cards run the live round trip — journal records →
 * inMemoryEventStore → QueryService with real WQL → renderer — and show it
 * on their face: query string, declared-type chip, and the stages telemetry
 * (selected → buckets → aggregated → groups).
 *
 * Dispatch by query family: aggregates render through the real Dashboard
 * Note contract (splitWidgetBody + parseQueryWidgetSuffix → WidgetChart,
 * auto-section via useChartShape); rows:{…} renders through RowsTable;
 * find:{target} renders through the gallery-local FindResultList.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  isAggregateQuery,
  isFindQuery,
  isRowsQuery,
  parseQuery,
  parseQueryWidgetSuffix,
  splitWidgetBody,
  type FindQueryResult,
  type QueryResult,
  type RowsQueryResult,
} from '@bitcobblers/wod-wiki-engine';
import {
  QueryValue,
  RowsTable,
  WqlBars,
  WqlEmptyState,
  WqlTimeseries,
  WidgetChart,
  useChartShape,
} from '@bitcobblers/wod-wiki-ui';

import { JOURNALS, buildServiceForJournal, newestTimestamp } from './journals';
import {
  SECTION_META,
  cardBody,
  cardsForSection,
  type GalleryCardDef,
  type GallerySection,
} from './galleryManifest';

/** Auto-inference: the result shape alone picks the widget. */
function AutoChart({ result }: { result?: QueryResult }) {
  const shape = useChartShape(result);
  if (shape.kind === 'error') {
    return <p className="text-xs text-destructive">{shape.message}</p>;
  }
  if (!result || shape.kind === 'empty') {
    return <WqlEmptyState result={result} />;
  }
  if (shape.kind === 'bars') {
    return (
      <div className="h-48">
        <WqlBars result={result} />
      </div>
    );
  }
  if (shape.kind === 'timeseries') {
    return (
      <div className="h-48">
        <WqlTimeseries result={result} />
      </div>
    );
  }
  return <QueryValue result={result} label={`scalar · ${shape.value}`} />;
}

/** Gallery-local renderer for find: results — no dashboard widget exists
 *  for content discovery; the list mirrors FindQueryResult's three planes. */
function FindResultList({ result }: { result: FindQueryResult }) {
  const target = result.parsed.target;
  const efforts = result.efforts ?? [];
  const total = result.notes.length + result.blocks.length + efforts.length;
  return (
    <div
      className="max-h-64 overflow-y-auto rounded border border-border/50 bg-background/50 p-2 font-mono text-xs"
      data-testid="gallery-find-list"
    >
      {result.notes.map((note) => (
        <div key={note.id} className="mb-1 text-[11px]">
          <span className="text-primary font-medium">{note.title}</span>{' '}
          <span className="text-muted-foreground">[{note.id}]</span>
        </div>
      ))}
      {result.blocks.map((block) => (
        <div key={block.id} className="mb-1 text-[11px]">
          <span className="text-primary font-medium">{block.rawContent}</span>{' '}
          <span className="text-muted-foreground">[{block.blockContentId} · {block.noteId}]</span>
        </div>
      ))}
      {efforts.map((effort) => (
        <div key={effort.id} className="mb-1 text-[11px]">
          <span className="text-primary font-medium">{effort.label}</span>{' '}
          <span className="text-muted-foreground">
            [{effort.slug} · {String(effort.baseAttributes.discipline ?? '?')} · {String(effort.baseAttributes.intensityTier ?? '?')}]
          </span>
        </div>
      ))}
      {total === 0 && <p className="text-muted-foreground">no {target} matches</p>}
    </div>
  );
}

interface StagesReadoutProps {
  result: QueryResult | undefined;
}

/** The round trip, visible: what the filters selected, buckets, groups. */
function StagesReadout({ result }: StagesReadoutProps) {
  if (!result) return null;
  const { selected, buckets, aggregated, groups } = result.stages;
  return (
    <p
      className="font-mono text-[10px] text-muted-foreground"
      data-testid="gallery-stages"
    >
      selected {selected} → buckets {buckets} → aggregated {aggregated} → groups {groups}
    </p>
  );
}

export function GalleryCardView({ def }: { def: GalleryCardDef }) {
  const journal = JOURNALS[def.journal];
  const service = useMemo(() => buildServiceForJournal(journal), [journal]);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [rowsResult, setRowsResult] = useState<RowsQueryResult | undefined>();
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // Dashboard Note body contract: one line, `query / param1 param2`.
        const { query } = splitWidgetBody(cardBody(def));
        const parsed = parseQuery(query);
        if (parsed.error) {
          if (!cancelled) setError(parsed.error);
          return;
        }
        if (isRowsQuery(parsed)) {
          const r = await service.runRows(parsed);
          if (!cancelled) {
            setRowsResult(r);
            setFindResult(undefined);
            setResult(undefined);
            setError(r.error);
          }
          return;
        }
        if (isFindQuery(parsed)) {
          const r = await service.runFind(parsed);
          if (!cancelled) {
            setFindResult(r);
            setRowsResult(undefined);
            setResult(undefined);
            setError(undefined);
          }
          return;
        }
        if (!isAggregateQuery(parsed)) {
          if (!cancelled) setError('not an aggregate query');
          return;
        }
        const r = await service.run(parsed, {
          rangeEnd: newestTimestamp(journal),
          preferredUnit: def.preferredUnit,
        });
        if (!cancelled) {
          setResult(r);
          setRowsResult(undefined);
          setFindResult(undefined);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [def, service, journal]);

  const isAuto = def.widgetType === 'auto';
  const isRows = rowsResult !== undefined;
  const isFind = findResult !== undefined;
  const suffix = isAuto || isRows || isFind ? undefined : parseQueryWidgetSuffix(def.widgetType);
  const body = cardBody(def);
  const rowsStatementCount = rowsResult?.runs.reduce(
    (count, run) => count + run.events.length,
    0,
  );

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3 shadow-xs"
      data-testid={`gallery-card-${def.title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{def.title}</h4>
          <p className="text-xs text-muted-foreground">{def.question}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {journal.id}
          </span>
          <span
            className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
            data-testid="gallery-type-chip"
          >
            {def.widgetType}
          </span>
          {def.preferredUnit && (
            <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              unit: {def.preferredUnit}
            </span>
          )}
        </div>
      </div>

      <div className="rounded bg-muted/40 px-2 py-1 font-mono text-xs text-primary">
        <code>{body}</code>
      </div>

      <StagesReadout result={result} />
      {rowsResult && (
        <p className="font-mono text-[10px] text-muted-foreground" data-testid="gallery-stages">
          {rowsResult.runs.length} run(s) · {rowsStatementCount} statement(s)
        </p>
      )}
      {findResult && (
        <p className="font-mono text-[10px] text-muted-foreground" data-testid="gallery-stages">
          selected {findResult.stages.selected} → matched {findResult.stages.matched}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && !isAuto && !isRows && !isFind && suffix?.error && (
        <p className="text-xs text-destructive">{suffix.error}</p>
      )}

      {isRows && rowsResult && (
        <div
          className="max-h-64 overflow-y-auto rounded border border-border/50 bg-background/50 pt-1"
          data-testid="gallery-rows-table"
        >
          <RowsTable result={rowsResult} />
        </div>
      )}
      {isFind && findResult && <FindResultList result={findResult} />}
      {!isRows && !isFind && (
        <div className={isAuto ? 'pt-1' : 'h-48 pt-1'}>
          {isAuto ? (
            <AutoChart result={result} />
          ) : (
            <WidgetChart
              type={suffix?.type ?? def.widgetType}
              result={result}
              params={splitWidgetBody(body).params}
              label={def.title}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function GallerySectionView({ section }: { section: GallerySection }) {
  const cards = cardsForSection(section);
  const meta = SECTION_META[section];
  return (
    <div className="flex flex-col gap-4 max-w-6xl" data-testid={`gallery-section-${section}`}>
      <div>
        <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
        <p className="text-sm text-muted-foreground">{meta.blurb}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((def) => (
          <GalleryCardView key={`${def.section}-${def.title}`} def={def} />
        ))}
      </div>
    </div>
  );
}
