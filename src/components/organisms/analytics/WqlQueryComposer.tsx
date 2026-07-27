import { useState } from 'react';
import { Play, Sparkles, SlidersHorizontal, Code2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryComposerState } from '@/utils/analytics/useQueryComposerState';
import type { Aggregator } from '@/services/analytics/query';
import { WqlHumanTranslationBanner } from '@/components/molecules/analytics/WqlHumanTranslationBanner';
import { WqlQueryField } from '@/components/organisms/editor/WqlQueryField';

export type ComposerMode = 'dual' | 'visual' | 'code' | 'guided';

export interface WqlQueryComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  mode?: ComposerMode;
  showTranslation?: boolean;
  showLineage?: boolean;
  effortNames?: () => readonly string[];
  placeholder?: string;
  className?: string;
}

const AGGREGATOR_OPTIONS = [
  { value: 'sum', label: 'sum (total)' },
  { value: 'avg', label: 'avg (average)' },
  { value: 'last', label: 'last (latest)' },
  { value: 'count', label: 'count (frequency)' },
  { value: 'min', label: 'min (lowest)' },
  { value: 'max', label: 'max (highest)' },
  { value: 'delta', label: 'delta (change)' },
];

const TAG_KEYS = ['discipline', 'effort', 'intensity', 'note', 'origin', 'tags'];

const VOCABULARY_VALUES: Record<string, string[]> = {
  discipline: ['strength', 'cardio', 'gymnastics', 'rowing', 'running', 'kettlebell', 'cycling', 'swimming', 'walking', 'recovery'],
  effort: ['thruster', 'back-squat', 'rowing', 'pull-up', 'double-under', 'burpee', 'snatch', 'clean-and-jerk', 'wall-ball', 'box-jump'],
  intensity: ['low', 'medium', 'high', 'max'],
  note: ['benchmark', 'hero', 'test', 'mobility', 'custom'],
  origin: ['journal', 'playground'],
};

const GROUP_DIMS = [
  { value: '', label: '(None — scalar query)' },
  { value: 'week', label: 'week (weekly buckets)' },
  { value: 'effort', label: 'effort (by exercise slug)' },
  { value: 'discipline', label: 'discipline (by training sport)' },
  { value: 'intensity', label: 'intensity (by 80/20 tier)' },
  { value: 'session', label: 'session (by individual workout)' },
];

const ROLLUPS = [
  { value: '', label: '(None — raw fact grain)' },
  { value: '1w', label: '1w (1 week buckets)' },
  { value: '1d', label: '1d (1 day buckets)' },
  { value: '1m', label: '1m (1 month buckets)' },
];

