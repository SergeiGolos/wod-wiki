import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { isFindQuery, queryService } from '@/services/analytics/query';
import {
  WqlComposer,
  clausesToWql,
  defaultMetricsClauses,
  wqlToClauses,
  type QueryClause,
  type WqlExecutor,
} from '@/components/organisms/wql-composer';
import {
  RangeSelector,
  useAnalyticsRange,
  AnalyticsUnitPreference,
  useAnalyticsUnitPreference,
  DashboardView,
} from '@/components/molecules/analytics';
import { notePersistence } from '@/services/persistence';
import { journalNotes } from '../../services/journalNotes';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter';
import { parseDashboardNote } from '@/lib/dashboard/parser';
import { buildDashboardDocument, setDashboardTokenValue, type DashboardWidget } from '@/lib/dashboard/model';
import { hasSampleData, purgeSampleData } from '@/services/analytics/sample';
import { Link } from 'react-router-dom';

export function AnalyticsDashboardPage() {
  const [weeks] = useAnalyticsRange();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();
  const [sampleLoaded, setSampleLoaded] = useState<boolean | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  // False until the discovery effect settles — gates the empty state so it
  // never flashes while the note list is loading.
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [clauses, setClauses] = useState<QueryClause[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Discover the active dashboard note: notes carry content in segments, so
  // list through the persistence layer (HistoryEntry includes rawContent).
  // Selection: `dashboard.active: true` wins, else the first dashboard note.
  useEffect(() => {
    let cancelled = false;
    notePersistence.listNotes({}).then((notes) => {
      if (cancelled) return;
      const dashboardNotes = notes.filter(
        (n) => parseFrontmatter(n.rawContent).meta['dashboard'] === 'true'
      );
      
      if (dashboardNotes.length > 0) {
        const active =
          dashboardNotes.find((n) => parseFrontmatter(n.rawContent).meta['dashboard.active'] === 'true') ||
          dashboardNotes[0];
        setActiveNoteId(active.id);
        setActiveNoteContent(active.rawContent);
      } else {
        setActiveNoteId(null);
        setActiveNoteContent(null);
      }
      setNoteLoaded(true);
    }).catch(() => {
      if (!cancelled) {
        setActiveNoteId(null);
        setActiveNoteContent(null);
        setNoteLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    void hasSampleData().then(setSampleLoaded);
  }, [refreshKey]);

  // Parse the active note into sections and build the DashboardDocument
  const { parsedSections, document } = useMemo(() => {
    if (!activeNoteContent) return { parsedSections: [], document: null };
    const { meta, sections } = parseDashboardNote(activeNoteContent);
    return {
      parsedSections: sections,
      document: buildDashboardDocument(sections, meta),
    };
  }, [activeNoteContent]);

  // Live stage counts in the edit modal's diagnostics strip (same seam as
  // the explorer / library hosts).
  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  );

  const handleTokenChange = async (name: string, value: string) => {
    if (!activeNoteId || !activeNoteContent) return;
    const { meta, body } = parseFrontmatter(activeNoteContent);
    const newMeta = setDashboardTokenValue(meta, name, value);
    const newRawContent = `---\n${serializeFrontmatter(newMeta)}\n---\n${body}`;
    
    await journalNotes.update(activeNoteId, newRawContent);
    setActiveNoteContent(newRawContent);
  };

  const openEditor = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setClauses(wqlToClauses(widget.query) ?? defaultMetricsClauses());
    setIsValid(true);
  };

  const saveEditor = async () => {
    if (editingWidget && isValid && activeNoteId && activeNoteContent) {
      const wql = clausesToWql(clauses);
      
      // widget keys are strictly sequential `w0`, `w1`, etc.
      const secIdx = Number(editingWidget.key.slice(1));
      const querySections = parsedSections.filter((s) => s.type === 'query');
      const targetSection = querySections[secIdx];
      
      if (targetSection) {
        const lines = activeNoteContent.split(/\r?\n/);
        // Preserve any positional parameters trailing the query
        const newBody = editingWidget.params.length > 0
          ? `${wql} / ${editingWidget.params.join(' ')}`
          : wql;
          
        // Replace only the block BODY lines — startLine/endLine point at
        // the fences themselves; the ` ```query:<suffix> ` wrapper survives.
        lines.splice(
          targetSection.startLine + 1,
          targetSection.endLine - targetSection.startLine - 1,
          newBody
        );
        const newRawContent = lines.join('\n');
        
        await journalNotes.update(activeNoteId, newRawContent);
        setActiveNoteContent(newRawContent);
        setEditingWidget(null);
      }
    }
  };

  const handlePurgeSample = async () => {
    await purgeSampleData();
    setSampleLoaded(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {document?.title || 'Coaching Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dashboard composition driven by the active dashboard note.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RangeSelector />
            <AnalyticsUnitPreference />
          </div>
        </div>

        {sampleLoaded && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs">
            <span className="text-foreground">Sample data loaded</span>
            <button
              onClick={handlePurgeSample}
              className="font-medium text-destructive hover:text-destructive/80 transition-colors"
            >
              Purge sample data
            </button>
          </div>
        )}

        {!noteLoaded ? (
          <div className="text-sm text-muted-foreground">Loading dashboard…</div>
        ) : !document ? (
          <div className="flex flex-col items-center justify-center p-12 mt-8 border border-dashed border-border rounded-xl bg-card">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <FileText className="text-primary size-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No active dashboard found</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Create a note and add <code>dashboard: true</code> to its frontmatter. 
              The first dashboard note found will render here.
            </p>
            <div className="flex gap-4">
              <Link 
                to="/" 
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Journal
              </Link>
            </div>
          </div>
        ) : (
          <DashboardView
            document={document}
            onTokenChange={handleTokenChange}
            onEditQuery={openEditor}
            rangeStart={Date.now() - weeks * 7 * 86400000}
            rangeEnd={Date.now()}
            preferredUnit={preferredUnit}
          />
        )}

        {/* WIDGET QUERY INSPECTOR MODAL */}
        {editingWidget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" data-testid="widget-query-modal">
            <div className="nord-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl space-y-4 border-border bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Edit Widget Query: {editingWidget.title ?? editingWidget.query}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use the Omni-Composer to edit this dashboard section query.
                  </p>
                </div>
                <button
                  onClick={() => setEditingWidget(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                  data-testid="close-widget-query-modal"
                >
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
                <button
                  onClick={() => setEditingWidget(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground"
                  data-testid="cancel-widget-query"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditor}
                  disabled={!isValid}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="apply-widget-query"
                >
                  Apply to Widget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
