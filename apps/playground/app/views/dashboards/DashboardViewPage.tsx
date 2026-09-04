import { SampleDataPrompt } from "../analytics/SampleDataPrompt";
/**
 * DashboardViewPage — renders a dashboard at /dashboard/:slug.
 *
 * The slug resolves to one of two sources (useDashboardSource):
 *  - vault: an editable note — token/query edits write back via
 *    journalNotes.update, exactly like editing any note.
 *  - prebuilt: a read-only seed (markdown/dashboards/) — rendered with a
 *    "Clone to vault" action that stamps the slug and turns it editable.
 *
 * The bare /dashboard route (no slug) is the WQL explorer — a separate page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queryService } from '@/services/queryService';
import {
  RangeSelector,
  AnalyticsUnitPreference,
  useAnalyticsUnitPreference,
  DashboardView,
} from '@bitcobblers/wod-wiki-ui';
import { useAnalyticsRange } from '../../hooks/useAnalyticsRange';
import { journalNotes } from '../../services/journalNotes';
import { dashboardNotes } from '../../services/dashboardNotes';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter';
import { parseDashboardNote } from '@/lib/dashboard/parser';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { buildDashboardDocument, setDashboardTokenValue, type DashboardWidget } from '@/lib/dashboard/model';
import { useDashboardSource } from '../../hooks/useDashboards';
import { StickyPageHeader } from '@/panels/page-shells';

export function DashboardViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [weeks] = useAnalyticsRange();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();

  // refreshKey forces re-resolution after a clone or an edit write-back.
  const [refreshKey, setRefreshKey] = useState(0);
  // Board-emptiness probe: an O(1) event count gates the fresh-profile CTA
  // card — widgets render their own empty states once facts exist.
  const [hasFacts, setHasFacts] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void indexedDBService.countEvents().then((n) => {
      if (!cancelled) setHasFacts(n > 0);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);
  const { source, loading } = useDashboardSource(slug, refreshKey);

  const document = useMemo(() => {
    if (!source?.rawContent) return null;
    const { meta, sections } = parseDashboardNote(source.rawContent);
    return buildDashboardDocument(sections, meta);
  }, [source]);


  const handleTokenChange = useCallback(
    async (name: string, value: string) => {
      if (!source?.editable || !source.noteId) return;
      const { meta, body } = parseFrontmatter(source.rawContent);
      const newMeta = setDashboardTokenValue(meta, name, value);
      const raw = `---\n${serializeFrontmatter(newMeta)}\n---\n${body}`;
      await journalNotes.update(source.noteId, raw);
      setRefreshKey((k) => k + 1);
    },
    [source],
  );

  // Splice the composed WQL back into the widget's ```query block body and
  // refresh — the modal (owned by DashboardView) gates Apply on validity.
  const handleSaveWidgetQuery = useCallback(
    async (widget: DashboardWidget, nextWql: string) => {
      if (!source?.editable || !source.noteId) return;
      const lines = source.rawContent.split('\n');
      const { sections } = parseDashboardNote(source.rawContent);
      // widget.key is `w${index}` over query sections — splice the new WQL into
      // the matched block's body lines only (fences + trailing params preserved).
      const querySections = sections.filter((s) => s.type === 'query');
      const target = querySections.find((_, i) => `w${i}` === widget.key);
      if (!target) return;
      lines.splice(target.startLine + 1, target.endLine - target.startLine - 1, nextWql);
      await journalNotes.update(source.noteId, lines.join('\n'));
      setRefreshKey((k) => k + 1); // re-resolve → saved WQL re-runs
    },
    [source],
  );

  const handleClone = useCallback(async () => {
    if (!source || source.editable) return;
    await dashboardNotes.cloneDashboard(source.slug, source.rawContent, source.title);
    setRefreshKey((k) => k + 1); // re-resolve → vault clone shadows the seed
  }, [source]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading dashboard…</div>;
  }
  if (!source) {
    return (
      <div className="p-8" data-testid="dashboard-not-found">
        <h1 className="text-lg font-bold text-foreground mb-2">Dashboard not found</h1>
        <p className="text-sm text-muted-foreground mb-4">
          No dashboard named <code>{slug}</code>. It may have been removed.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Back to explorer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StickyPageHeader
        title={document?.title || source.title}
        subtitle={source.editable ? 'Editable dashboard note.' : 'Prebuilt — read-only until cloned to your vault.'}
        actions={
          <div className="flex items-center gap-2">
            <RangeSelector />
            <AnalyticsUnitPreference />
          </div>
        }
      />
      <div className="max-w-[1500px] w-full mx-auto p-4 md:p-6 lg:p-8 flex-1">

        {!source.editable && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs">
            <span className="text-foreground">
              This is a read-only prebuilt. Clone it to edit widgets and tokens.
            </span>
            <button
              type="button"
              data-testid="clone-dashboard"
              onClick={handleClone}
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Clone to vault
            </button>
          </div>
        )}

        {hasFacts === false ? (
          <SampleDataPrompt
            layout="card"
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <div className="mb-4">
            <SampleDataPrompt
              layout="banner"
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {document && (
          <DashboardView
            document={document}
            executor={queryService}
            onTokenChange={source.editable ? handleTokenChange : undefined}
            onSaveWidgetQuery={source.editable ? handleSaveWidgetQuery : undefined}
            rangeStart={Date.now() - weeks * 7 * 86400000}
            rangeEnd={Date.now()}
            preferredUnit={preferredUnit}
          />
        )}

      </div>
    </div>
  );
}
