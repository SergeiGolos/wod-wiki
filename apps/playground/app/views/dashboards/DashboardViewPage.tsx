/**
 * DashboardViewPage — renders a dashboard at /dashboard/:slug.
 *
 * The slug resolves to one of two sources (useDashboardSource):
 *  - vault: an editable note — View/Edit mode toggle; edit mode exposes
 *    arrangement (add/edit/duplicate/remove/reorder/size) — every write goes
 *    through journalNotes after a FRESH read, identity-guarded by the
 *    widget's key + body so a stale parse can never retarget another widget.
 *  - prebuilt: a read-only seed (markdown/dashboards/) — widgets carry an
 *    always-visible inspect affordance (query + live preview in the shared
 *    composer, read-only) plus a "Clone to vault" action that stamps the
 *    slug and turns it editable.
 *
 * Authoring (add/edit/inspect) runs in the shared WidgetComposerDialog on
 * the EditorDialog shell; header actions (range, units, mode) ride the
 * ResponsiveActions module so they survive the mobile-hidden page header.
 *
 * The bare /dashboard route (no slug) is the WQL explorer — a separate page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
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
import {
  buildDashboardDocument,
  defaultTokenValues,
  setDashboardTokenValue,
  type DashboardWidget as ModelWidget,
} from '@/lib/dashboard/model';
import {
  appendWidget,
  duplicateWidget,
  moveWidget,
  removeWidget,
  resizeWidget,
  updateWidget,
} from '@/lib/dashboard/noteOps';
import { useDashboardSource } from '../../hooks/useDashboards';
import { ResponsiveActions } from '../../nav/ResponsiveActions';
import { StickyPageHeader } from '@/panels/page-shells';
import { SampleDataPrompt } from '../analytics/SampleDataPrompt';
import { WidgetComposerDialog, type WidgetComposerApply } from './WidgetComposerDialog';

type ComposerState =
  | { mode: 'add'; expectedRaw: string }
  | { mode: 'edit' | 'inspect'; widget: ModelWidget; expectedRaw: string };

export function DashboardViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [weeks] = useAnalyticsRange();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();
  const rangeStart = Date.now() - weeks * 7 * 86400000;
  const rangeEnd = Date.now();

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

  const [editMode, setEditMode] = useState(false);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  // Visible refusal surface for toolbar widget ops that lost the revision
  // race (a concurrent edit landed between render and write).
  const [actionError, setActionError] = useState<string | null>(null);

  // Every widget mutation: fresh read → revision check → guarded op →
  // single write. `expectedRaw` is the note revision captured when the
  // action started (editor open / toolbar click). The key+body guard alone
  // cannot tell apart two identical-query widgets swapped by a reorder —
  // the raw revision can. A mismatch THROWS: the caller surfaces the refusal
  // and keeps the draft; the board refreshes to the latest content.
  const mutateNote = useCallback(
    async (expectedRaw: string, mutate: (raw: string) => string | null) => {
      if (!source?.editable || !source.noteId) return;
      const note = await journalNotes.getById(source.noteId);
      if (note.rawContent !== expectedRaw) {
        setRefreshKey((k) => k + 1);
        throw new Error('The dashboard changed elsewhere — this edit was not saved.');
      }
      const next = mutate(note.rawContent);
      if (next == null) {
        setRefreshKey((k) => k + 1);
        throw new Error('The widget changed on disk — this edit was not saved.');
      }
      await journalNotes.update(source.noteId, next);
      setRefreshKey((k) => k + 1);
    },
    [source],
  );

  const handleTokenChange = useCallback(
    async (name: string, value: string) => {
      if (!source?.editable || !source.noteId) return;
      // Fresh read — never patch frontmatter onto a stale rawContent closure.
      const note = await journalNotes.getById(source.noteId);
      const { meta, body } = parseFrontmatter(note.rawContent);
      const newMeta = setDashboardTokenValue(meta, name, value);
      const raw = `---\n${serializeFrontmatter(newMeta)}\n---\n${body}`;
      await journalNotes.update(source.noteId, raw);
      setRefreshKey((k) => k + 1);
    },
    [source],
  );

  // Toolbar actions (duplicate/remove/reorder/size) start from the revision
  // on screen; a refusal lands in the visible action-error banner.
  const runWidgetOp = useCallback(
    (expectedRaw: string, mutate: (raw: string) => string | null) => {
      setActionError(null);
      void mutateNote(expectedRaw, mutate).catch((err: unknown) => {
        setActionError(err instanceof Error ? err.message : String(err));
      });
    },
    [mutateNote],
  );

  const handleComposerApply = useCallback(
    async (spec: WidgetComposerApply) => {
      if (!composer || composer.mode === 'inspect') return;
      // Throws on a stale revision — the composer catches, shows the refusal,
      // and keeps the draft open.
      if (composer.mode === 'add') {
        await mutateNote(composer.expectedRaw, (raw) => appendWidget(raw, spec));
      } else {
        const widget = composer.widget;
        await mutateNote(composer.expectedRaw, (raw) => updateWidget(raw, widget.key, widget.body, spec));
      }
    },
    [composer, mutateNote],
  );

  const handleClone = useCallback(async () => {
    if (!source || source.editable) return;
    await dashboardNotes.cloneDashboard(source.slug, source.rawContent, source.title);
    setRefreshKey((k) => k + 1); // re-resolve → vault clone shadows the seed
  }, [source]);

  // A refresh (new refreshKey) flips the hook to loading=true but KEEPS the
  // previously resolved source — gate the early returns on source-readiness,
  // not on loading alone, or the whole page (composer draft included)
  // unmounts mid-refresh. A source from a different slug is never shown.
  const sourceReady = source != null && source.slug === slug;

  if (loading && !sourceReady) {
    return <div className="p-8 text-sm text-muted-foreground">Loading dashboard…</div>;
  }
  if (!sourceReady || !source) {
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

  const editable = source.editable;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StickyPageHeader
        title={document?.title || source.title}
        subtitle={editable ? 'Editable dashboard note.' : 'Prebuilt — read-only until cloned to your vault.'}
        actions={
          <ResponsiveActions
            label="Dashboard actions"
            primary={
              editable ? (
                <button
                  type="button"
                  data-testid="dashboard-edit-toggle"
                  aria-pressed={editMode}
                  onClick={() => setEditMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editMode
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Pencil size={12} /> {editMode ? 'Done' : 'Edit'}
                </button>
              ) : undefined
            }
          >
            <RangeSelector />
            <AnalyticsUnitPreference />
          </ResponsiveActions>
        }
      />
      <div className="max-w-[1500px] w-full mx-auto p-4 md:p-6 lg:p-8 flex-1">

        {actionError && (
          <div
            role="alert"
            data-testid="dashboard-action-error"
            className="mb-4 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive"
          >
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setActionError(null)}
              className="font-medium hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        {!editable && (
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

        {editable && editMode && (
          <button
            type="button"
            data-testid="add-widget"
            onClick={() => setComposer({ mode: 'add', expectedRaw: source.rawContent })}
            className="mb-4 flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus size={13} /> Add widget
          </button>
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
            onTokenChange={editable ? handleTokenChange : undefined}
            editMode={editable && editMode}
            onEditWidget={editable ? (w) => setComposer({ mode: 'edit', widget: w, expectedRaw: source.rawContent }) : undefined}
            onDuplicateWidget={editable ? (w) => runWidgetOp(source.rawContent, (raw) => duplicateWidget(raw, w.key, w.body)) : undefined}
            onRemoveWidget={editable ? (w) => runWidgetOp(source.rawContent, (raw) => removeWidget(raw, w.key, w.body)) : undefined}
            onMoveWidget={editable ? (w, delta) => runWidgetOp(source.rawContent, (raw) => moveWidget(raw, w.key, w.body, delta)) : undefined}
            onResizeWidget={editable ? (w, span) => runWidgetOp(source.rawContent, (raw) => resizeWidget(raw, w.key, w.body, span)) : undefined}
            onInspectWidget={!editable ? (w) => setComposer({ mode: 'inspect', widget: w, expectedRaw: source.rawContent }) : undefined}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            preferredUnit={preferredUnit}
          />
        )}

      </div>

      <WidgetComposerDialog
        open={composer !== null}
        onClose={() => setComposer(null)}
        mode={composer?.mode ?? 'add'}
        initialWql={
          composer && composer.mode !== 'add'
            ? composer.widget.query
            : 'sum:totalVolume{}'
        }
        initial={
          composer && composer.mode !== 'add'
            ? {
                title: composer.widget.title,
                question: composer.widget.question,
                type: composer.widget.type,
                spanCols: composer.widget.spanCols,
                spanFull: composer.widget.spanFull,
                params: composer.widget.params,
              }
            : undefined
        }
        executor={queryService}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        preferredUnit={preferredUnit}
        tokenValues={document ? defaultTokenValues(document.tokens) : undefined}
        onApply={composer?.mode === 'inspect' ? undefined : handleComposerApply}
        footerExtra={
          composer?.mode === 'inspect' ? (
            <button
              type="button"
              data-testid="inspect-clone"
              onClick={() => {
                void handleClone().then(() => {
                  setComposer(null);
                  setEditMode(true);
                });
              }}
              className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 rounded-lg border border-primary/40 hover:bg-primary/10 transition-colors"
            >
              Clone to vault to edit
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
