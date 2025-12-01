import { IDialect, DialectAnalysis } from "../core/models/Dialect";
import { ICodeStatement } from "../core/models/CodeStatement";
import { FragmentType, ICodeFragment } from "../core/models/CodeFragment";

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

  /**
   * Check if any Action or Effort fragment contains a keyword (case-insensitive)
   */
  private hasKeyword(fragments: ICodeFragment[], keyword: string): boolean {
    return fragments.some(f =>
      (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes(keyword)
    );
  }

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const fragments = statement.fragments || [];

    // Check for AMRAP - time-bound workout
    if (this.hasKeyword(fragments, 'AMRAP')) {
      hints.push('behavior.time_bound');
      hints.push('workout.amrap');
    }

    // Check for EMOM - repeating interval workout
    if (this.hasKeyword(fragments, 'EMOM')) {
      hints.push('behavior.repeating_interval');
      hints.push('workout.emom');
    }

    // Check for FOR TIME - time-bound workout with completion goal
    if (this.hasKeyword(fragments, 'FOR TIME')) {
      hints.push('behavior.time_bound');
      hints.push('workout.for_time');
    }

    // Check for TABATA - high-intensity interval protocol
    if (this.hasKeyword(fragments, 'TABATA')) {
      hints.push('behavior.repeating_interval');
      hints.push('workout.tabata');
    }

    return { hints };
  }
}
