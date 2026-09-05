/**
 * Side-loaded parser test runner (ParserTests/Runner stories).
 *
 * Fetches a {@link ParserTestFile} JSON from `jsonPath` (served from
 * `apps/storybook/public/parser-tests/`), runs every case through
 * `runFile`, and reports each case as a passing line or a git-style diff
 * (see {@link DiffView}). Template component: new stories point `jsonPath`
 * at different datasets.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Play, XCircle } from 'lucide-react';
import { runFile, type CaseResult } from './runnerCore';
import { DiffView } from './DiffView';
import type { ParserTestFile } from './types';

export interface ParserTestRunnerProps {
  /** URL/path of the test JSON, resolved against the storybook origin. */
  jsonPath: string;
  /** Heading override; defaults to the file's `title`. */
  title?: string;
  'data-testid'?: string;
}

interface LoadState {
  file: ParserTestFile | null;
  results: CaseResult[];
  error: string | null;
  loading: boolean;
}

export function ParserTestRunner({
  jsonPath,
  title,
  'data-testid': testId = 'parser-test-runner',
}: ParserTestRunnerProps) {
  const [state, setState] = useState<LoadState>({
    file: null,
    results: [],
    error: null,
    loading: true,
  });
  const [reloadNonce, setReloadNonce] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetch(new URL(jsonPath, document.baseURI).toString(), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${jsonPath}`);
        return res.json() as Promise<ParserTestFile>;
      })
      .then((file) => {
        const results = runFile(file);
        setState({ file, results, error: null, loading: false });
        const initialExpanded: Record<string, boolean> = {};
        for (const result of results) {
          if (result.status === 'fail') initialExpanded[result.name] = true;
        }
        setExpanded(initialExpanded);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        }));
      });
    return () => controller.abort();
  }, [jsonPath, reloadNonce]);

  const toggle = useCallback((name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const passed = state.results.filter((r) => r.status === 'pass').length;
  const heading = title ?? state.file?.title ?? jsonPath;

  return (
    <div className="space-y-3 p-4 text-slate-900 dark:text-slate-100" data-testid={testId}>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{heading}</h2>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{jsonPath}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
            state.results.length > 0 && passed === state.results.length
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/15 text-red-700 dark:text-red-300'
          }`}
          data-testid="runner-summary"
        >
          {passed}/{state.results.length} passed
        </span>
        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          className="flex items-center gap-1 rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          data-testid="runner-rerun"
        >
          <Play size={12} />
          Run
        </button>
      </div>

      {state.loading && <div className="text-xs text-slate-500 dark:text-slate-400">Loading {jsonPath}…</div>}
      {state.error && (
        <div className="rounded bg-red-500/10 px-2 py-1.5 font-mono text-xs text-red-700 dark:text-red-300" data-testid="runner-error">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        {state.results.map((result) => {
          const open = expanded[result.name] ?? false;
          const failed =
            result.statements.filter((s) => s.status === 'fail').length +
            result.missingStatements.length +
            result.extraStatements.length;
          return (
            <div
              key={result.name}
              className="rounded border border-slate-200 dark:border-slate-700"
              data-testid={`runner-case-${result.name}`}
            >
              <button
                type="button"
                onClick={() => toggle(result.name)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                {result.status === 'pass' ? (
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle size={14} className="shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span className="font-medium">{result.name}</span>
                <span className="ml-auto text-slate-500 dark:text-slate-400">
                  {result.status === 'pass'
                    ? `${result.statements.length} statement${result.statements.length === 1 ? '' : 's'} match`
                    : `${failed} diff${failed === 1 ? '' : 's'}`}
                </span>
              </button>
              {open && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                  <DiffView result={result} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
