import { ISummaryProcessor } from '../ISummaryProcessor';
import { extractMetrics } from '../extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../models/Metric';
import { IOutputStatement } from '../../models/OutputStatement';
import { TimeSpan } from '../../../runtime/models/TimeSpan';
import { DEFAULT_UNRESOLVED_EFFORT_MET, extractEffortData, resolveDominantOrigin } from '../effortResolution';
import type { ResolvedEffortData } from '../effortResolution';

/**
 * Training Intensity Score (TIS) Processor.
 *
 * Computes a cross-discipline composite score that lets coaches compare
 * weightlifting, cardio, and HIIT sessions on a common scale.
 *
 * Consumes resolved effort data (attached by TwoPassEffortResolutionProcess)
 * for MET and discipline values. Missing effort-data falls back to the
 * unresolved-effort default owned by the effort resolution module.
 *
 * Formula:
 *   TIS = (MET-Score × 0.30) + (RPE-Score × 0.35) + (Duration-Score × 0.20) + (Discipline-Factor × 0.15)
 *
 * MET-Score      = (Activity METs ÷ METmax) × 100
 *                  METmax = VO2max ÷ 3.5
 *                  Fallback when VO2max unknown: METmax = 11.4
 *
 * RPE-Score      = Session RPE (0–10) × 10
 *                  Falls back to max effort-derived RPE when no SessionRPE is present.
 *
 * Duration-Score = (Duration minutes ÷ 60) × MET-Score
 *
 * Discipline-Factor:
 *   strength / resistance → 1.2
 *   yoga                  → 0.9
 *   cardio / HIIT         → 1.0
 */
export class TISProcessor implements ISummaryProcessor {
  public readonly id = 'tis-projection';
  public readonly name = 'TISProcessor';
  public readonly dialects = ['wod', 'log', 'plan'] as const;
  public readonly requiredMetrics = [MetricType.Action] as const;

  /** Population-average METmax when VO2max is unknown (≈ VO2max 40 mL/kg/min). */
  static readonly FALLBACK_METMAX = 11.4;

  /** VO2max → METmax conversion divisor. */
  static readonly METMAX_DIVISOR = 3.5;

  private readonly effortToRpe: Record<string, number> = {
    easy: 3,
    moderate: 5,
    hard: 7,
    'all-out': 10,
    max: 10,
  };

  /** User VO2max in mL/kg/min; undefined when not known. */
  private readonly vo2max: number | undefined;

  constructor(vo2max?: number) {
    this.vo2max = vo2max;
  }

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalElapsedMs = 0;
    let totalMetMinutes = 0;
    let lastEffortData: ResolvedEffortData | null = null;
    let maxRpe = 0;
    let hasResistance = false;
    const origins: import('../../../../core/models/Metric').MetricOrigin[] = [];

    for (const m of metrics) {
      const effortData = extractEffortData([m]);
      if (effortData) {
        lastEffortData = effortData;
        origins.push(effortData.origin);
        continue;
      }

      if (m.type === MetricType.Elapsed && typeof m.value === 'number' && m.value > 0) {
        totalElapsedMs += m.value;
        const mets = lastEffortData?.resolved.met ?? DEFAULT_UNRESOLVED_EFFORT_MET;
        if (!lastEffortData) origins.push('analyzed-estimated');
        totalMetMinutes += mets * (m.value / 60000);
      }
      if (m.type === MetricType.Effort) {
        const effortVal = typeof m.value === 'string' ? m.value.toLowerCase() : null;
        const rpe = effortVal ? (this.effortToRpe[effortVal] ?? 0) : (typeof m.value === 'number' ? m.value : 0);
        if (rpe > maxRpe) maxRpe = rpe;
      }
      if (m.type === MetricType.Resistance) {
        hasResistance = true;
      }
      if (m.type === MetricType.SessionRPE && typeof m.value === 'number') {
        maxRpe = m.value;
      }
    }

    if (totalElapsedMs === 0 || totalMetMinutes === 0) return [];

    // METmax: personalized when VO2max known, otherwise population-average fallback
    const isEstimated = this.vo2max === undefined;
    const metMax = isEstimated
      ? TISProcessor.FALLBACK_METMAX
      : this.vo2max! / TISProcessor.METMAX_DIVISOR;

    // Average METs across the session
    const avgMets = totalMetMinutes / (totalElapsedMs / 60000);

    // MET-Score = (Activity METs ÷ METmax) × 100, capped at 100
    const metScore = Math.min(100, (avgMets / metMax) * 100);

    // RPE-Score = Session RPE (0–10) × 10, fallback to effort-derived RPE or moderate default
    const sRPE = maxRpe > 0 ? maxRpe : 5;
    const rpeScore = sRPE * 10;

    // Duration-Score = (Duration minutes ÷ 60) × MET-Score
    const durationMinutes = totalElapsedMs / 60000;
    const durationScore = (durationMinutes / 60) * metScore;

    // Discipline-Factor: owned by resolved effort data; unresolved/no data uses conservative fallback.
    const disciplineFactor = lastEffortData?.resolved.disciplineFactor ?? (hasResistance ? 1.2 : 1.0);

    // Composite TIS
    const tis =
      metScore * 0.30 +
      rpeScore * 0.35 +
      durationScore * 0.20 +
      disciplineFactor * 0.15;

    const now = new Date();
    const origin = origins.length > 0
      ? resolveDominantOrigin(origins)
      : (isEstimated ? 'analyzed-estimated' : 'analyzed');

    return [
      {
        name: 'Training Intensity Score',
        value: Math.round(tis * 10) / 10,
        unit: 'pts',
        metricType: MetricType.TIS,
        timeSpan: new TimeSpan(now.getTime(), now.getTime()),
        origin,
        metadata: {
          metScore: Math.round(metScore * 10) / 10,
          rpeScore,
          durationScore: Math.round(durationScore * 10) / 10,
          disciplineFactor,
          metMax: Math.round(metMax * 10) / 10,
          isEstimated,
          vo2max: this.vo2max,
          usedResolvedEffort: lastEffortData !== null,
          effortOrigin: lastEffortData?.origin,
          effortSlug: lastEffortData?.resolved.slug,
          effortDiscipline: lastEffortData?.resolved.discipline,
        },
      },
    ];
  }
}
