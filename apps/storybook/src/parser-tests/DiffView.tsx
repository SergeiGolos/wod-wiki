/**
 * Git-change-style renderer for a {@link CaseResult}: green `+` lines are
 * expected metrics the parser did not produce, red `−` lines are actual
 * metrics that were not expected, dim lines are matched context. The runner
 * story and the builder's live preview share this renderer, so what the
 * builder saves is exactly what the runner diffs.
 */

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CaseResult, DiffEntry } from './runnerCore';

const ENTRY_CLASS: Record<DiffEntry['kind'], { sign: string; row: string }> = {
  match: { sign: ' ', row: 'text-slate-500 dark:text-slate-400' },
  'missing-expected': {
    sign: '+',
    row: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  'extra-actual': {
    sign: '−',
    row: 'bg-red-500/10 text-red-700 dark:text-red-300',
  },
};

function DiffRow({ entry }: { entry: DiffEntry }) {
  const cls = ENTRY_CLASS[entry.kind];
  return (
    <div className={`flex gap-2 px-2 py-px font-mono text-xs ${cls.row}`}>
      <span className="w-3 shrink-0 select-none text-center">{cls.sign}</span>
      <span className="whitespace-pre-wrap">{entry.dsl}</span>
    </div>
  );
}

function StatementBlock({
  header,
  diff,
}: {
  header: string;
  diff: CaseResult['statements'][number];
}) {
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {header}
      </div>
      {diff.entries.map((entry, i) => (
        <DiffRow key={i} entry={entry} />
      ))}
    </div>
  );
}

export function DiffView({ result }: { result: CaseResult }) {
  if (result.thrown) {
    return (
      <div
        className="flex items-center gap-2 rounded bg-red-500/10 px-2 py-1.5 text-xs text-red-700 dark:text-red-300"
        data-testid="diff-thrown"
      >
        <AlertTriangle size={13} className="shrink-0" />
        <span className="font-mono">{result.thrown}</span>
      </div>
    );
  }

  if (result.errors.length > 0) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Parse errors — {result.status}
        </div>
        {result.errors.map((entry, i) => (
          <DiffRow key={i} entry={entry} />
        ))}
      </div>
    );
  }

  const hasDiff =
    result.statements.some((s) => s.status === 'fail') ||
    result.missingStatements.length > 0 ||
    result.extraStatements.length > 0;

  return (
    <div className="space-y-1.5">
      {!hasDiff && (
        <div
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          data-testid="diff-all-pass"
        >
          <CheckCircle2 size={13} />
          {result.statements.length} statement{result.statements.length === 1 ? '' : 's'} match
        </div>
      )}
      {result.statements.map((diff, i) => (
        <StatementBlock key={`s-${i}`} header={`Line ${diff.line}${diff.text ? `: ${diff.text}` : ''}`} diff={diff} />
      ))}
      {result.missingStatements.map((diff, i) => (
        <StatementBlock key={`m-${i}`} header={`Line ${diff.line}: statement missing`} diff={diff} />
      ))}
      {result.extraStatements.map((diff, i) => (
        <StatementBlock
          key={`x-${i}`}
          header={`Line ${diff.line}${diff.text ? `: ${diff.text}` : ''} (not in Expected)`}
          diff={diff}
        />
      ))}
    </div>
  );
}
