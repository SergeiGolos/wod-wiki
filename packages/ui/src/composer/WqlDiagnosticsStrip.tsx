import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { isAggregateQuery, isFindQuery } from '@bitcobblers/wod-wiki-wql';
import { summarizeAggregate, summarizeFind, type WqlDiagnostics } from './diagnostics';
import type { WqlStageCounts } from './useWqlStageCounts';

export interface WqlDiagnosticsStripProps {
  diagnostics: WqlDiagnostics;
  offendingLabel?: string;
  stages?: WqlStageCounts;
  actions?: ReactNode;
  className?: string;
}

function SummaryChip({ label, value, testId }: { label: string; value: string; testId: string }) {
  const legacyTestId = testId.startsWith('diag-') ? testId.replace('diag-', 'wql-') : testId;
  return (
    <span data-testid={testId} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="opacity-60">{label}:</span>
      <span data-testid={legacyTestId} className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

export function WqlDiagnosticsStrip({
  diagnostics,
  offendingLabel,
  stages,
  actions,
  className,
}: WqlDiagnosticsStripProps) {
  const { valid, ast, error } = diagnostics;

  return (
    <div
      data-testid="wql-diagnostics-strip"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors',
        valid
          ? 'bg-muted/30 border-border text-muted-foreground'
          : 'bg-destructive/5 border-destructive/30 text-destructive',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 font-medium" data-testid="wql-validity-badge" data-valid={valid}>
          {valid ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-signal-positive shrink-0" />
              <span className="text-signal-positive">Valid</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span>
                {offendingLabel ? `${offendingLabel}: ` : ''}
                {error || 'Syntax error'}
              </span>
            </>
          )}
        </div>

        {valid && isFindQuery(ast) && (
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] opacity-80 border-l border-border/50 pl-3">
            {(() => {
              const summary = summarizeFind(ast);
              return (
                <>
                  <SummaryChip label="target" value={summary.target} testId="diag-summary-target" />
                  <SummaryChip label="scope" value={summary.scope} testId="diag-summary-scope" />
                  {summary.timeWindow && (
                    <SummaryChip label="time" value={summary.timeWindow} testId="diag-summary-time" />
                  )}
                  {summary.hasJoin && (
                    <span data-testid="diag-summary-join" className="text-primary font-semibold">
                      +join
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {valid && isAggregateQuery(ast) && (
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] opacity-80 border-l border-border/50 pl-3">
            {(() => {
              const summary = summarizeAggregate(ast);
              return (
                <>
                  <SummaryChip label="agg" value={summary.agg} testId="diag-summary-agg" />
                  {summary.metric && (
                    <SummaryChip label="metric" value={summary.metric} testId="diag-summary-metric" />
                  )}
                  {summary.groupBy && (
                    <SummaryChip label="by" value={summary.groupBy} testId="diag-summary-groupby" />
                  )}
                  {summary.rollup && (
                    <SummaryChip label="every" value={summary.rollup} testId="diag-summary-rollup" />
                  )}
                  {summary.unit && (
                    <SummaryChip label="as" value={summary.unit} testId="diag-summary-unit" />
                  )}
                </>
              );
            })()}
          </div>
        )}

        {valid && stages && (
          <div
            data-testid="diag-stage-counts"
            className="text-[11px] font-semibold text-primary border-l border-border/50 pl-3"
          >
            {stages.kind === 'find' ? (
              <span>{stages.matched} matched</span>
            ) : (
              <span>
                {stages.selected} selected → {stages.aggregated} aggregated ({stages.groups} series)
              </span>
            )}
          </div>
        )}
      </div>

      {actions && <div className="flex items-center gap-1.5 ml-auto">{actions}</div>}
    </div>
  );
}
