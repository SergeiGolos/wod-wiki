/**
 * PROTOTYPE — throwaway. Ticket #943 (wayfinder map #941).
 *
 * Question: how do the two locked interactions sit on the session results
 * table (the rows:{…} query:table view)?
 *   1. Widen toggle — ephemeral "This session" ↔ "All versions of this block".
 *   2. Inline RPE capture — replaces PostWorkoutRpePrompt at completion.
 *
 * Three structurally different variants of the widget chrome, switchable via
 * ?v=header|footer|rows or the bottom bar (← →). Fixture rows mimic a Fran
 * result (3 rounds) plus two prior runs of the same Block Content Id.
 * State is in-memory only; nothing persists. Delete after the decision lands.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// ─── Fixture ────────────────────────────────────────────────────

interface Row { round: string; effort: string; reps: number; load: string; split: string }
interface Run { id: string; label: string; date: string; time: string; rpe: number | null; rows: Row[]; current?: boolean }

const FRAN_ROWS: Row[] = [
  { round: 'Rd 1', effort: 'Thruster', reps: 21, load: '95 lb', split: '1:12' },
  { round: 'Rd 1', effort: 'Pull-up', reps: 21, load: 'bw', split: '1:04' },
  { round: 'Rd 2', effort: 'Thruster', reps: 15, load: '95 lb', split: '1:31' },
  { round: 'Rd 2', effort: 'Pull-up', reps: 15, load: 'bw', split: '1:22' },
  { round: 'Rd 3', effort: 'Thruster', reps: 9, load: '95 lb', split: '0:58' },
  { round: 'Rd 3', effort: 'Pull-up', reps: 9, load: 'bw', split: '0:47' },
];

const RUNS: Run[] = [
  { id: 'r3', label: 'Today', date: 'Aug 9', time: '4:52', rpe: null, rows: FRAN_ROWS, current: true },
  {
    id: 'r2', label: 'Jul 26', date: 'Jul 26', time: '5:31', rpe: 8,
    rows: FRAN_ROWS.map((r, i) => ({ ...r, split: ['1:20', '1:15', '1:44', '1:30', '1:05', '0:55'][i]! })),
  },
  {
    id: 'r1', label: 'Jun 14', date: 'Jun 14', time: '6:08', rpe: 9,
    rows: FRAN_ROWS.map((r, i) => ({ ...r, split: ['1:28', '1:21', '1:58', '1:41', '1:12', '1:02'][i]! })),
  },
];

const HEADERS = ['Round', 'Effort', 'Reps', 'Load', 'Split'];

// ─── Shared bits ────────────────────────────────────────────────

function RpeScale({ value, onPick, compact }: { value: number | null; onPick: (n: number) => void; compact?: boolean }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onPick(n)}
          className={`${compact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[11px]'} rounded border font-mono transition-colors ${
            value === n
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground'
          }`}
        >
          {n}
        </button>
      ))}
    </span>
  );
}

function DataTable({ runs, runPrefix }: { runs: Run[]; runPrefix?: (run: Run) => React.ReactNode }) {
  return (
    <table className="w-full text-[12px] font-mono">
      <thead>
        <tr className="text-left text-muted-foreground border-b border-border">
          {HEADERS.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <>
            {runPrefix?.(run)}
            {run.rows.map((r, i) => (
              <tr key={`${run.id}-${i}`} className="border-b border-border/40 last:border-0">
                <td className="py-1 pr-3 text-muted-foreground">{r.round}</td>
                <td className="py-1 pr-3">{r.effort}</td>
                <td className="py-1 pr-3 text-right">{r.reps}</td>
                <td className="py-1 pr-3 text-right">{r.load}</td>
                <td className="py-1 pr-3 text-right">{r.split}</td>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

/** Fake note context so the widget butts against realistic surroundings. */
function NoteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-bold mb-1">Fran — Saturday throwdown</h1>
      <p className="text-sm text-muted-foreground mb-4">21-15-9, thrusters and pull-ups. Go unbroken as long as possible.</p>
      <pre className="text-[12px] font-mono bg-muted/40 border border-border rounded-md p-3 mb-4 text-muted-foreground">```wod{'\n'}21-15-9{'\n'}  Thruster 95lb{'\n'}  Pull-ups{'\n'}```</pre>
      {children}
      <p className="text-sm text-muted-foreground mt-4">Felt the grip go on round 2. Compare with July next time.</p>
    </div>
  );
}

// ─── Variant A — chrome header ──────────────────────────────────
// Card chrome owns both interactions: segmented widen control top-right,
// RPE as a header chip that expands into the 1–10 scale in place.

