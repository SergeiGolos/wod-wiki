import { IDialect, DialectAnalysis } from "../core/models/Dialect";
import { ICodeStatement } from "../core/models/CodeStatement";
import { MetricType } from "../core/models/Metric";
import { MetricContainer } from "../core/models/MetricContainer";

/**
 * Cardio dialect for recognizing endurance/aerobic workout patterns.
 *
 * Recognizes:
 * - RUN / JOG / SPRINT: Running activities
 * - ROW: Rowing (erg, water)
 * - BIKE / CYCLE: Cycling activities
 * - SWIM: Swimming
 * - WALK: Walking / recovery activity
 * - Distance-only statements (e.g. "5km", "400m") without explicit activity
 *
 * Emitted hints (dot-namespaced):
 *   domain.cardio              - any statement processed by this dialect
 *   workout.run                - running activity
 *   workout.row                - rowing activity
 *   workout.bike               - cycling activity
 *   workout.swim               - swimming activity
 *   workout.walk               - walking activity
 *   behavior.distance_based    - primary metric is distance
 *   behavior.pace_based        - pacing / splits are relevant
 *   behavior.aerobic           - sustained aerobic effort
 */
export class CardioDialect implements IDialect {
  id = 'cardio';
  name = 'Cardio Dialect';

  private hasKeyword(metrics: MetricContainer, keyword: string): boolean {
    return metrics.some(
      m =>
        (m.type === MetricType.Action || m.type === MetricType.Effort) &&
        typeof m.value === 'string' &&
        m.value.toUpperCase().includes(keyword.toUpperCase())
    );
  }

  private hasDistance(metrics: MetricContainer): boolean {
    return metrics.some(m => m.type === MetricType.Distance);
  }

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const metrics = statement.metrics;

    // TODO: Detect running activities
    if (
      this.hasKeyword(metrics, 'RUN') ||
      this.hasKeyword(metrics, 'JOG') ||
      this.hasKeyword(metrics, 'SPRINT')
    ) {
      hints.push('domain.cardio');
      hints.push('workout.run');
      hints.push('behavior.aerobic');
    }

    // TODO: Detect rowing
    if (this.hasKeyword(metrics, 'ROW') || this.hasKeyword(metrics, 'ROWING')) {
      hints.push('domain.cardio');
      hints.push('workout.row');
      hints.push('behavior.aerobic');
    }

    // TODO: Detect cycling
    if (
      this.hasKeyword(metrics, 'BIKE') ||
      this.hasKeyword(metrics, 'CYCLE') ||
      this.hasKeyword(metrics, 'CYCLING')
    ) {
      hints.push('domain.cardio');
      hints.push('workout.bike');
      hints.push('behavior.aerobic');
    }

    // TODO: Detect swimming
    if (this.hasKeyword(metrics, 'SWIM') || this.hasKeyword(metrics, 'SWIMMING')) {
      hints.push('domain.cardio');
      hints.push('workout.swim');
      hints.push('behavior.aerobic');
    }

    // TODO: Detect walking
    if (this.hasKeyword(metrics, 'WALK') || this.hasKeyword(metrics, 'WALKING')) {
      hints.push('domain.cardio');
      hints.push('workout.walk');
    }

    // TODO: Detect distance-only statements (e.g. "400m", "5km" with no activity keyword)
    // These are generically cardio-flavoured even without an explicit activity name.
    if (hints.length === 0 && this.hasDistance(metrics)) {
      hints.push('domain.cardio');
      hints.push('behavior.distance_based');
    }

    // If any cardio activity was found, also tag as distance/pace relevant
    if (hints.includes('domain.cardio') && this.hasDistance(metrics)) {
      hints.push('behavior.distance_based');
      hints.push('behavior.pace_based');
    }

    return { hints };
  }
}
