/**
 * CalcAuthoringPanel (#880) — the composed calc-line authoring surface:
 * scope selector + CM6 editor (syntax + typeahead) + static diagnostics
 * strip + live preview, with persistence to the IndexedDB user-calc store
 * and high-priority registration through `createCalcEngine` (user calcs are
 * injected via the analytics profile's `calcs`).
 */

import { useEffect, useMemo, useState } from 'react';
import { CalcScope } from '../../../core/analytics/calc/types';
import { analyzeCalcLine } from './calcDiagnostics';
import { CalcLineEditor } from './CalcLineEditor';
import { CalcDiagnosticsStrip } from './CalcDiagnosticsStrip';
import { CalcPreviewPanel } from './CalcPreviewPanel';
import {
  listUserCalcs,
  saveUserCalc,
  deleteUserCalc,
  UserCalcRecord,
} from '@/stores/userCalcStore';

export interface CalcAuthoringPanelProps {
  /** Default scope when the doc has no scope header. */
  defaultScope?: CalcScope;
  /** Preload this calc id's source (e.g. from a library router param). */
  initialId?: string;
}

const SCOPES: CalcScope[] = ['segment', 'workout', 'store'];

function deriveId(defs: ReturnType<typeof analyzeCalcLine>['defs'], src: string): string {
  const name = defs[0]?.id;
  if (name) return name;
  const m = /^[\s\S]*?^\s*([A-Za-z_][\w.-]*)\s*=.*$/m.exec(src);
  if (m) return m[1];
  return `custom-${Date.now().toString(36)}`;
}

export function CalcAuthoringPanel({ defaultScope = 'segment', initialId }: CalcAuthoringPanelProps) {
  const [src, setSrc] = useState(`# ${defaultScope} calc line
segmentVolume = reps * resistance (library) when has(reps) and has(resistance)
`);
  const [scope, setScope] = useState<CalcScope>(defaultScope);
  const [records, setRecords] = useState<UserCalcRecord[]>([]);
  const [notice, setNotice] = useState<string | undefined>();

  const analysis = useMemo(() => analyzeCalcLine(src, scope), [src, scope]);
  const id = deriveId(analysis.defs, src);
  const valid = analysis.diagnostics.every((d) => d.severity !== 'error') && analysis.defs.length > 0;

  const refresh = async () => {
    setRecords(await listUserCalcs());
  };
  useEffect(() => {
    void refresh();
  }, []);

  // Load a pre-selected calc by id.
  useEffect(() => {
    if (!initialId) return;
    void (async () => {
      const rec = (await listUserCalcs()).find((r) => r.id === initialId);
      if (rec) {
        setSrc(rec.lineForm);
        setNotice(`Loaded "${rec.id}".`);
      }
    })();
  }, [initialId]);

  const handleSave = async () => {
    if (!valid) { setNotice('Cannot save: fix the errors first.'); return; }
    await saveUserCalc({ id, lineForm: src, updatedAt: Date.now() });
    await refresh();
    setNotice(`Saved "${id}".`);
  };

  const handleDelete = async (rid: string) => {
    await deleteUserCalc(rid);
    await refresh();
    setNotice(`Deleted "${rid}".`);
  };

  const handleLoad = (rec: UserCalcRecord) => {
    // Best-effort scope from the doc header.
    const m = /^\s*(segment|workout|store)\b/.exec(rec.lineForm);
    if (m) setScope(m[1] as CalcScope);
    setSrc(rec.lineForm);
    setNotice(`Loaded "${rec.id}".`);
  };

  return (
    <div className="space-y-3" data-testid="calc-authoring-panel">
      {/* Scope selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">Scope</span>
        <div className="flex gap-1">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                scope === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleSave}
            disabled={!valid}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <CalcLineEditor value={src} onChange={setSrc} scope={scope} autoFocus />

      <CalcDiagnosticsStrip analysis={analysis} />

      <CalcPreviewPanel scope={scope} analysis={analysis} />

      {notice && <div className="text-xs text-zinc-400">{notice}</div>}

      {/* Saved user calcs */}
      {records.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Saved user calcs</div>
          <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {records.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <button onClick={() => handleLoad(rec)} className="text-left font-mono text-purple-300 hover:underline">
                  {rec.id}
                </button>
                <button onClick={() => handleDelete(rec.id)} className="text-xs text-zinc-500 hover:text-red-400">
                  delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
