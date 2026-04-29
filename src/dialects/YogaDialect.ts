import { IDialect, DialectAnalysis } from "../core/models/Dialect";
import { ICodeStatement } from "../core/models/CodeStatement";
import { MetricType } from "../core/models/Metric";
import { MetricContainer } from "../core/models/MetricContainer";

/**
 * Yoga dialect for recognizing yoga and mindfulness practice patterns.
 *
 * Recognizes:
 * - Pose holds: duration-based single poses (e.g. "Warrior II :60")
 * - Flows: sequences of poses (e.g. "Sun Salutation x5")
 * - Breathing exercises: pranayama patterns
 * - Meditation: seated/silent practice blocks
 * - Explicit pose names (a curated vocabulary of common poses)
 *
 * Emitted hints (dot-namespaced):
 *   domain.yoga          - any statement processed by this dialect
 *   workout.pose         - single pose hold
 *   workout.flow         - sequence / vinyasa flow
 *   workout.breathing    - pranayama / breathing exercise
 *   workout.meditation   - seated meditation block
 *   behavior.hold        - timed static hold
 *   behavior.mindful     - mindfulness / attention cue
 */
export class YogaDialect implements IDialect {
  id = 'yoga';
  name = 'Yoga Dialect';

  /**
   * Common yoga pose keywords.
   * TODO: Expand this list as the dialect matures.
   */
  private static readonly POSE_KEYWORDS = [
    'WARRIOR', 'DOWNWARD', 'UPWARD', "CHILD'S POSE", 'COBRA',
    'PIGEON', 'TRIANGLE', 'MOUNTAIN', 'TREE POSE', 'LOTUS',
    'CORPSE', 'SAVASANA', 'TADASANA', 'VIRABHADRASANA',
    'BALASANA', 'ADHO', 'URDHVA', 'UTTANASANA', 'VRKSASANA',
  ];

  private static readonly FLOW_KEYWORDS = [
    'SUN SALUTATION', 'VINYASA', 'FLOW', 'SEQUENCE',
  ];

  private static readonly BREATHING_KEYWORDS = [
    'PRANAYAMA', 'BREATH', 'BREATHING', 'NADI SHODHANA',
    'KAPALABHATI', 'UJJAYI', 'BOX BREATH', 'WIM HOF',
  ];

  private static readonly MEDITATION_KEYWORDS = [
    'MEDITATION', 'MEDITATE', 'MINDFULNESS', 'BODY SCAN',
    'VISUALIZATION',
  ];

  private hasAnyKeyword(metrics: MetricContainer, keywords: string[]): boolean {
    return metrics.some(
      m =>
        (m.type === MetricType.Action ||
          m.type === MetricType.Effort ||
          m.type === MetricType.Text) &&
        typeof m.value === 'string' &&
        keywords.some(k => m.value!.toString().toUpperCase().includes(k))
    );
  }

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const metrics = MetricContainer.from(statement.metrics as any);
    const hasDuration = metrics.some(m => m.type === MetricType.Duration);

    // TODO: Detect individual pose holds
    if (this.hasAnyKeyword(metrics, YogaDialect.POSE_KEYWORDS)) {
      hints.push('domain.yoga');
      hints.push('workout.pose');
      if (hasDuration) {
        hints.push('behavior.hold');
      }
    }

    // TODO: Detect flows / sequences
    if (this.hasAnyKeyword(metrics, YogaDialect.FLOW_KEYWORDS)) {
      hints.push('domain.yoga');
      hints.push('workout.flow');
    }

    // TODO: Detect breathing exercises
    if (this.hasAnyKeyword(metrics, YogaDialect.BREATHING_KEYWORDS)) {
      hints.push('domain.yoga');
      hints.push('workout.breathing');
      hints.push('behavior.mindful');
    }

    // TODO: Detect meditation blocks
    if (this.hasAnyKeyword(metrics, YogaDialect.MEDITATION_KEYWORDS)) {
      hints.push('domain.yoga');
      hints.push('workout.meditation');
      hints.push('behavior.mindful');
    }

    return { hints };
  }
}
