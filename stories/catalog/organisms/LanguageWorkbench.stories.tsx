/**
 * Catalog / Organisms / Language Workbench
 *
 * State-free language-development workbench:
 *  - a golden IR fixture file (fact-set envelope) is the only data source;
 *  - an in-memory FactQueryStore feeds the QueryService through the same
 *    injectable seam production IndexedDB uses — zero backend state;
 *  - a live CodeMirror WQL editor powered by `@bitcobblers/wod-wiki-ui`'s `editorPreset({ dialect: 'wql' })`
 *    re-runs the query in real-time and the dumb widgets re-render from the result;
 *  - a live CodeMirror Whiteboard editor powered by `@bitcobblers/wod-wiki-ui`'s `editorPreset({ dialect: 'whiteboard' })`
 *    parses on every keystroke, and a demo Language Pack registers/unregisters at runtime
 *    via `registerLanguagePack()` without Storybook restarts.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import fixture from '../../fixtures/golden/multi-week-journal.json';
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
} from '@bitcobblers/wod-wiki-engine';
import {
  editorPreset,
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
} from '@bitcobblers/wod-wiki-ui';

const meta: Meta = {
  title: 'Organisms/Language Workbench',
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

// ── The workbench ───────────────────────────────────────────────────────────

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
  statements: number;
  hints: string[];
  error?: string;
}

export function LanguageWorkbench() {
  const [wqlText, setWqlText] = useState(DEFAULT_WQL);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [packOn, setPackOn] = useState(false);
  const [parseNonce, setParseNonce] = useState(0);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [queryError, setQueryError] = useState<string | undefined>();

  const service = useMemo(
    () => new QueryService(inMemoryFactStore(fixture.data as never[])),
    [],
  );

  // WQL lane: re-run the query (debounced) as the editor changes.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const parsed = parseQuery(wqlText);
        if (parsed.error) { setQueryError(parsed.error); return; }
        if (isFindQuery(parsed) || isRowsQuery(parsed)) {
          setQueryError('Workbench lane runs aggregate queries — find/rows families stay on their own surfaces.');
          return;
        }
        // anchor `week` windows at the fixture's newest activity, not wall clock
        const newest = Math.max(...fixture.data.map((f) => f.timestamp));
        const r = await service.runQuery(wqlText, { rangeEnd: newest, preferredUnit: 'lb' });
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
      return { statements: script.statements.length, hints };
    } catch (e) {
      return { statements: 0, hints: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [scriptText, parseNonce]);

  const wqlHost = useRef<HTMLDivElement>(null);
  const scriptHost = useRef<HTMLDivElement>(null);
  useCodeMirror(wqlHost, DEFAULT_WQL, 'wql', setWqlText);
  useCodeMirror(scriptHost, DEFAULT_SCRIPT, 'whiteboard', setScriptText);

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
    };
  }, []);

  const groupCount = result?.parsed.groupBy.length ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="language-workbench">
      {/* Parse lane */}
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
        <p className="text-[11px] text-muted-foreground">
          Fixture: <code>stories/fixtures/golden/multi-week-journal.json</code> — 40 fact
          rows, 4 weeks × Fran / 5k run / S&amp;S. The demo pack adds a{' '}
          <code>demo.pack</code> hint to any statement mentioning “benchmark” —
          registered at runtime, no restart.
        </p>
      </section>

      {/* Query lane */}
      <section className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">WQL — live query over the golden fixture</h3>
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
                {result.series.length > 3
                  ? <TopList result={result} limit={6} />
                  : <WqlBars result={result} />}
              </WidgetFrame>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export const Workbench: Story = {
  render: () => <LanguageWorkbench />,
};
