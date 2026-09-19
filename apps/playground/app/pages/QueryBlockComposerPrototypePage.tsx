/**
 * PROTOTYPE — throwaway. Question: the ```query:table fence auto-inserted on
 * workout completion (#944) is edited through its own bespoke stack
 * (QueryBlockView pencil → WqlQueryInspectorModal → saveBlockQuerySource).
 * Can the shared WqlComposer interaction model replace that editor, and
 * where should the composer live?
 *
 * Three variants of editing a query:table fence via WqlComposer, switchable
 * via ?v= on /proto/query-block-composer:
 *   ?v=inline — composer expands in place between block and preview; Apply commits.
 *   ?v=dock   — one composer docked at the note's foot, bound to the clicked block; edits are live.
 *   ?v=fence  — the fence body itself becomes the composer on click; blur/Esc leaves.
 *
 * Fixture data is fake; the composer, the fence text, and the markdown doc
 * panel are real (the doc panel always shows the live fence source).
 * ponytail: table preview is a regex heuristic, not the real executor —
 * upgrade path is QueryBlockView + a stub QueryExecutor.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WqlComposer } from '@bitcobblers/wod-wiki-ui';

// ── Mock note ────────────────────────────────────────────────────────────────
const RESULT_ID = '01a09d45-885a-738d-ab1e-be31d44fe919';
const INITIAL_WQL = `rows:all{result:${RESULT_ID}}`;

const DOC_BEFORE = `## Morning session

Fran went unbroken until round three. Throat on fire.

\`\`\`time
(21-15-9)
  Thruster 43kg
  Pull-up
\`\`\``;

const DOC_AFTER = `Should have paced the first round. Next time: breathing ladder on thrusters.`;

// ── Fake rows (what RowsTable would render) ──────────────────────────────────
interface FakeRow { effort: string; round: number; reps: number; load: string; elapsed: string }
const FRAN_ROWS: FakeRow[] = [
  { effort: 'Thruster', round: 1, reps: 21, load: '43kg', elapsed: '0:48' },
  { effort: 'Pull-up', round: 1, reps: 21, load: 'bw', elapsed: '1:12' },
  { effort: 'Thruster', round: 2, reps: 15, load: '43kg', elapsed: '1:05' },
  { effort: 'Pull-up', round: 2, reps: 15, load: 'bw', elapsed: '1:31' },
  { effort: 'Thruster', round: 3, reps: 9, load: '43kg', elapsed: '1:22' },
  { effort: 'Pull-up', round: 3, reps: 9, load: 'bw', elapsed: '1:47' },
];

/** Heuristic preview: rows type + effort-ish text filter. ponytail above. */
function previewRows(wql: string): { rows: FakeRow[]; note?: string } {
  const m = /rows:(\w+)/.exec(wql);
  if (!m) return { rows: [], note: 'no rows: head — block would render chart/value instead' };
  const text = /text:"?([\w-]+)"?/.exec(wql)?.[1];
  const rows = text
    ? FRAN_ROWS.filter((r) => r.effort.toLowerCase().includes(text.toLowerCase()))
    : FRAN_ROWS;
  return { rows, note: m[1] !== 'all' ? `rows:${m[1]}` : undefined };
}

function ResultTable({ wql }: { wql: string }) {
  const { rows, note } = useMemo(() => previewRows(wql), [wql]);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-baseline justify-between px-3 py-2 border-b border-border/60 bg-muted/30">
        <span className="text-xs font-medium text-foreground">Fran — 2026-09-13</span>
        <span className="text-[10px] text-muted-foreground font-mono">{note ?? `${rows.length} rows`}</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground italic">{note ?? 'no rows match'}</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/40">
              <th className="px-3 py-1.5 font-medium">Effort</th>
              <th className="px-3 py-1.5 font-medium">Rd</th>
              <th className="px-3 py-1.5 font-medium text-right">Reps</th>
              <th className="px-3 py-1.5 font-medium text-right">Load</th>
              <th className="px-3 py-1.5 font-medium text-right">Split</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/20 last:border-0">
                <td className="px-3 py-1.5">{r.effort}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.round}</td>
                <td className="px-3 py-1.5 text-right font-mono">{r.reps}</td>
                <td className="px-3 py-1.5 text-right font-mono">{r.load}</td>
                <td className="px-3 py-1.5 text-right font-mono">{r.elapsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Shared mock-document chrome ──────────────────────────────────────────────
function Prose({ children }: { children: string }) {
  return <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{children}</p>;
}

function WorkoutBlock() {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">time · 3 rounds</div>
      <div className="text-xs font-mono text-foreground/90">21-15-9 · Thruster 43kg · Pull-up</div>
    </div>
  );
}

function DocPanel({ wql }: { wql: string }) {
  return (
    <div className="rounded-lg border border-dashed border-amber-500/40 bg-muted/20 p-3">
      <div className="text-[10px] text-amber-500 mb-2 font-mono">note.md — live fence state</div>
      <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {DOC_BEFORE.split('```time')[0]}
        <span className="opacity-50">```time … ```</span>{'\n\n'}
        <span className="text-sky-400 bg-sky-400/10 rounded px-1 -mx-1">{'```query:table\n'}{wql}{'\n```'}</span>
        {'\n\n'}{DOC_AFTER}
      </pre>
    </div>
  );
}

const PENCIL = '✎';

