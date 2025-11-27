/**
 * Block Factories for Testing
 * 
 * Creates blocks from parsed WOD syntax strings using the actual JIT compiler
 * and strategies, enabling realistic integration tests.
 */

import { MdTimerRuntime } from '../../src/parser/md-timer';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { IScriptRuntime } from '../../src/runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { CodeStatement, ICodeStatement } from '../../src/core/models/CodeStatement';
import { 
  EffortStrategy,
  TimerStrategy, 
  RoundsStrategy, 
  GroupStrategy,
  TimeBoundRoundsStrategy,
  IntervalStrategy
} from '../../src/runtime/strategies';

/**
 * Parsed script result with helper methods
 */
export interface ParsedScript {
  /** Original source text */
  source: string;
  
  /** All parsed statements */
  statements: ICodeStatement[];
  
  /** Any parse errors */
  errors: any[];
  
  /** Get statement by index (0-based) */
  getAt(index: number): ICodeStatement | undefined;
  
  /** Get statements by indices */
  getMany(indices: number[]): ICodeStatement[];
}

/**
 * Parse a WOD syntax string into statements
 */
export function parseWodScript(source: string): ParsedScript {
  const parser = new MdTimerRuntime();
  const script = parser.read(source);
  
  return {
    source,
    statements: script.statements,
    errors: script.errors || [],
    getAt: (index: number) => script.statements[index],
    getMany: (indices: number[]) => indices.map(i => script.statements[i]).filter(Boolean) as ICodeStatement[]
  };
}

/**
 * Create a JIT compiler with all standard strategies registered
 * in the correct precedence order
 */
export function createStandardCompiler(): JitCompiler {
  const compiler = new JitCompiler();
  
  // Register in precedence order (most specific first)
  compiler.registerStrategy(new TimeBoundRoundsStrategy()); // AMRAP
  compiler.registerStrategy(new IntervalStrategy());        // EMOM
  compiler.registerStrategy(new TimerStrategy());           // For Time
  compiler.registerStrategy(new RoundsStrategy());          // Rounds
  compiler.registerStrategy(new GroupStrategy());           // Nested groups
  compiler.registerStrategy(new EffortStrategy());          // Fallback
  
  return compiler;
}

/**
 * Block factory result with metadata
 */
export interface BlockFactoryResult {
  /** The compiled block */
  block: IRuntimeBlock;
  
  /** The statements used to compile */
  statements: ICodeStatement[];
  
  /** The strategy that matched */
  strategyUsed: string;
}

/**
 * Options for block factory
 */
export interface BlockFactoryOptions {
  /** Index of the statement to compile (default: 0) */
  statementIndex?: number;
  
  /** Multiple statement indices to compile together */
  statementIndices?: number[];
  
  /** Include children of the statement */
  includeChildren?: boolean;
}

/**
 * Factory function type for TestScenario
 */
export type BlockFactory = (runtime: IScriptRuntime) => IRuntimeBlock;

/**
 * Create a block factory from a WOD syntax string
 * 
 * @param source - WOD syntax (e.g., "5 Pullups", "3 Rounds\n  10 Pushups")
 * @param options - Which statement(s) to compile
 * @returns A factory function that creates the block given a runtime
 * 
 * @example
 * // Simple effort
 * const factory = createBlockFactory("5 Pullups");
 * 
 * // Select specific statement from multi-line
 * const factory = createBlockFactory("3 Rounds\n  10 Pushups\n  15 Squats", { statementIndex: 1 });
 * 
 * // Compile parent with children
 * const factory = createBlockFactory("3 Rounds\n  10 Pushups", { includeChildren: true });
 */