function VariantHeader() {
  const [wide, setWide] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [rpeOpen, setRpeOpen] = useState(false);
  const runs = wide ? RUNS : RUNS.filter((r) => r.current);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold">Session results</span>
        <code className="text-[10px] text-muted-foreground">rows:{wide ? '{block:fran}' : '{result:r3}'}</code>
        <span className="flex-1" />
        <span className="flex rounded-md border border-border overflow-hidden text-[11px]">
          {(['This session', 'All versions'] as const).map((label, i) => (
            <button
              key={label}
              onClick={() => setWide(i === 1)}
              className={`px-2 py-0.5 ${ (i === 1) === wide ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </span>
        {wide ? null : rpe !== null && !rpeOpen ? (
          <button onClick={() => setRpeOpen(true)} className="text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground">
            RPE {rpe}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            RPE <RpeScale compact value={rpe} onPick={(n) => { setRpe(n); setRpeOpen(false); }} />
          </span>
        )}
      </div>
      <div className="p-3">
        <DataTable
          runs={runs}
          runPrefix={wide ? (run) => (
            <tr key={run.id} className="bg-muted/40">
              <td colSpan={5} className="py-1 px-1 text-[11px] font-semibold">
                {run.date} — {run.time} {run.current && <span className="text-primary">· this session</span>}
                <span className="float-right text-muted-foreground font-normal">RPE {run.current ? (rpe ?? '—') : (run.rpe ?? '—')}</span>
              </td>
            </tr>
          ) : undefined}
        />
      </div>
    </div>
  );
}

// ─── Variant B — footer strip ───────────────────────────────────
// The table stays bare data. A footer strip under it holds a text toggle
// and the RPE prompt; widened mode adds a leading Run column, no sections.

function VariantFooter() {
  const [wide, setWide] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const runs = wide ? RUNS : RUNS.filter((r) => r.current);

  return (
    <div>
      <table className="w-full text-[12px] font-mono border border-border rounded-lg">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            {wide && <th className="py-1 px-2 font-medium">Run</th>}
            {HEADERS.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {runs.flatMap((run) =>
            run.rows.map((r, i) => (
              <tr key={`${run.id}-${i}`} className={`border-b border-border/40 ${run.current && wide ? 'bg-primary/5' : ''}`}>
                {wide && (
                  <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">
                    {i === 0 ? <>{run.date} <span className="text-foreground">{run.time}</span></> : ''}
                  </td>
                )}
                <td className="py-1 pr-3 text-muted-foreground">{r.round}</td>
                <td className="py-1 pr-3">{r.effort}</td>
                <td className="py-1 pr-3 text-right">{r.reps}</td>
                <td className="py-1 pr-3 text-right">{r.load}</td>
                <td className="py-1 pr-3 text-right">{r.split}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-2 text-[12px]">
        <button onClick={() => setWide((w) => !w)} className="text-primary hover:underline">
          {wide ? '‹ Back to this session' : 'Compare all 3 versions ›'}
        </button>
        <span className="text-border">|</span>
        {rpe === null ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            How hard was it? <RpeScale compact value={rpe} onPick={setRpe} />
          </span>
        ) : (
          <span className="text-muted-foreground">
            RPE <span className="text-foreground font-semibold">{rpe}</span>
            <button onClick={() => setRpe(null)} className="ml-1.5 text-primary hover:underline">edit</button>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Variant C — row-native spreadsheet ─────────────────────────
// No chrome at all. Widen is an icon in the header row; RPE is the last
// table row (a data row you edit). Widened: each run is a section whose
// subheader carries its own RPE cell.

function VariantRows() {
  const [wide, setWide] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const runs = wide ? RUNS : RUNS.filter((r) => r.current);

  return (
    <table className="w-full text-[12px] font-mono border-y border-border">
      <thead>
        <tr className="text-left text-muted-foreground border-b border-border">
          {HEADERS.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}
          <th className="py-1 w-8">
            <button
              title={wide ? 'This session only' : 'Include previous versions'}
              onClick={() => setWide((w) => !w)}
              className={`w-6 h-6 rounded border text-[11px] ${wide ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              ⇄
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <>
            {wide && (
              <tr key={run.id} className="bg-muted/40 border-b border-border/60">
                <td colSpan={6} className="py-1 text-[11px] font-semibold">
                  {run.date} — {run.time}
                </td>
              </tr>
            )}
            {run.rows.map((r, i) => (
              <tr key={`${run.id}-${i}`} className="border-b border-border/40">
                <td className="py-1 pr-3 text-muted-foreground">{r.round}</td>
                <td className="py-1 pr-3">{r.effort}</td>
                <td className="py-1 pr-3 text-right">{r.reps}</td>
                <td className="py-1 pr-3 text-right">{r.load}</td>
                <td className="py-1 pr-3 text-right">{r.split}</td>
                <td />
              </tr>
            ))}
            <tr key={`${run.id}-rpe`} className="border-b border-border/60 text-muted-foreground">
              <td className="py-1 pr-3 text-[11px] uppercase tracking-wide">RPE</td>
              <td colSpan={5} className="py-1">
                {run.current ? (
                  <RpeScale compact value={rpe} onPick={setRpe} />
                ) : (
                  <span className="text-foreground">{run.rpe ?? '—'}</span>
                )}
              </td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page + switcher ────────────────────────────────────────────

const VARIANTS = [
  { id: 'header', label: 'A — Chrome header', component: VariantHeader },
  { id: 'footer', label: 'B — Footer strip', component: VariantFooter },
  { id: 'rows', label: 'C — Row-native', component: VariantRows },
] as const;

export default function ResultsTablePrototypePage() {
  const [params, setParams] = useSearchParams();
  const idx = Math.max(0, VARIANTS.findIndex((v) => v.id === params.get('v')));
  const variant = VARIANTS[idx]!;
  const Active = variant.component;

  const cycle = (dir: 1 | -1) => {
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]!;
    setParams({ v: next.id }, { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NoteFrame>
        <Active key={variant.id} />
      </NoteFrame>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 shadow-2xl z-50">
        <button onClick={() => cycle(-1)} className="px-2 text-zinc-400 hover:text-white">←</button>
        <span className="text-xs text-zinc-300 font-mono min-w-40 text-center">{variant.label}</span>
        <button onClick={() => cycle(1)} className="px-2 text-zinc-400 hover:text-white">→</button>
      </div>
    </div>
  );
}
