import { RuntimeMetric, MetricValue } from "./RuntimeMetric";

export interface JitStatement {
  fragments: any[];
  id: string;
}

export interface FragmentCompilationContext {
  runtimeState: {
    isActive: boolean;
    isPaused: boolean;
    elapsedTime: number;
    currentRep: number;
    currentRound: number;
  };
  blockContext: {
    blockKey: string;
    childBlocks: any[];
    isRepeating: boolean;
    iterationCount: number;
  };
  parentMetrics: RuntimeMetric[];
  executionDepth: number;
  currentTime: number;
  currentRound: number;
}

/**
 * Manages the compilation of code fragments into structured RuntimeMetric objects.
 * This class is responsible for the first phase of JIT compilation, converting
 * raw statement fragments into typed metric values that can be processed by
 * the metric inheritance system.
 */
export class FragmentCompilationManager {

  /**
   * Compiles statement fragments into a structured RuntimeMetric object.
   * @param statement The JitStatement containing fragments to compile
   * @param context The compilation context providing runtime and block state
   * @returns A compiled RuntimeMetric object
   */
  compileStatementFragments(statement: JitStatement, context: FragmentCompilationContext): RuntimeMetric {
    const values: MetricValue[] = [];
    let effort = '';

    // Process each fragment in the statement
    for (const fragment of statement.fragments) {
      if (fragment.type === 'action') {
        effort = fragment.value?.toString() || 'Unknown Exercise';
      } else {
        const compiledValue = this.compileFragment(fragment, context);
        if (compiledValue) {
          values.push(compiledValue);
        }
      }
    }

    return {
      sourceId: statement.id,
      effort: effort || 'Unknown Exercise',
      values: values
    };
  }

  /**
   * Compiles a single fragment into a MetricValue.
   * @param fragment The fragment to compile
   * @param context The compilation context
   * @returns A MetricValue or undefined if the fragment cannot be compiled
   */
  private compileFragment(fragment: any, context: FragmentCompilationContext): MetricValue | undefined {
    if (!fragment || !fragment.type) {
      return undefined;
    }

    const value = this.extractNumericValue(fragment.value);
    if (value === undefined) {
      return undefined;
    }

    switch (fragment.type) {
      case 'rep':
        return {
          type: 'repetitions',
          value: value,
          unit: 'reps'
        };

      case 'resistance':
        return {
          type: 'resistance',
          value: value,
          unit: this.extractResistanceUnit(fragment.value)
        };

      case 'distance':
        return {
          type: 'distance',
          value: value,
          unit: this.extractDistanceUnit(fragment.value)
        };

      case 'timer':
        return {
          type: 'time',
          value: value,
          unit: this.extractTimeUnit(fragment.value)
        };

      case 'round':
        return {
          type: 'rounds',
          value: value,
          unit: 'rounds'
        };

      case 'timestamp':
        return {
          type: 'timestamp',
          value: value,
          unit: 'ms'
        };

      default:
        console.warn(`Unknown fragment type: ${fragment.type}`);
        return undefined;
    }
  }

  /**
   * Extracts numeric value from fragment value, handling various input types.
   */
  private extractNumericValue(value: any): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Extract numbers from strings like "95lb", "20:00", "400m"
      const numericMatch = value.match(/\d+(\.\d+)?/);
      if (numericMatch) {
        return parseFloat(numericMatch[0]);
      }
    }

    return undefined;
  }

  /**
   * Extracts the unit from resistance values (lb, kg, etc.).
   */
  private extractResistanceUnit(value: any): string {
    const str = value?.toString() || '';
    if (str.includes('lb')) return 'lb';
    if (str.includes('kg')) return 'kg';
    return 'lb'; // Default to pounds
  }

  /**
   * Extracts the unit from distance values (m, km, ft, etc.).
   */
  private extractDistanceUnit(value: any): string {
    const str = value?.toString() || '';
    if (str.includes('km')) return 'km';
    if (str.includes('ft')) return 'ft';
    if (str.includes('yd')) return 'yd';
    if (str.includes('mi')) return 'mi';
    return 'm'; // Default to meters
  }

  /**
   * Extracts the unit from time values (sec, min, hr).
   */
  private extractTimeUnit(value: any): string {
    const str = value?.toString() || '';
    if (str.includes(':')) {
      // Handle time formats like "20:00" (minutes:seconds)
      return 'min';
    }
    if (str.includes('hr')) return 'hr';
    if (str.includes('min')) return 'min';
    return 'sec'; // Default to seconds
  }

  /**
   * Creates a basic compilation context for fragment processing.
   * @param runtimeState Current runtime state
   * @param executionDepth Current execution depth
   * @returns A FragmentCompilationContext object
   */
  static createContext(runtimeState: any, executionDepth: number = 0): FragmentCompilationContext {
    return {
      runtimeState: {
        isActive: runtimeState?.isActive || false,
        isPaused: runtimeState?.isPaused || false,
        elapsedTime: runtimeState?.elapsedTime || 0,
        currentRep: runtimeState?.currentRep || 1,
        currentRound: runtimeState?.currentRound || 1
      },
      blockContext: {
        blockKey: 'fragment-compilation',
        childBlocks: [],
        isRepeating: false,
        iterationCount: 0
      },
      parentMetrics: [],
      executionDepth: executionDepth,
      currentTime: Date.now(),
      currentRound: 1
    };
  }
}