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
import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { queryService } from '@/services/queryService';
import { isFindQuery } from '@bitcobblers/wod-wiki-engine';;
import {
  WqlComposer,
  clausesToWql,
  defaultMetricsClauses,
  wqlToClauses,
  type QueryClause,
  type WqlExecutor,
} from '@bitcobblers/wod-wiki-ui';
import {
  RangeSelector,
  AnalyticsUnitPreference,
  useAnalyticsUnitPreference,
  DashboardView,
} from '@bitcobblers/wod-wiki-ui';
import { ensureStoreRollupFacts } from '@/services/analytics/rollup';
import { useAnalyticsRange } from '../../hooks/useAnalyticsRange';
import { journalNotes } from '../../services/journalNotes';
import { dashboardNotes } from '../../services/dashboardNotes';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter';
import { parseDashboardNote } from '@/lib/dashboard/parser';
import { buildDashboardDocument, setDashboardTokenValue, type DashboardWidget } from '@/lib/dashboard/model';
import { useDashboardSource } from '../../hooks/useDashboards';

export function DashboardViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [weeks] = useAnalyticsRange();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();

  // refreshKey forces re-resolution after a clone or an edit write-back.
  const [refreshKey, setRefreshKey] = useState(0);
  const { source, loading } = useDashboardSource(slug, refreshKey);

  const document = useMemo(() => {
    if (!source?.rawContent) return null;
    const { meta, sections } = parseDashboardNote(source.rawContent);
    return buildDashboardDocument(sections, meta);
  }, [source]);

  // ── Editable (vault) edit modal state ────────────────────────────────
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [clauses, setClauses] = useState<QueryClause[]>([]);
  const [isValid, setIsValid] = useState(true);

  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  );

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

  const openEditor = useCallback((widget: DashboardWidget) => {
    setEditingWidget(widget);
    setClauses(wqlToClauses(widget.query) ?? defaultMetricsClauses());
    setIsValid(true);
  }, []);

  const saveEditor = useCallback(async () => {
    if (!editingWidget || !isValid || !source?.editable || !source.noteId) return;
    const newWql = clausesToWql(clauses);
    const lines = source.rawContent.split('\n');
    const { sections } = parseDashboardNote(source.rawContent);
    // widget.key is `w${index}` over query sections — splice the new WQL into
    // the matched block's body lines only (fences + trailing params preserved).
    const querySections = sections.filter((s) => s.type === 'query');
    const target = querySections.find((_, i) => `w${i}` === editingWidget.key);
    if (target) {
      lines.splice(target.startLine + 1, target.endLine - target.startLine - 1, newWql);
      await journalNotes.update(source.noteId, lines.join('\n'));
      setRefreshKey((k) => k + 1);
    }
    setEditingWidget(null);
  }, [editingWidget, isValid, clauses, source]);

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
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{document?.title || source.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {source.editable ? 'Editable dashboard note.' : 'Prebuilt — read-only until cloned to your vault.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RangeSelector />
            <AnalyticsUnitPreference />
          </div>
        </div>

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

        {document && (
          <DashboardView
            document={document}
            executor={queryService}
            onEnsureRollupFacts={async () => { await ensureStoreRollupFacts(); }}
            onTokenChange={source.editable ? handleTokenChange : undefined}
            onEditQuery={source.editable ? openEditor : undefined}
            rangeStart={Date.now() - weeks * 7 * 86400000}
            rangeEnd={Date.now()}
            preferredUnit={preferredUnit}
          />
        )}

        {/* WIDGET QUERY EDITOR MODAL (vault dashboards only) */}
        {source.editable && editingWidget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" data-testid="widget-query-modal">
            <div className="nord-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl space-y-4 border-border bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Widget Query: {editingWidget.title ?? editingWidget.query}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Use the Omni-Composer to edit this dashboard section query.</p>
                </div>
                <button onClick={() => setEditingWidget(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted" data-testid="close-widget-query-modal">
                  <X size={18} />
                </button>
              </div>
              <WqlComposer
                clauses={clauses}
                onClausesChange={setClauses}
                onValidationChange={(state) => setIsValid(state.valid)}
                execute={diagnosticsExecutor}
              />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button onClick={() => setEditingWidget(null)} className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={saveEditor} data-testid="save-widget-query" disabled={!isValid} className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
