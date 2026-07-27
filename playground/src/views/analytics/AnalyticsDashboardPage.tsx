import { useMemo, useState } from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export function AnalyticsDashboardPage() {
  const [weeks] = useAnalyticsRange();
  const [showSource, setShowSource] = useState(false);
  const queries = useMemo(() => DEMO_WIDGETS.map((w) => ({ key: w.key, query: w.query })), []);
  const { results, loading } = useAnalyticsQueries(queries, weeks);

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

        {loading && (
          <div className="text-sm text-muted-foreground">Loading widgets…</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {DEMO_WIDGETS.map((widget) => {
            const result = results[widget.key];
            return (
              <WidgetFrame
                key={widget.key}
                title={widget.title}
                question={widget.question}
                query={widget.query}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
