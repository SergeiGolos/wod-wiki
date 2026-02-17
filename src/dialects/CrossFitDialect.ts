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

  /**
   * Check if statement has children (is a parent block)
   */
  private hasChildren(statement: ICodeStatement): boolean {
    return statement.children && statement.children.length > 0;
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
    // Explicit EMOM keyword
    if (this.hasKeyword(fragments, 'EMOM')) {
      hints.push('behavior.repeating_interval');
      hints.push('workout.emom');
    }

    // Implicit EMOM: Rounds + Timer + Children pattern
    // e.g., "(20) :60" with child statements implies EMOM
    // - Rounds specify how many intervals
    // - Timer specifies interval duration (defaults to 60s if not specified)
    // - Children are executed within each interval
    if (!this.hasKeyword(fragments, 'EMOM')) {
      const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
      const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Duration);
      const hasChildStatements = this.hasChildren(statement);

      if (hasRounds && hasTimer && hasChildStatements) {
        hints.push('behavior.repeating_interval');
        hints.push('workout.emom');
        hints.push('workout.implicit_emom');
      }
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
