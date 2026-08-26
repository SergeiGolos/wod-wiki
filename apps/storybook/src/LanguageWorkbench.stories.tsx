/**
 * Language Workbench — State-free Storybook Workbench with Debug Panel (ticket 003, 009)
 *
 * Interactive development and validation workbench:
 *  - Dual CodeMirror editors (Whiteboard Script + WQL) powered by `@bitcobblers/wod-wiki-ui` presets;
 *  - Live keystroke parsing with Statement tree, Metrics, and Hints inspection;
 *  - Live wall-clock runtime execution driven by `useRuntimeExecution` with `RuntimeFactory(debugMode: true)`;
 *  - 2×2 Debug Panel Grid:
 *      1. Parser statements & metrics
 *      2. Runtime stack & execution controls
 *      3. Block memory map
 *      4. Streaming output logs
 *  - Dynamic Language Pack registration at runtime;
 *  - Live WQL query evaluation and visualization.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import fixture from '../fixtures/golden/multi-week-journal.json';
import {
  QueryService,
  parseQuery,
  isFindQuery,
  isRowsQuery,
  type QueryResult,
  inMemoryFactStore,
  createParser,
  getHints,
  hintsToContainer,
  defineLanguagePack,
  registerLanguagePack,
  unregisterLanguagePack,
  type IDialect,
  type ICodeStatement,
  type DialectAnalysis,
  type LanguagePack,
  type IScript,
  type IMetric,
  type IScriptRuntime,
  type IRuntimeBlock,
  type IOutputStatement,
  createCompiler,
  RuntimeFactory,
  ScriptRuntimeProvider,
  useRuntimeExecution,
  useStackSnapshot,
  useOutputStatements,
} from '@bitcobblers/wod-wiki-engine';
import type { ScriptBlock } from '@bitcobblers/wod-wiki-core';
import {
  editorPreset,
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
} from '@bitcobblers/wod-wiki-ui';
import { VERSION, GIT_SHA, BUILD_TIME } from './version';

const meta: Meta = {
  title: 'Workbench/Language Workbench',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

// ── Demo Language Pack (runtime registration proof) ────────────────────────

const DEMO_PACK_ID = 'demo-pack';

/** Emits a `demo.pack` hint on any statement whose source mentions "benchmark". */
class DemoPackDialect implements IDialect {
  id = DEMO_PACK_ID;
  name = 'Demo Pack';
  priority = 10;
  analyze(statement: ICodeStatement): DialectAnalysis {
    const raw = (statement.meta as { raw?: string })?.raw ?? '';
    if (/benchmark/i.test(raw)) {
      return { metrics: hintsToContainer(['demo.pack']) };
    }
    return {};
  }
}

const demoPack: LanguagePack = defineLanguagePack({
  identity: {
    id: DEMO_PACK_ID,
    name: 'Demo Pack',
  },
  lang: {
    analyzer: new DemoPackDialect(),
  },
});

// ── Dual CodeMirror Mounting using @bitcobblers/wod-wiki-ui editorPreset ───────────────