// ── Variant A: in-flow expansion ─────────────────────────────────────────────
// Pencil on the block; the composer expands BETWEEN the preview and the
// document, Apply writes the fence, Cancel discards. Draft is uncommitted.
function InlineVariant({ wql, setWql }: { wql: string; setWql: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(wql);
  return (
    <div className="space-y-3">
      <div className="relative">
        <ResultTable wql={wql} />
        {!open && (
          <button
            onClick={() => { setDraft(wql); setOpen(true); }}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs px-1.5 py-0.5 rounded hover:bg-muted"
          >{PENCIL}</button>
        )}
      </div>
      {open && (
        <div className="rounded-lg border border-sky-500/50 bg-card p-3 space-y-2 shadow-lg shadow-sky-500/5">
          <div className="text-[10px] text-sky-400 font-mono">editing query:table — Apply writes the fence</div>
          <WqlComposer query={draft} onQueryChange={setDraft} autoFocus placeholder="rows:…" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => { setWql(draft); setOpen(false); }} className="px-3 py-1 text-xs rounded-md bg-sky-500 text-zinc-950 font-medium">Apply to fence</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Variant B: bound dock ────────────────────────────────────────────────────
// One composer pinned at the note's foot. Clicking the block BINDS the dock;
// edits patch the fence live (no Apply). Clicking away / Done unbinds.
function DockVariant({ wql, setWql }: { wql: string; setWql: (s: string) => void }) {
  const [bound, setBound] = useState(false);
  return (
    <div className="space-y-3 pb-24">
      <button
        onClick={() => setBound(true)}
        className={`block w-full text-left rounded-lg transition-shadow ${bound ? 'ring-2 ring-sky-500/70' : 'hover:ring-1 hover:ring-border'}`}
      >
        <ResultTable wql={wql} />
      </button>
      <div className={`sticky bottom-20 rounded-xl border p-3 space-y-2 shadow-xl backdrop-blur transition-colors ${bound ? 'border-sky-500/60 bg-card/95' : 'border-border bg-card/80 opacity-70'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono ${bound ? 'text-sky-400' : 'text-muted-foreground'}`}>
            {bound ? `◉ bound: query:table · ${RESULT_ID.slice(0, 8)}…` : '○ click a query block to bind the composer'}
          </span>
          {bound && <button onClick={() => setBound(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Done</button>}
        </div>
        {bound && <WqlComposer query={wql} onQueryChange={setWql} autoFocus showDiagnostics={false} placeholder="rows:…" />}
      </div>
    </div>
  );
}

// ── Variant C: fence-as-composer ─────────────────────────────────────────────
// No chrome at all. Clicking the block drops you INTO the fence: the query
// line renders as composer pills inside the fence gutters. Esc / click-out
// returns to the preview. The text and its editor are the same object.
function FenceVariant({ wql, setWql }: { wql: string; setWql: (s: string) => void }) {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    if (!inside) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInside(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inside]);
  if (!inside) {
    return (
      <button onClick={() => setInside(true)} className="block w-full text-left hover:ring-1 hover:ring-border rounded-lg">
        <ResultTable wql={wql} />
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-sky-500/50 bg-muted/60 shadow-lg shadow-sky-500/5">
      <div className="px-3 pt-2 text-[10px] font-mono text-muted-foreground select-none">```query:table</div>
      <div className="px-3 py-2">
        <WqlComposer query={wql} onQueryChange={setWql} autoFocus showDiagnostics={false} placeholder="rows:…" className="bg-transparent border-0 shadow-none" />
      </div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground select-none">```</span>
        <button onClick={() => setInside(false)} className="text-[10px] text-sky-400 hover:text-sky-300 font-mono">Esc / leave fence ↩</button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const VARIANTS: [string, string][] = [
  ['inline', 'A · in-flow expansion'],
  ['dock', 'B · bound dock'],
  ['fence', 'C · fence-as-composer'],
];

export default function QueryBlockComposerPrototypePage() {
  const [params, setParams] = useSearchParams();
  const v = params.get('v') ?? 'inline';
  const [wql, setWql] = useState(INITIAL_WQL);

  const cycle = (dir: 1 | -1) => {
    const idx = VARIANTS.findIndex(([id]) => id === v);
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length][0];
    setParams({ v: next });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <div>
            <div className="text-[11px] text-amber-500 mb-1">PROTOTYPE — throwaway · query:table editing via WqlComposer</div>
            <h1 className="text-xl font-bold">Journal — 2026-09-13</h1>
          </div>
          <Prose>{DOC_BEFORE.split('```time')[0].trim()}</Prose>
          <WorkoutBlock />
          {v === 'inline' && <InlineVariant wql={wql} setWql={setWql} />}
          {v === 'dock' && <DockVariant wql={wql} setWql={setWql} />}
          {v === 'fence' && <FenceVariant wql={wql} setWql={setWql} />}
          <Prose>{DOC_AFTER}</Prose>
        </div>
        <div className="sticky top-6">
          <DocPanel wql={wql} />
        </div>
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-border bg-card/95 backdrop-blur px-2 py-1.5 shadow-2xl z-50">
        <button onClick={() => cycle(-1)} className="px-2 text-muted-foreground hover:text-foreground">←</button>
        {VARIANTS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setParams({ v: id })}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${v === id ? 'bg-sky-400 text-zinc-950 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >{label}</button>
        ))}
        <button onClick={() => cycle(1)} className="px-2 text-muted-foreground hover:text-foreground">→</button>
      </div>
    </div>
  );
}
