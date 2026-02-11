/**
 * OutputTracingHarness — Captures and validates output statements during workout execution.
 *
 * Wraps a ScriptRuntime and records all IOutputStatements emitted,
 * providing assertion helpers for verifying output sequences against
 * the planning tables in docs/planning-output-statements/.
 *
 * @see docs/planning-output-statements/index.md
 */
import { IOutputStatement, OutputStatementType } from '@/core/models/OutputStatement';
import { ICodeFragment, FragmentType } from '@/core/models/CodeFragment';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';

/**
 * Simplified output record for assertion comparisons.
 */
export interface TracedOutput {
  /** Sequential index (0-based) */
  index: number;
  /** Output type: segment, completion, milestone, label, metric */
  outputType: OutputStatementType;
  /** Block key that emitted this output */
  sourceBlockKey: string;
  /** Stack depth when emitted */
  stackLevel: number;
  /** Fragment types present */
  fragmentTypes: FragmentType[];
  /** Fragment summaries for debugging */
  fragmentSummary: string[];
  /** The raw output statement */
  raw: IOutputStatement;
}

/**
 * Expected output for assertion matching.
 * Only specified fields are checked — omitted fields are ignored.
 */
export interface ExpectedOutput {
  /** Expected output type */
  outputType?: OutputStatementType;
  /** Expected stack level */
  stackLevel?: number;
  /** Expected fragment types (subset match) */
  fragmentTypes?: FragmentType[];
  /** Expected fragment type (any match) */
  hasFragmentType?: FragmentType;
  /** Custom predicate for advanced matching */
  predicate?: (output: TracedOutput) => boolean;
}

/**
 * OutputTracingHarness captures all output statements from a ScriptRuntime.
 */
export class OutputTracingHarness {
  private _outputs: TracedOutput[] = [];
  private _unsubscribe: (() => void) | null = null;

  constructor(private readonly runtime: ScriptRuntime) {
    this._unsubscribe = runtime.subscribeToOutput((output: IOutputStatement) => {
      this._outputs.push(this._trace(output));
    });
  }

  // ========== Accessors ==========

  /** All traced outputs in order */
  get outputs(): readonly TracedOutput[] {
    return [...this._outputs];
  }

  /** Count of traced outputs */
  get count(): number {
    return this._outputs.length;
  }

  /** Get output at index */
  at(index: number): TracedOutput | undefined {
    return this._outputs[index];
  }

  // ========== Filtering ==========

  /** Filter outputs by type */
  byType(type: OutputStatementType): TracedOutput[] {
    return this._outputs.filter(o => o.outputType === type);
  }

  /** Get all segment outputs */
  get segments(): TracedOutput[] {
    return this.byType('segment');
  }

  /** Get all completion outputs */
  get completions(): TracedOutput[] {
    return this.byType('completion');
  }

  /** Get all milestone outputs */
  get milestones(): TracedOutput[] {
    return this.byType('milestone');
  }

  /** Filter outputs by stack level */
  atLevel(level: number): TracedOutput[] {
    return this._outputs.filter(o => o.stackLevel === level);
  }

  /** Filter outputs by source block key */
  fromBlock(blockKey: string): TracedOutput[] {
    return this._outputs.filter(o => o.sourceBlockKey === blockKey);
  }

  /** Get outputs that contain a specific fragment type */
  withFragment(fragmentType: FragmentType): TracedOutput[] {
    return this._outputs.filter(o => o.fragmentTypes.includes(fragmentType));
  }

  // ========== Assertions ==========