function useCodeMirror(
  host: React.RefObject<HTMLDivElement | null>,
  doc: string,
  dialect: 'wql' | 'whiteboard',
  onChange: (next: string) => void,
): void {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [
          ...editorPreset({ dialect }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current(u.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialect]);
}

// ── Preset Queries & Initial Script ─────────────────────────────────────────

const PRESETS = [
  'sum:totalVolume{} by {week}',
  'avg:tis{}',
  'sum:sessionLoad{} by {discipline}',
  'sum:distance{} by {week}',
];

const DEFAULT_WQL = PRESETS[0];
const DEFAULT_SCRIPT = [
  '// benchmark: Fran',
  '(21-15-9)',
  '  Thrusters @95lb',
  '  Pull-ups',
].join('\n');

export interface ParseStats {
  script?: IScript;
  statements: number;
  hints: string[];
  error?: string;
}

function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

// ── Sub-panels for the 2×2 Debug Grid ───────────────────────────────────────

/** Panel 1: Parser statements, metrics, and hints */
function ParserPanel({ script, error }: { script?: IScript; error?: string }) {
  const statements = script?.statements ?? [];
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-parser"
    >
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          1. Parser Statements &amp; Metrics
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {statements.length} statement{statements.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {statements.length === 0 && !error && (
        <p className="py-4 text-center text-xs text-muted-foreground">No parsed statements.</p>
      )}

      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 font-mono text-xs pr-1">
        {statements.map((stmt, idx) => {
          const raw = (stmt.meta as { raw?: string })?.raw ?? '';
          const metrics: IMetric[] = [...stmt.metrics];
          const hints = getHints(stmt);

          return (
            <div
              key={stmt.id ?? idx}
              className="rounded border border-border/60 bg-background/50 p-2 text-[11px]"
              data-testid={`parsed-statement-${idx}`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="font-semibold text-primary">
                  Statement #{stmt.id ?? idx + 1} (Line {stmt.line ?? '?'})
                </span>
                {raw && <span className="truncate max-w-[200px] text-[10px] text-foreground/80">{raw}</span>}
              </div>

              {metrics.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {metrics.map((m, mIdx) => {
                    const type = String(m.type);
                    const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '');
                    return (
                      <span
                        key={mIdx}
                        className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                        title={`origin: ${m.origin}`}
                      >
                        <span className="text-foreground font-medium">{type}</span>
                        {valStr && <span className="text-muted-foreground">: {valStr}</span>}
                        {m.unit && <span className="text-accent-foreground font-mono"> {m.unit}</span>}
                        <span className="text-[9px] text-muted-foreground/70 ml-1">@{m.origin}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {hints.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px] text-primary/80">
                  <span className="text-muted-foreground font-sans text-[9px]">hints:</span>
                  {hints.map((h, hIdx) => (
                    <span key={hIdx} className="rounded bg-primary/10 px-1 text-primary">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RuntimeControlsProps {
  status: string;
  elapsedTime: number;
  stepCount: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onStep: () => void;
  isDirty: boolean;
  canStep: boolean;
}

function RuntimeControlsView({
  status,
  elapsedTime,
  stepCount,
  onStart,
  onPause,
  onStop,
  onReset,
  onStep,
  isDirty,
  canStep,
}: RuntimeControlsProps) {
  const statusColor: Record<string, string> = {
    idle: 'bg-muted text-muted-foreground border-border',
    running: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    paused: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    completed: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div className="flex items-center justify-between border-b border-border pb-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
        2. Runtime Stack &amp; Controls
      </h4>
      <div className="flex items-center gap-2">
        {isDirty && status !== 'idle' && (
          <span
            className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-500/40 animate-pulse"
            data-testid="dirty-badge"
          >
            ⚠️ script changed — re-run
          </span>
        )}
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            statusColor[status] || statusColor.idle
          }`}
          data-testid="execution-status"
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function ControlsToolbar({
  status,
  elapsedTime,
  stepCount,
  onStart,
  onPause,
  onStop,
  onReset,
  onStep,
  canStep,
}: RuntimeControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 bg-background/50 p-2 text-xs">
      <div className="flex items-center gap-1 font-mono text-sm">
        <span className="text-muted-foreground text-xs">time:</span>
        <span className="font-semibold text-foreground" data-testid="elapsed-time">
          {formatDurationMs(elapsedTime)}
        </span>
        <span className="text-[10px] text-muted-foreground ml-2">({stepCount} ticks)</span>
      </div>

      <div className="flex items-center gap-1">
        {status === 'running' ? (
          <button
            onClick={onPause}
            data-testid="btn-pause"
            className="rounded border border-border px-2 py-1 text-xs font-medium hover:bg-accent cursor-pointer"
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            onClick={onStart}
            data-testid="btn-start"
            className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            {status === 'paused' ? '▶ Resume' : status === 'idle' ? '▶ Run Workout' : '↺ Re-run'}
          </button>
        )}

        <button
          onClick={onStep}
          disabled={!canStep || status === 'completed'}
          data-testid="btn-step"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40 cursor-pointer"
        >
          ⏭ Step
        </button>

        <button
          onClick={onStop}
          disabled={status === 'idle'}
          data-testid="btn-stop"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40 cursor-pointer"
        >
          ⏹ Stop
        </button>

        <button
          onClick={onReset}
          disabled={status === 'idle'}
          data-testid="btn-reset"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40 cursor-pointer"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

/** Active Stack Panel subscribed via useStackSnapshot() inside provider */
function ActiveStackPanel(props: RuntimeControlsProps) {
  const snapshot = useStackSnapshot();
  const blocks = snapshot.blocks ?? [];

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-stack"
    >
      <RuntimeControlsView {...props} />
      <ControlsToolbar {...props} />

      <div className="max-h-52 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-1">
        {blocks.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Stack empty.</p>
        ) : (
          blocks.map((b: IRuntimeBlock, idx: number) => {
            const isTop = idx === blocks.length - 1;
            return (
              <div
                key={b.key?.toString() || idx}
                className={`flex items-center justify-between rounded border p-1.5 text-[11px] ${
                  isTop ? 'border-primary/60 bg-primary/5 font-medium' : 'border-border/50 bg-background/40'
                }`}
                data-testid={`stack-block-${idx}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                  <span className="text-foreground">{b.label}</span>
                  <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{b.blockType || 'block'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {b.isComplete && <span className="text-[10px] text-blue-500">✓ complete</span>}
                  {isTop && <span className="rounded bg-primary/20 px-1 text-[9px] text-primary">active</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Idle Stack Panel when no runtime is running */
function IdleStackPanel(props: RuntimeControlsProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-stack"
    >
      <RuntimeControlsView {...props} />
      <ControlsToolbar {...props} />
      <div className="py-6 text-center text-xs text-muted-foreground">
        Click <strong className="text-foreground">▶ Run Workout</strong> to start runtime execution.
      </div>
    </div>
  );
}

/** Active Memory Panel inside Provider */
function ActiveMemoryPanel() {
  const snapshot = useStackSnapshot();
  const blocks = snapshot.blocks ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const activeBlock: IRuntimeBlock | undefined = blocks[selectedIdx] ?? blocks[blocks.length - 1];

  const allMemory: IMetric[] = useMemo(() => {
    if (!activeBlock?.getAllMemory) return [];
    try {
      return activeBlock.getAllMemory() ?? [];
    } catch {
      return [];
    }
  }, [activeBlock]);

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-memory"
    >
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          3. Block Memory Map
        </h4>
        {blocks.length > 0 && (
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground font-mono"
            data-testid="memory-block-select"
          >
            {blocks.map((b: IRuntimeBlock, idx: number) => (
              <option key={b.key?.toString() || idx} value={idx}>
                #{idx + 1}: {b.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {!activeBlock ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No active runtime block.</p>
      ) : allMemory.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No memory entries on selected block.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 font-mono text-xs pr-1">
          {allMemory.map((m, idx) => {
            const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '');
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded border border-border/50 bg-background/50 p-1.5 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{String(m.type)}</span>
                  <span className="text-muted-foreground">: {valStr}</span>
                  {m.unit && <span className="text-accent-foreground font-mono">{m.unit}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">@{m.origin}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IdleMemoryPanel() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-memory"
    >
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          3. Block Memory Map
        </h4>
      </div>
      <p className="py-6 text-center text-xs text-muted-foreground">
        No active runtime block.
      </p>
    </div>
  );
}

/** Active Logs Panel inside Provider */
function ActiveLogsPanel() {
  const { outputs } = useOutputStatements();

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-logs"
    >
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          4. Output Log Stream
        </h4>
        <span className="text-[11px] text-muted-foreground" data-testid="output-log-count">
          {outputs.length} statement{outputs.length === 1 ? '' : 's'}
        </span>
      </div>

      {outputs.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No emitted output statements.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-1">
          {outputs.slice(-200).map((out: IOutputStatement, idx: number) => {
            const metricsStr = out.metrics
              ?.map((m) => `${String(m.type)}:${typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '')}`)
              .join(' ') ?? '';

            return (
              <div
                key={idx}
                className="rounded border border-border/40 bg-background/40 p-1.5 text-[11px]"
                data-testid={`log-statement-${idx}`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span className="text-primary font-medium">[{out.type}]</span>
                  <span>{out.sourceBlockKey || 'session'}</span>
                </div>
                {metricsStr && <p className="text-foreground/90">{metricsStr}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IdleLogsPanel() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3"
      data-testid="panel-logs"
    >
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          4. Output Log Stream
        </h4>
      </div>
      <p className="py-6 text-center text-xs text-muted-foreground">
        No emitted output statements.
      </p>
    </div>
  );
}

// ── Inside Provider Shell to bind RuntimeContext ───────────────────────────

function ActiveDebugGrid({
  script,
  parseError,
  controlsProps,
}: {
  script?: IScript;
  parseError?: string;
  controlsProps: RuntimeControlsProps;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="debug-panel-grid">
      <ParserPanel script={script} error={parseError} />
      <ActiveStackPanel {...controlsProps} />
      <ActiveMemoryPanel />
      <ActiveLogsPanel />
    </div>
  );
}

function IdleDebugGrid({
  script,
  parseError,
  controlsProps,
}: {
  script?: IScript;
  parseError?: string;
  controlsProps: RuntimeControlsProps;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="debug-panel-grid">
      <ParserPanel script={script} error={parseError} />
      <IdleStackPanel {...controlsProps} />
      <IdleMemoryPanel />
      <IdleLogsPanel />
    </div>
  );
}

// ── Main LanguageWorkbench Component ────────────────────────────────────────

export function LanguageWorkbench() {
  const [wqlText, setWqlText] = useState(DEFAULT_WQL);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [packOn, setPackOn] = useState(false);
  const [parseNonce, setParseNonce] = useState(0);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [queryError, setQueryError] = useState<string | undefined>();

  // Runtime lifecycle state
  const [runtime, setRuntime] = useState<IScriptRuntime | null>(null);
  const [runSnapshot, setRunSnapshot] = useState<string>('');
  const factoryRef = useRef<RuntimeFactory | null>(null);

  if (!factoryRef.current) {
    factoryRef.current = new RuntimeFactory(createCompiler());
  }

  const execution = useRuntimeExecution(runtime);

  const service = useMemo(
    () => new QueryService(inMemoryFactStore(fixture.data as never[])),
    [],
  );

  // WQL lane: re-run the query (debounced) as the editor changes.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const parsed = parseQuery(wqlText);
        if (parsed.error) {
          setQueryError(parsed.error);
          return;
        }
        if (isFindQuery(parsed) || isRowsQuery(parsed)) {
          setQueryError('Workbench lane runs aggregate queries — find/rows families stay on their own surfaces.');
          return;
        }
        const newest = Math.max(...fixture.data.map((f) => f.timestamp));
        const r = await service.run(parsed, { rangeEnd: newest, preferredUnit: 'lb' });
        setResult(r);
        setQueryError(undefined);
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : String(e));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [wqlText, service]);

  // Whiteboard lane: parse on every keystroke (and on pack registration).
  const parse: ParseStats = useMemo(() => {
    void parseNonce;
    try {
      const script = createParser().read(scriptText);
      const hints = script.statements.flatMap((s) => getHints(s));
      return { script, statements: script.statements.length, hints };
    } catch (e) {
      return { statements: 0, hints: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [scriptText, parseNonce]);

  const wqlHost = useRef<HTMLDivElement>(null);
  const scriptHost = useRef<HTMLDivElement>(null);
  useCodeMirror(wqlHost, DEFAULT_WQL, 'wql', setWqlText);
  useCodeMirror(scriptHost, DEFAULT_SCRIPT, 'whiteboard', setScriptText);

  // Runtime Lifecycle Actions
  const handleStartWorkout = () => {
    const factory = factoryRef.current!;
    if (runtime) {
      factory.disposeRuntime(runtime);
    }
    const currentScript = parse.script;
    if (!currentScript || currentScript.statements.length === 0) return;

    const block: ScriptBlock = {
      content: scriptText,
      statements: currentScript.statements,
    };

    const newRuntime = factory.createRuntime(block, { debugMode: true });
    if (newRuntime) {
      setRuntime(newRuntime);
      setRunSnapshot(scriptText);
      setTimeout(() => {
        execution.start();
      }, 0);
    }
  };

  const handleStopWorkout = () => {
    execution.stop();
    if (runtime && factoryRef.current) {
      factoryRef.current.disposeRuntime(runtime);
      setRuntime(null);
    }
  };

  const handleResetWorkout = () => {
    execution.reset();
  };

  const togglePack = () => {
    if (packOn) {
      unregisterLanguagePack(demoPack);
    } else {
      registerLanguagePack(demoPack);
    }
    setPackOn(!packOn);
    setParseNonce((n) => n + 1); // re-parse immediately under the new stack
  };

  useEffect(() => {
    return () => {
      unregisterLanguagePack(demoPack);
      if (runtime && factoryRef.current) {
        factoryRef.current.disposeRuntime(runtime);
      }
    };
  }, [runtime]);

  const groupCount = result?.parsed.groupBy.length ?? 0;
  const isDirty = Boolean(runSnapshot && scriptText !== runSnapshot);

  const controlsProps: RuntimeControlsProps = {
    status: execution.status,
    elapsedTime: execution.elapsedTime,
    stepCount: execution.stepCount,
    onStart: handleStartWorkout,
    onPause: execution.pause,
    onStop: handleStopWorkout,
    onReset: handleResetWorkout,
    onStep: execution.step,
    isDirty,
    canStep: Boolean(runtime),
  };

  return (
    <div className="flex flex-col gap-6" data-testid="language-workbench">
      <div>
        <p className="text-xs text-muted-foreground" data-testid="workbench-version">
          @bitcobblers/wod-wiki-engine {VERSION} · {GIT_SHA.slice(0, 7)} · built {BUILD_TIME.slice(0, 10)}
        </p>
      </div>

      {/* Top row: 2-lane Editors */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Whiteboard Script — live parse</h3>
            <button
              onClick={togglePack}
              data-testid="toggle-demo-pack"
              className={`rounded-md border px-2 py-1 text-xs cursor-pointer transition-colors ${
                packOn
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              {packOn ? '✓ demo pack registered' : 'register demo pack'}
            </button>
          </header>

          <div ref={scriptHost} data-testid="script-editor-host" />

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">statements</dt>
              <dd className="text-lg font-semibold text-foreground" data-testid="statement-count">
                {parse.statements}
              </dd>
            </div>
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">hints</dt>
              <dd className="text-lg font-semibold text-foreground" data-testid="hint-count">
                {parse.hints.length}
              </dd>
            </div>
            <div className="rounded-md border border-border p-2 overflow-auto max-h-20">
              <dt className="text-muted-foreground">hint keys</dt>
              <dd className="font-mono text-[11px] leading-tight text-foreground" data-testid="hint-keys">
                {parse.hints.length ? parse.hints.join(', ') : '—'}
              </dd>
            </div>
          </dl>
          {parse.error && <p className="text-xs text-destructive">{parse.error}</p>}
        </section>

        {/* Query lane */}
        <section className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">WQL — live query</h3>
          <div ref={wqlHost} data-testid="wql-editor-host" />
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setWqlText(p)}
                data-testid={`preset-${p.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-foreground hover:bg-accent cursor-pointer transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          {queryError && <p className="text-xs text-destructive">{queryError}</p>}
          {result && !queryError && (
            <div className="h-56" data-testid="wql-result-widget">
              {groupCount === 0 ? (
                <WidgetFrame title="Scalar" question="What total?" query={wqlText}>
                  <QueryValue result={result} label="from fixture" />
                </WidgetFrame>
              ) : groupCount === 1 && result.parsed.groupBy[0] === 'week' ? (
                <WidgetFrame title="Trend" question="Rising?" query={wqlText}>
                  <WqlTimeseries result={result} />
                </WidgetFrame>
              ) : (
                <WidgetFrame title="Breakdown" question="Which group?" query={wqlText}>
                  {result.series.length > 3 ? (
                    <TopList result={result} limit={6} />
                  ) : (
                    <WqlBars result={result} />
                  )}
                </WidgetFrame>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Bottom section: 2×2 Debug Panel Grid */}
      {runtime ? (
        <ScriptRuntimeProvider runtime={runtime}>
          <ActiveDebugGrid
            script={parse.script}
            parseError={parse.error}
            controlsProps={controlsProps}
          />
        </ScriptRuntimeProvider>
      ) : (
        <IdleDebugGrid
          script={parse.script}
          parseError={parse.error}
          controlsProps={controlsProps}
        />
      )}
    </div>
  );
}

export const Workbench: Story = {
  render: () => <LanguageWorkbench />,
};