export function WqlQueryComposer({
  value,
  onChange,
  onSubmit,
  mode: initialMode = 'dual',
  showTranslation = true,
  showLineage = true,
  effortNames,
  placeholder = 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)',
  className,
}: WqlQueryComposerProps) {
  const [activeMode, setActiveMode] = useState<ComposerMode>(initialMode);
  const state = useQueryComposerState(value, onChange);

  const handleSubmit = () => {
    if (onSubmit) onSubmit(state.query);
  };

  return (
    <div className={cn('nord-card rounded-xl p-4 md:p-5 shadow-lg space-y-4 bg-card border-border', className)}>
      {/* MODE SWITCHER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Composition Mode:</span>
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveMode('dual')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                activeMode === 'dual'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles size={13} /> Dual View
            </button>
            <button
              onClick={() => setActiveMode('visual')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                activeMode === 'visual'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal size={13} /> Visual Builder
            </button>
            <button
              onClick={() => setActiveMode('code')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                activeMode === 'code'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Code2 size={13} /> WQL Code
            </button>
            <button
              onClick={() => setActiveMode('guided')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                activeMode === 'guided'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <HelpCircle size={13} /> Guided Question
            </button>
          </div>
        </div>

        {onSubmit && (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <Play size={13} /> Run Query
          </button>
        )}
      </div>

      {/* HUMAN TRANSLATION BANNER */}
      {showTranslation && (
        <WqlHumanTranslationBanner translation={state.humanTranslation} query={state.query} />
      )}

      {/* DUAL MODE (VISUAL + CODE) */}
      {activeMode === 'dual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: VISUAL FORM CONTROLS */}
          <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                🧩 Visual Form Controls
              </h4>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                Bidirectional Sync
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  Function & Canonical Metric
                </label>
                <div className="flex gap-2">
                  <select
                    value={state.agg}
                    onChange={(e) => state.setAgg(e.target.value as Aggregator)}
                    className="bg-background border border-border text-foreground px-2.5 py-1.5 rounded-lg font-mono text-xs"
                  >
                    {AGGREGATOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={state.metric}
                    onChange={(e) => state.setMetric(e.target.value)}
                    className="bg-background border border-border text-foreground flex-1 px-2.5 py-1.5 rounded-lg font-mono text-xs"
                  >
                    <optgroup label="Tier 2 Summary Facts (Whole Workout Engines)">
                      <option value="totalVolume">totalVolume — Total Weight Volume</option>
                      <option value="tis">tis — Time-in-Motion seconds</option>
                      <option value="sessionLoad">sessionLoad — RPE × Duration Strain</option>
                      <option value="totalReps">totalReps — Total Repetitions</option>
                      <option value="totalDistance">totalDistance — Total Distance</option>
                      <option value="metMinutes">metMinutes — Energy Expenditure</option>
                    </optgroup>
                    <optgroup label="Rollup Fact Windows (Lazy Rollup Driver)">
                      <option value="calc.acwr">calc.acwr — Acute-to-Chronic Workload</option>
                      <option value="calc.monotony">calc.monotony — Workload Monotony</option>
                      <option value="calc.strain">calc.strain — Workload Strain</option>
                    </optgroup>
                    <optgroup label="Tier 0/1 Log Data Points (Per-Segment Annotations)">
                      <option value="elapsed">elapsed — Segment Duration</option>
                      <option value="pace">pace — Realtime Pace (sec/km)</option>
                      <option value="power">power — Realtime Power (watts)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground font-medium block">
                    Tag Filters (<code className="text-amber-500 font-mono">{'{key:value}'}</code>)
                  </label>
                  <button
                    onClick={() =>
                      state.addFilter({ key: 'discipline', value: 'strength', negate: false })
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Tag Filter
                  </button>
                </div>

                <div className="space-y-1.5">
                  {state.filters.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic py-1 block">
                      No filters applied (all facts included)
                    </span>
                  ) : (
                    state.filters.map((f, idx) => {
                      const knownVals = VOCABULARY_VALUES[f.key] || [];
                      return (
                        <div key={idx} className="flex items-center gap-1.5 bg-background p-1.5 rounded border border-border">
                          <button
                            onClick={() => state.toggleFilterNegate(idx)}
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                              f.negate
                                ? 'bg-destructive/20 text-destructive border-destructive/40'
                                : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40',
                            )}
                          >
                            {f.negate ? 'NOT' : 'IS'}
                          </button>
                          <select
                            value={f.key}
                            onChange={(e) => state.updateFilterKey(idx, e.target.value)}
                            className="bg-background border border-border text-amber-500 px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            {TAG_KEYS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                          <span className="text-muted-foreground">:</span>
                          {knownVals.length > 0 ? (
                            <select
                              value={f.value}
                              onChange={(e) => state.updateFilterValue(idx, e.target.value)}
                              className="bg-background border border-border text-foreground flex-1 px-1.5 py-0.5 rounded text-xs font-mono"
                            >
                              {knownVals.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={f.value}
                              onChange={(e) => state.updateFilterValue(idx, e.target.value)}
                              className="bg-background border border-border text-foreground flex-1 px-1.5 py-0.5 rounded text-xs font-mono"
                            />
                          )}
                          <button
                            onClick={() => state.removeFilter(idx)}
                            className="text-destructive text-xs px-1 hover:opacity-80"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">
                    Group By (<code className="text-emerald-500 font-mono">by {'{dim}'}</code>)
                  </label>
                  <select
                    value={state.groupBy}
                    onChange={(e) => state.setGroupBy(e.target.value)}
                    className="bg-background border border-border text-emerald-500 w-full px-2 py-1.5 rounded-lg text-xs font-mono"
                  >
                    {GROUP_DIMS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">
                    Rollup (<code className="text-purple-500 font-mono">.rollup()</code>)
                  </label>
                  <select
                    value={state.rollup}
                    onChange={(e) => state.setRollup(e.target.value)}
                    className="bg-background border border-border text-purple-500 w-full px-2 py-1.5 rounded-lg text-xs font-mono"
                  >
                    {ROLLUPS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: RAW WQL CODE EDITOR */}
          <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                💻 Raw WQL Editor
              </h4>
              <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Lezer Grammar AST
              </span>
            </div>

            <div className="space-y-1">
              <WqlQueryField
                value={state.query}
                onChange={(val) => state.setQuery(val)}
                onSubmit={handleSubmit}
                effortNames={effortNames}
                placeholder={placeholder}
              />
              {state.parseError && (
                <p className="text-xs text-destructive font-mono mt-1">{state.parseError}</p>
              )}
            </div>

            {/* STREAM GRAIN ANATOMY */}
            <div className="p-3 bg-background rounded-lg border border-border text-xs space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-primary flex items-center justify-between">
                <span>Fact Stream Source</span>
                <span className="text-amber-500 font-mono uppercase">{state.streamGrain} Fact</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {state.streamGrain === 'rollup'
                  ? 'Queries analytics store (grain = rollup), computed lazily by RollupDriver.'
                  : state.streamGrain === 'segment'
                  ? 'Queries workout log streams (outputType = segment) directly.'
                  : 'Queries analytics store (grain = summary), produced post-workout by summary engines.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL MODE ONLY */}
      {activeMode === 'visual' && (
        <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            🧩 Visual Form Query Builder
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                Function & Canonical Metric
              </label>
              <select
                value={state.metric}
                onChange={(e) => state.setMetric(e.target.value)}
                className="bg-background border border-border text-foreground w-full px-2.5 py-1.5 rounded-lg font-mono"
              >
                <option value="totalVolume">totalVolume — Total Volume</option>
                <option value="tis">tis — Time-in-Motion</option>
                <option value="sessionLoad">sessionLoad — Session Load</option>
                <option value="totalReps">totalReps — Total Reps</option>
                <option value="calc.acwr">calc.acwr — ACWR Injury Risk</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Group By</label>
              <select
                value={state.groupBy}
                onChange={(e) => state.setGroupBy(e.target.value)}
                className="bg-background border border-border text-foreground w-full px-2.5 py-1.5 rounded-lg font-mono"
              >
                {GROUP_DIMS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Rollup</label>
              <select
                value={state.rollup}
                onChange={(e) => state.setRollup(e.target.value)}
                className="bg-background border border-border text-foreground w-full px-2.5 py-1.5 rounded-lg font-mono"
              >
                {ROLLUPS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CODE MODE ONLY */}
      {activeMode === 'code' && (
        <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            💻 Raw WQL Expression Field
          </h4>
          <WqlQueryField
            value={state.query}
            onChange={(val) => state.setQuery(val)}
            onSubmit={handleSubmit}
            effortNames={effortNames}
            placeholder={placeholder}
          />
        </div>
      )}

      {/* GUIDED QUESTION MODE (NATURAL LANGUAGE) */}
      {activeMode === 'guided' && (
        <div className="bg-muted/40 p-5 rounded-xl border border-border space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            🎯 Ask a Question (Guided Sentence Builder)
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
            <span>Show me the</span>
            <select
              value={state.agg}
              onChange={(e) => state.setAgg(e.target.value as Aggregator)}
            >
              {AGGREGATOR_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.value}
                </option>
              ))}
            </select>
            <span>of</span>
            <select
              value={state.metric}
              onChange={(e) => state.setMetric(e.target.value)}
              className="bg-background border border-border text-primary font-semibold px-2 py-1 rounded-md"
            >
              <option value="totalVolume">Total Volume</option>
              <option value="tis">Time in Motion</option>
              <option value="sessionLoad">Session Load</option>
              <option value="totalReps">Total Reps</option>
              <option value="calc.acwr">ACWR Injury Risk</option>
            </select>
            <span>grouped by</span>
            <select
              value={state.groupBy}
              onChange={(e) => state.setGroupBy(e.target.value)}
              className="bg-background border border-border text-emerald-500 font-semibold px-2 py-1 rounded-md"
            >
              <option value="">(none)</option>
              <option value="week">week</option>
              <option value="effort">effort</option>
              <option value="discipline">discipline</option>
            </select>
            <span>rolled up by</span>
            <select
              value={state.rollup}
              onChange={(e) => state.setRollup(e.target.value)}
              className="bg-background border border-border text-purple-500 font-semibold px-2 py-1 rounded-md"
            >
              <option value="">(none)</option>
              <option value="1w">1 week (1w)</option>
              <option value="1d">1 day (1d)</option>
            </select>
          </div>
        </div>
      )}

      {/* PIPELINE LINEAGE INSPECTOR */}
      {showLineage && (
        <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              🔍 Workout Log Stream ➔ Fact Derivation Lineage Inspector
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">src/services/analytics/workoutDerivation.ts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-background p-2.5 rounded border border-border border-l-2 border-l-primary space-y-1">
              <span className="text-[10px] text-primary font-bold block">1. Log Output</span>
              <div className="text-muted-foreground text-[11px]">StoredOutputStatement</div>
            </div>

            <div className="bg-background p-2.5 rounded border border-border border-l-2 border-l-amber-500 space-y-1">
              <span className="text-[10px] text-amber-500 font-bold block">2. Engine</span>
              <div className="text-muted-foreground text-[11px]">AnalyticsEngine Profile</div>
            </div>

            <div className="bg-background p-2.5 rounded border border-border border-l-2 border-l-emerald-500 space-y-1">
              <span className="text-[10px] text-emerald-500 font-bold block">3. Fact Row</span>
              <div className="text-foreground text-[11px] font-bold">{state.metric}</div>
            </div>

            <div className="bg-background p-2.5 rounded border border-border border-l-2 border-l-purple-500 space-y-1">
              <span className="text-[10px] text-purple-500 font-bold block">4. WQL AST</span>
              <div className="text-foreground text-[11px] truncate">{state.query}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