  /**
   * Assert that the output sequence matches expected outputs.
   * Only checks specified fields in each expected entry.
   *
   * @throws Error with detailed diff if mismatch
   */
  assertSequence(expected: ExpectedOutput[]): void {
    const errors: string[] = [];

    if (this._outputs.length < expected.length) {
      errors.push(
        `Expected at least ${expected.length} outputs but got ${this._outputs.length}`
      );
    }

    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const actual = this._outputs[i];

      if (!actual) {
        errors.push(`Output[${i}]: missing (expected ${exp.outputType ?? 'any'})`);
        continue;
      }

      if (exp.outputType && actual.outputType !== exp.outputType) {
        errors.push(
          `Output[${i}]: expected type '${exp.outputType}' but got '${actual.outputType}'`
        );
      }

      if (exp.stackLevel !== undefined && actual.stackLevel !== exp.stackLevel) {
        errors.push(
          `Output[${i}]: expected stackLevel ${exp.stackLevel} but got ${actual.stackLevel}`
        );
      }

      if (exp.fragmentTypes) {
        for (const ft of exp.fragmentTypes) {
          if (!actual.fragmentTypes.includes(ft)) {
            errors.push(
              `Output[${i}]: expected fragment type '${ft}' not found in [${actual.fragmentTypes.join(', ')}]`
            );
          }
        }
      }

      if (exp.hasFragmentType && !actual.fragmentTypes.includes(exp.hasFragmentType)) {
        errors.push(
          `Output[${i}]: expected to contain fragment type '${exp.hasFragmentType}' but found [${actual.fragmentTypes.join(', ')}]`
        );
      }

      if (exp.predicate && !exp.predicate(actual)) {
        errors.push(
          `Output[${i}]: custom predicate failed`
        );
      }
    }

    if (errors.length > 0) {
      const summary = this._formatSummary();
      throw new Error(
        `Output sequence assertion failed:\n${errors.join('\n')}\n\nActual outputs:\n${summary}`
      );
    }
  }

  /**
   * Assert an exact output count.
   */
  assertCount(expected: number): void {
    if (this._outputs.length !== expected) {
      const summary = this._formatSummary();
      throw new Error(
        `Expected ${expected} outputs but got ${this._outputs.length}\n\nActual outputs:\n${summary}`
      );
    }
  }

  /**
   * Assert that at least N outputs were emitted.
   */
  assertMinCount(min: number): void {
    if (this._outputs.length < min) {
      throw new Error(
        `Expected at least ${min} outputs but got ${this._outputs.length}`
      );
    }
  }

  /**
   * Assert paired segment/completion outputs.
   * Every segment should have a matching completion from the same block.
   */
  assertPairedOutputs(): string[] {
    const unpaired: string[] = [];
    const segments = this.segments;
    const completions = this.completions;

    for (const seg of segments) {
      const matching = completions.find(c => c.sourceBlockKey === seg.sourceBlockKey);
      if (!matching) {
        unpaired.push(`Segment from ${seg.sourceBlockKey} (index ${seg.index}) has no matching completion`);
      }
    }

    return unpaired;
  }

  // ========== Output Formatting ==========

  /**
   * Format a human-readable summary of all outputs.
   */
  summary(): string {
    return this._formatSummary();
  }

  /**
   * Clear all captured outputs.
   */
  clear(): void {
    this._outputs = [];
  }

  /**
   * Dispose of the harness and unsubscribe.
   */
  dispose(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._outputs = [];
  }

  // ========== Private ==========

  private _trace(output: IOutputStatement): TracedOutput {
    const fragments: ICodeFragment[] = output.fragments ?? [];
    return {
      index: this._outputs.length,
      outputType: output.outputType,
      sourceBlockKey: output.sourceBlockKey ?? 'unknown',
      stackLevel: output.stackLevel ?? 0,
      fragmentTypes: fragments.map(f => f.fragmentType),
      fragmentSummary: fragments.map(f => `${FragmentType[f.fragmentType] ?? f.fragmentType}:${f.image ?? ''}`),
      raw: output,
    };
  }

  private _formatSummary(): string {
    if (this._outputs.length === 0) return '  (no outputs)';
    return this._outputs
      .map(o => {
        const frags = o.fragmentSummary.join(', ') || 'none';
        return `  [${o.index}] ${o.outputType.padEnd(12)} level=${o.stackLevel} block=${o.sourceBlockKey} frags=[${frags}]`;
      })
      .join('\n');
  }
}
