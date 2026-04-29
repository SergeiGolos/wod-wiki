/**
 * WodBlockInspector — main debug component.
 *
 * Layout (top → bottom):
 *   1. Editor view  — raw WOD content
 *   2. Compile      — parser/dialect metric tables per line
 *   3. Plan         — pre-runtime predictions
 *   4. Runtime      — per-block metric cascade (compile→runtime→processing→collected)
 *   5. Analytics    — engines + result tables
 *
 * Driven by InspectorState / useInspectorState.
 * Sections are collapsible; they auto-open when their phase is reached.
 */

import React from 'react';
import { InspectorSection } from './InspectorSection';
import { MetricTable } from './MetricTable';
import type { InspectorState, InspectorAction, SpanLevel } from '../../types/inspector';
import {
  resolveMetricTable,
  spansByLevel,
  childSpans,
} from '../../selectors/resolveMetricTable';

// ─── Column sets per section ──────────────────────────────────────────────────

const COMPILE_COLS: SpanLevel[] = ['parser', 'dialect'];
const RUNTIME_COLS: SpanLevel[] = ['compiler', 'runtime', 'processing', 'collected'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface WodBlockInspectorProps {
  state: InspectorState;
  dispatch: React.Dispatch<InspectorAction>;
  /** Called when user clicks Run */
  onRun?: () => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WodBlockInspector: React.FC<WodBlockInspectorProps> = ({
  state,
  dispatch,
  onRun,
  className = '',
}) => {
  const { phase, content, dialect, spans, entries, engines, errors } = state;

  // ── Compile section data ─────────────────────────────────────────────────
  // One sub-section per parser-level span (each represents one parsed line)
  const parserSpans = spansByLevel('parser', spans);

  // ── Plan section data ────────────────────────────────────────────────────
  const planSpans = spansByLevel('plan', spans);

  // ── Runtime section data ─────────────────────────────────────────────────
  // Runtime blocks: each compiler span is a block root; children are sub-levels
  const compilerSpans = spansByLevel('compiler', spans);

  // ── Analytics section data ───────────────────────────────────────────────
  const summarySpans = spansByLevel('summary', spans);

  return (
    <div className={`flex flex-col bg-gray-950 text-gray-200 min-h-screen font-mono text-sm ${className}`}>

      {/* ── Editor view ──────────────────────────────────────────────────── */}
      <div className="border-b border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Editor</span>
          <span className="text-xs text-gray-600">dialect: {dialect || '—'}</span>
        </div>
        <pre className="bg-gray-900 rounded p-3 text-green-300 text-xs leading-relaxed whitespace-pre-wrap">
          {content || <span className="text-gray-600 italic">empty</span>}
        </pre>
        {errors.length > 0 && (
          <div className="mt-2 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="text-red-400 text-xs">⚠ {e}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── Phase indicator ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-800 bg-gray-900">
        <span className="text-xs text-gray-500">phase:</span>
        <span className="text-xs text-yellow-400 font-semibold">{phase}</span>
        <div className="flex-1" />
        {onRun && (phase === 'idle' || phase === 'compile_ready' || phase === 'plan_ready') && (
          <button
            onClick={onRun}
            className="text-xs px-3 py-1 rounded bg-green-800 hover:bg-green-700 text-green-200 transition-colors"
          >
            ▶ Run
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* ── Compile ────────────────────────────────────────────────────── */}
        <InspectorSection
          title="Compile"
          requiredPhase="compile_ready"
          currentPhase={phase}
          badge={`${parserSpans.length} line${parserSpans.length !== 1 ? 's' : ''}`}
        >
          {parserSpans.length === 0 ? (
            <p className="text-gray-600 text-xs italic">no parsed lines</p>
          ) : (
            <div className="space-y-3">
              {parserSpans.map(parserSpan => {
                // Collect this line's parser + dialect spans
                const dialectSpans = childSpans(parserSpan.spanId, spans)
                  .filter(s => s.level === 'dialect');
                const spanIds = [parserSpan.spanId, ...dialectSpans.map(s => s.spanId)];
                const rows = resolveMetricTable(spanIds, spans, entries, COMPILE_COLS);

                return (
                  <details key={parserSpan.spanId} className="group">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 py-1 list-none flex items-center gap-2">
                      <span className="text-gray-600 group-open:rotate-90 transition-transform inline-block">▶</span>
                      <span className="text-gray-300">{parserSpan.label ?? `Line ${parserSpan.spanId}`}</span>
                    </summary>
                    <div className="mt-2 ml-4">
                      <MetricTable rows={rows} columns={COMPILE_COLS} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </InspectorSection>

        {/* ── Plan ───────────────────────────────────────────────────────── */}
        <InspectorSection
          title="Plan"
          requiredPhase="plan_ready"
          currentPhase={phase}
          badge="pre-runtime estimates"
        >
          {planSpans.length === 0 ? (
            <p className="text-gray-600 text-xs italic">no plan predictions generated</p>
          ) : (
            <div className="space-y-3">
              {planSpans.map(planSpan => {
                const rows = resolveMetricTable([planSpan.spanId], spans, entries);
                return (
                  <details key={planSpan.spanId}>
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 py-1 list-none flex items-center gap-2">
                      <span>▶</span>
                      <span className="text-gray-300">{planSpan.label ?? planSpan.spanId}</span>
                    </summary>
                    <div className="mt-2 ml-4">
                      <MetricTable rows={rows} columns={['plan']} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </InspectorSection>

        {/* ── Runtime ────────────────────────────────────────────────────── */}
        <InspectorSection
          title="Runtime"
          requiredPhase="running"
          currentPhase={phase}
          badge={`${compilerSpans.length} block${compilerSpans.length !== 1 ? 's' : ''}`}
        >
          {compilerSpans.length === 0 ? (
            <p className="text-gray-600 text-xs italic">no runtime blocks reported</p>
          ) : (
            <div className="space-y-3">
              {compilerSpans.map(compilerSpan => {
                // Gather compiler + all child runtime spans for this block
                const children = childSpans(compilerSpan.spanId, spans);
                const spanIds = [compilerSpan.spanId, ...children.map(s => s.spanId)];
                const rows = resolveMetricTable(spanIds, spans, entries, RUNTIME_COLS);

                const duration = compilerSpan.startedAt && compilerSpan.endedAt
                  ? `${((compilerSpan.endedAt - compilerSpan.startedAt) / 1000).toFixed(1)}s`
                  : undefined;

                return (
                  <details key={compilerSpan.spanId}>
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 py-1 list-none flex items-center gap-2">
                      <span>▶</span>
                      <span className="text-gray-300">{compilerSpan.label ?? compilerSpan.spanId}</span>
                      {duration && <span className="text-gray-600">· {duration}</span>}
                    </summary>
                    <div className="mt-2 ml-4">
                      <MetricTable rows={rows} columns={RUNTIME_COLS} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </InspectorSection>

        {/* ── Analytics ──────────────────────────────────────────────────── */}
        <InspectorSection
          title="Analytics"
          requiredPhase="analytics_ready"
          currentPhase={phase}
          badge={`${engines.length} engine${engines.length !== 1 ? 's' : ''}`}
        >
          {/* Engine status badges */}
          {engines.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {engines.map(e => {
                const color =
                  e.status === 'pending' ? 'bg-gray-700 text-gray-400' :
                  e.status === 'running' ? 'bg-yellow-800 text-yellow-200' :
                  e.status === 'complete' ? 'bg-green-900 text-green-300' :
                  'bg-red-900 text-red-300';
                return (
                  <span key={e.engine.name} className={`text-xs px-2 py-1 rounded font-semibold ${color}`}>
                    {e.engine.name}
                    <span className="ml-1 font-normal opacity-70">· {e.status}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Summary spans (computed results) */}
          {summarySpans.length === 0 ? (
            <p className="text-gray-600 text-xs italic">no analytics results yet</p>
          ) : (
            <div className="space-y-3">
              {summarySpans.map(span => {
                const rows = resolveMetricTable([span.spanId], spans, entries);
                return (
                  <details key={span.spanId}>
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 py-1 list-none flex items-center gap-2">
                      <span>▶</span>
                      <span className="text-gray-300">{span.label ?? span.spanId}</span>
                    </summary>
                    <div className="mt-2 ml-4">
                      <MetricTable rows={rows} columns={['summary']} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </InspectorSection>

      </div>
    </div>
  );
};
