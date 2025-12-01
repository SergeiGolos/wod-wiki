import { IDialect, DialectAnalysis } from "../core/models/Dialect";
import { ICodeStatement } from "../core/models/CodeStatement";
import { FragmentType } from "../core/models/CodeFragment";

/**
 * CrossFit dialect for recognizing CrossFit-specific workout patterns.
 * 
 * Recognizes:
 * - AMRAP: "As Many Rounds As Possible" - time-bound workout
 * - EMOM: "Every Minute On the Minute" - repeating interval workout
 * - FOR TIME: Time-capped workout with completion goal
 * - TABATA: High-intensity interval protocol (20s work / 10s rest)
 */
export class CrossFitDialect implements IDialect {
  id = 'crossfit';
  name = 'CrossFit Dialect';

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const fragments = statement.fragments || [];

    // Check for AMRAP
    const hasAmrap = fragments.some(f =>
      (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes('AMRAP')
    );
    if (hasAmrap) {
      hints.push('behavior.time_bound');
      hints.push('workout.amrap');
    }

    // Check for EMOM
    const hasEmom = fragments.some(f =>
      (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes('EMOM')
    );
    if (hasEmom) {
      hints.push('behavior.repeating_interval');
      hints.push('workout.emom');
    }

    // Check for FOR TIME
    const hasForTime = fragments.some(f =>
      (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes('FOR TIME')
    );
    if (hasForTime) {
      hints.push('behavior.time_bound');
      hints.push('workout.for_time');
    }

    // Check for TABATA
    const hasTabata = fragments.some(f =>
      (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes('TABATA')
    );
    if (hasTabata) {
      hints.push('behavior.repeating_interval');
      hints.push('workout.tabata');
    }

    return { hints };
  }
}