export function createBlockFactory(
  source: string,
  options: BlockFactoryOptions = {}
): BlockFactory {
  const { statementIndex = 0, statementIndices, includeChildren = false } = options;
  
  return (runtime: IScriptRuntime): IRuntimeBlock => {
    const parsed = parseWodScript(source);
    
    if (parsed.errors.length > 0) {
      console.warn('Parse errors:', parsed.errors);
    }
    
    // Determine which statements to compile
    let statementsToCompile: ICodeStatement[];
    
    if (statementIndices && statementIndices.length > 0) {
      statementsToCompile = parsed.getMany(statementIndices);
    } else {
      const statement = parsed.getAt(statementIndex);
      if (!statement) {
        throw new Error(`No statement at index ${statementIndex}. Found ${parsed.statements.length} statements.`);
      }
      statementsToCompile = [statement];
      
      // Include children if requested
      if (includeChildren && statement.children && statement.children.length > 0) {
        const childIds = statement.children.flat();
        const childStatements = parsed.statements.filter(s => childIds.includes(s.id as number));
        statementsToCompile = [...statementsToCompile, ...childStatements];
      }
    }
    
    // Compile using the runtime's JIT compiler
    const block = runtime.jit.compile(statementsToCompile as CodeStatement[], runtime);
    
    if (!block) {
      throw new Error(`Failed to compile statements. Source: ${source}`);
    }
    
    return block;
  };
}

/**
 * Pre-built factory functions for common block types
 */
export const BlockFactories = {
  /**
   * Effort Block Factories
   */
  effort: {
    /** Generic effort (no reps) - requires user action to complete */
    generic: (description: string = 'Run 400m') => 
      createBlockFactory(description),
    
    /** Effort with explicit reps - auto-completes when reps reached */
    withReps: (reps: number, exercise: string = 'Pullups') => 
      createBlockFactory(`${reps} ${exercise}`),
    
    /** Rest effort */
    rest: () => createBlockFactory('Rest'),
  },
  
  /**
   * Timer Block Factories
   */
  timer: {
    /** For Time - counts up until children complete */
    forTime: (duration: string = '20:00', children: string[] = []) => {
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `${duration}\n${childLines}`.trim(),
        { includeChildren: children.length > 0 }
      );
    },
    
    /** Simple timer without children */
    simple: (duration: string = '10:00') => 
      createBlockFactory(duration),
  },
  
  /**
   * Rounds Block Factories
   */
  rounds: {
    /** Fixed rounds */
    fixed: (roundCount: number, children: string[] = ['10 Pushups']) => {
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `${roundCount} Rounds\n${childLines}`,
        { includeChildren: true }
      );
    },
    
    /** Rep scheme (21-15-9 style) */
    repScheme: (scheme: number[], children: string[] = ['Thrusters', 'Pullups']) => {
      const schemeStr = scheme.join('-');
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `${schemeStr}\n${childLines}`,
        { includeChildren: true }
      );
    },
  },
  
  /**
   * AMRAP (Time Bound Rounds) Factories
   */
  amrap: {
    /** Standard AMRAP */
    standard: (duration: string = '20:00', children: string[] = ['5 Pullups', '10 Pushups', '15 Squats']) => {
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `${duration} AMRAP\n${childLines}`,
        { includeChildren: true }
      );
    },
  },
  
  /**
   * EMOM (Interval) Factories
   */
  emom: {
    /** Standard EMOM */
    standard: (minutes: number = 10, children: string[] = ['3 Cleans']) => {
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `EMOM ${minutes}\n${childLines}`,
        { includeChildren: true }
      );
    },
  },
  
  /**
   * Group Block Factories
   */
  group: {
    /** Simple nested group */
    simple: (label: string = 'Warmup', children: string[] = ['Stretch', 'Jog']) => {
      const childLines = children.map(c => `  ${c}`).join('\n');
      return createBlockFactory(
        `${label}\n${childLines}`,
        { includeChildren: true }
      );
    },
  },
};

/**
 * Utility to inspect what strategy would match a given source
 */
export function inspectStrategyMatch(source: string, runtime: IScriptRuntime): string {
  const parsed = parseWodScript(source);
  const statement = parsed.getAt(0);
  
  if (!statement) {
    return 'NO_STATEMENTS';
  }
  
  const strategies: [string, { match: (s: ICodeStatement[], r: IScriptRuntime) => boolean }][] = [
    ['TimeBoundRoundsStrategy', new TimeBoundRoundsStrategy()],
    ['IntervalStrategy', new IntervalStrategy()],
    ['TimerStrategy', new TimerStrategy()],
    ['RoundsStrategy', new RoundsStrategy()],
    ['GroupStrategy', new GroupStrategy()],
    ['EffortStrategy', new EffortStrategy()],
  ];
  
  for (const [name, strategy] of strategies) {
    if (strategy.match([statement], runtime)) {
      return name;
    }
  }
  
  return 'NO_MATCH';
}
