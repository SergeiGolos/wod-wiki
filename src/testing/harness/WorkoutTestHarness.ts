import { JitCompiler } from '@/runtime/compiler';
import { IRuntimeBlockStrategy } from '@/runtime/contracts';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { MdTimerRuntime } from '@/parser/md-timer';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock } from '@/runtime/RuntimeClock';
import { WodScript } from '@/parser/WodScript';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { RuntimeSpan } from '@/runtime/models/RuntimeSpan';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { DialectRegistry } from '@/services/DialectRegistry';
import { IDialect } from '@/core/models/Dialect';

/**
 * Workout Report - Summary of workout execution
 */
export interface WorkoutReport {
  /** Number of full rounds completed */
  roundsCompleted: number;
  /** Partial round progress (number of exercises/reps into current round) */
  partialReps: number;
  /** Current round (1-indexed) */
  currentRound: number;
  /** Total elapsed time in milliseconds */
  elapsedTime: number;
  /** Total reps per exercise { exerciseName: count } */
  totalReps: Record<string, number>;
  /** Rest time taken in milliseconds */
  restTaken: number;
  /** Whether the workout is complete */
  isComplete: boolean;
  /** All fragments collected during execution */
  fragments: ICodeFragment[][];
  /** All execution spans */
  spans: RuntimeSpan[];
}

/**
 * WorkoutTestHarness - Extended test harness for workout-specific testing.
 * 
 * Provides:
 * - Progress tracking and reporting
 * - Fragment collection
 * - Clock manipulation for timer testing
 * - Convenience methods for workout simulation
 */
export class WorkoutTestHarness {
  readonly runtime: ScriptRuntime;
  readonly script: WodScript;
  readonly jit: JitCompiler;
  
  private _roundsCompleted = 0;
  private _currentRound = 1;
  private _partialReps = 0;
  private _restTaken = 0;
  private _exerciseReps: Record<string, number> = {};
  private _collectedFragments: ICodeFragment[][] = [];

  constructor(
    scriptText: string,
    strategies: IRuntimeBlockStrategy[] = [],
    private _clockTime: Date = new Date(),
    dialectRegistry?: DialectRegistry
  ) {
    // 1. Parser
    const parser = new MdTimerRuntime();
    this.script = parser.read(scriptText) as WodScript;

    // 2. JIT (with optional dialect registry)
    this.jit = new JitCompiler(strategies, dialectRegistry);

    // 3. Runtime dependencies
    const clock = createMockClock(_clockTime);
    const memory = new RuntimeMemory();
    const stack = new RuntimeStack();
    const eventBus = new EventBus();

    // 4. Runtime
    this.runtime = new ScriptRuntime(
      this.script,
      this.jit,
      {
        memory,
        stack,
        clock,
        eventBus
      }
    );
  }

  // ========== Quick Accessors ==========

  get stackDepth(): number { 
    return this.runtime.stack.count; 
  }
  
  get currentBlock(): IRuntimeBlock | undefined { 
    return this.runtime.stack.current; 
  }

  // ========== Lifecycle Operations ==========

  /**
   * Mount the workout by pushing the first statement.
   * Initializes the workout execution.
   */
  mount(): void {
    if (this.script.statements.length === 0) {
      throw new Error('No statements in script to mount');
    }
    
    const statement = this.script.statements[0];
    const block = this.jit.compile([statement as ICodeStatement], this.runtime);
    if (!block) {
      throw new Error('Failed to compile root statement');
    }
    
    this.runtime.pushBlock(block);
    this._collectFragments();
  }

  /**
   * Advance to the next exercise/block.
   * Simulates completing the current item and moving forward.
   */
  next(): void {
    if (this.stackDepth === 0) {
      throw new Error('Cannot call next() - stack is empty');
    }
    
    // Track the current block before popping
    const current = this.currentBlock;
    if (current) {
      this._trackExerciseCompletion(current);
    }
    
    this.runtime.popBlock();
    this._collectFragments();
  }

  /**
   * Complete the workout early (user stops).
   */
  complete(): void {
    // Pop all blocks and mark as complete
    while (this.stackDepth > 0) {
      this.runtime.popBlock();
    }
  }

  // ========== Clock Operations ==========

  /**
   * Advance the mock clock by the specified milliseconds.
   */
  advanceClock(ms: number): void {
    this.runtime.clock.advance(ms);
  }

  /**
   * Get the current clock time.
   */
  get clockTime(): number {
    return this.runtime.clock.now;
  }

  // ========== Reporting ==========

  /**
   * Check if the workout is complete (stack empty).
   */
  isComplete(): boolean {
    return this.runtime.isComplete();
  }

  /**
   * Get the current workout report.
   */
  getReport(): WorkoutReport {
    return {
      roundsCompleted: this._roundsCompleted,
      partialReps: this._partialReps,
      currentRound: this._currentRound,
      elapsedTime: this.runtime.clock.now - this._clockTime.getTime(),
      totalReps: { ...this._exerciseReps },
      restTaken: this._restTaken,
      isComplete: this.isComplete(),
      fragments: this._collectedFragments,
      spans: this.runtime.tracker.getAllSpans()
    };
  }

  /**
   * Set the current round (for testing round tracking).
   */
  setRound(round: number): void {
    this._currentRound = round;
  }

  /**
   * Increment completed rounds.
   */
  completeRound(): void {
    this._roundsCompleted++;
    this._currentRound++;
    this._partialReps = 0;
  }

  /**
   * Record rest time taken.
   */
  addRestTime(ms: number): void {
    this._restTaken += ms;
  }

  // ========== Private Helpers ==========

  private _trackExerciseCompletion(block: IRuntimeBlock): void {
    const label = block.label || 'Unknown';
    
    // Extract rep count and exercise name from label
    // Handle formats: "5 Pullups", "- 5 Pullups", "+ 5 Pullups"
    const repMatch = label.match(/^[+\-]?\s*(\d+)\s+(.+)$/);
    const reps = repMatch ? parseInt(repMatch[1], 10) : 1;
    const exerciseName = repMatch ? repMatch[2] : label;
    
    this._exerciseReps[exerciseName] = (this._exerciseReps[exerciseName] || 0) + reps;
    this._partialReps++;
  }

  private _collectFragments(): void {
    const current = this.currentBlock;
    if (current?.fragments) {
      this._collectedFragments.push(current.fragments);
    }
  }
}

/**
 * Builder for WorkoutTestHarness with fluent API.
 */
export class WorkoutTestBuilder {
  private _scriptText = '';
  private _strategies: IRuntimeBlockStrategy[] = [];
  private _clockTime = new Date('2024-01-01T12:00:00Z');
  private _dialectRegistry?: DialectRegistry;

  withScript(text: string): this {
    this._scriptText = text;
    return this;
  }

  withStrategy(strategy: IRuntimeBlockStrategy): this {
    this._strategies.push(strategy);
    return this;
  }

  withStrategies(strategies: IRuntimeBlockStrategy[]): this {
    this._strategies.push(...strategies);
    return this;
  }

  withClock(time: Date): this {
    this._clockTime = time;
    return this;
  }

  withDialect(dialect: IDialect): this {
    if (!this._dialectRegistry) {
      this._dialectRegistry = new DialectRegistry();
    }
    this._dialectRegistry.register(dialect);
    return this;
  }

  withDialectRegistry(registry: DialectRegistry): this {
    this._dialectRegistry = registry;
    return this;
  }

  build(): WorkoutTestHarness {
    return new WorkoutTestHarness(this._scriptText, this._strategies, this._clockTime, this._dialectRegistry);
  }
}
