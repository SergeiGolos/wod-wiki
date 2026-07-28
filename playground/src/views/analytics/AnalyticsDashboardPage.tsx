import { useEffect, useMemo, useState } from 'react';
import { Code2, Edit3, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WqlQueryComposer } from '@/components/organisms/analytics/WqlQueryComposer';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
  StackedBar,
  RangeSelector,
  useAnalyticsRange,
  useAnalyticsQueries,
} from '@/components/molecules/analytics';
import { DEMO_WIDGETS, DASHBOARD_SOURCE } from './dashboardDefinition';
import { SampleDataPrompt } from './SampleDataPrompt';
import { hasSampleData, purgeSampleData } from '@/services/analytics/sample';

export function AnalyticsDashboardPage() {
  const [weeks] = useAnalyticsRange();
  const [showSource, setShowSource] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState<boolean | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [widgetQueries, setWidgetQueries] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DEMO_WIDGETS.forEach((w) => {
      initial[w.key] = w.query;
    });
    return initial;
  });
  const [editingWidgetKey, setEditingWidgetKey] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState<string>('');

  const queries = useMemo(
    () => DEMO_WIDGETS.map((w) => ({ key: w.key, query: widgetQueries[w.key] ?? w.query })),
    [widgetQueries],
  );
  const { results, loading } = useAnalyticsQueries(queries, weeks, refreshKey);

  useEffect(() => {
    void hasSampleData().then(setSampleLoaded);
  }, [refreshKey]);

  const openEditor = (key: string, currentQuery: string) => {
    setEditingWidgetKey(key);
    setDraftQuery(currentQuery);
  };

  const saveEditor = () => {
    if (editingWidgetKey) {
      setWidgetQueries((prev) => ({ ...prev, [editingWidgetKey]: draftQuery }));
      setEditingWidgetKey(null);
    }
  };

  const handlePurgeSample = async () => {
    await purgeSampleData();
    setSampleLoaded(false);
    setRefreshKey((k) => k + 1);
  };

  const allEmpty = !loading && DEMO_WIDGETS.every((w) => {
    const r = results[w.key];
    return !r || r.matched.length === 0;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Coaching Dashboard — Training Block Review</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every widget below is one WQL query over the same fact store.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RangeSelector />
            <button
              onClick={() => setShowSource((s) => !s)}
              className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            >
              <Code2 size={13} />
              {showSource ? 'Hide note source' : 'View as note'}
            </button>
          </div>
        </div>

        {showSource && (
          <pre className="bg-card border border-border rounded-lg p-4 mb-4 text-[12px] font-mono text-muted-foreground overflow-x-auto whitespace-pre">
            {DASHBOARD_SOURCE}
          </pre>
        )}

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

        {loading && (
          <div className="text-sm text-muted-foreground">Loading widgets…</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {allEmpty ? (
            <div className="md:col-span-2 xl:col-span-4">
              <SampleDataPrompt
                layout="card"
                onChanged={() => {
                  setRefreshKey((k) => k + 1);
                }}
              />
            </div>
          ) : (
            DEMO_WIDGETS.map((widget) => {
              const currentQuery = widgetQueries[widget.key] ?? widget.query;
              const result = results[widget.key];
              return (
                <div key={widget.key} className="relative group">
                  <button
                    onClick={() => openEditor(widget.key, currentQuery)}
                    title="Edit Widget Query with Dual Composer"
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Edit3 size={13} />
                  </button>
                  <WidgetFrame
                    title={widget.title}
                    question={widget.question}
                    query={currentQuery}
                    span={widget.span}
                  >
                    <div className={cn('h-full', widget.type === 'value' || widget.type === 'toplist' ? 'h-36' : 'h-56')}>
                      {widget.type === 'value' && result && (
                        <QueryValue
                          result={result}
                          unit={widget.unit ?? ''}
                          label={widget.label ?? ''}
                          thresholds={widget.thresholds}
                        />
                      )}
                      {widget.type === 'toplist' && result && (
                        <div className="h-36 overflow-y-auto">
                          <TopList result={result} unit={widget.unit} limit={widget.limit} />
                        </div>
                      )}
                      {widget.type === 'timeseries' && result && (
                        <WqlTimeseries result={result} unit={widget.unit} />
                      )}
                      {widget.type === 'bar' && result && (
                        <WqlBars result={result} unit={widget.unit} />
                      )}
                      {widget.type === 'stacked' && result && (
                        <StackedBar result={result} unit={widget.unit} />
                      )}
                    </div>
                  </WidgetFrame>
                </div>
              );
            })
          )}
        </div>

        {/* WIDGET QUERY INSPECTOR MODAL */}
        {editingWidgetKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="nord-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl space-y-4 border-border bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Edit Widget Query: {DEMO_WIDGETS.find((w) => w.key === editingWidgetKey)?.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use the Dual-Mode Composer (Visual Pills or Raw WQL) to edit this dashboard section query.
                  </p>
                </div>
                <button
                  onClick={() => setEditingWidgetKey(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <WqlQueryComposer
                value={draftQuery}
                onChange={setDraftQuery}
                mode="dual"
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  onClick={() => setEditingWidgetKey(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditor}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
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
