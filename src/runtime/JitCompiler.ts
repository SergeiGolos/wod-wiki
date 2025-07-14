import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IMetricInheritance } from "./IMetricInheritance";
import { MetricComposer } from "./MetricComposer";
import { RootBlock } from "./blocks/RootBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

// Placeholder interfaces - these will need to be implemented or imported from the actual codebase
interface RuntimeScript {
  statements: any[]; // Array of statements from the script
  source?: string;   // Optional source text
}

interface ITimerRuntime {
  // Runtime properties and methods
  stack?: RuntimeStack;
}

interface RuntimeStack {
  // Stack methods for getting parent blocks
  getParentBlocks(): IRuntimeBlock[];
}

interface JitStatement {
  // Statement properties
  fragments: any[];
}


interface FragmentCompilationManager {
  compileStatementFragments(statement: JitStatement, context: FragmentCompilationContext): RuntimeMetric;
}

interface FragmentCompilationContext {
  // Context properties
}

export class RuntimeJitStrategies implements IRuntimeJitStrategies {
  addStrategy(strategy: IRuntimeBlockStrategy): IRuntimeJitStrategies {
    this.strategies.push(strategy);
    return this as IRuntimeJitStrategies;
  }
  private strategies: IRuntimeBlockStrategy[] = []; 
  public compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    for (const strategy of this.strategies) {
      const block = strategy.compile(compiledMetrics, runtime);
      if (block) {
        return block;
      }
    }
    return undefined; // No strategy could handle the compilation
  }
}

interface IRuntimeJitStrategies {
  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined;
  addStrategy(strategy: IRuntimeBlockStrategy): IRuntimeJitStrategies;
}

interface EventHandler {
  // Event handler interface
}

/**
 * Just-In-Time Compiler for Runtime Blocks that compiles JitStatement nodes 
 * into executable IRuntimeBlock instances on demand. Serves as the central 
 * compilation engine coordinating fragment compilation, strategy management, 
 * and block creation in the Wod.Wiki runtime system.
 */
export class JitCompiler {
  public isCompiling: boolean = false;
  public script: RuntimeScript;
  private strategyManager: IRuntimeJitStrategies;
  private fragmentCompiler: FragmentCompilationManager;

  constructor(script: RuntimeScript, fragmentCompiler: FragmentCompilationManager, strategyManager: IRuntimeJitStrategies) {
    this.script = script;
    this.fragmentCompiler = fragmentCompiler;
    this.strategyManager = strategyManager;
  }

  /**
   * Creates an idle runtime block for when the system is not actively executing.
   */
  idle(runtime: ITimerRuntime): IRuntimeBlock {
    // Return IdleRuntimeBlock instance
    throw new Error("IdleRuntimeBlock not implemented yet");
  }

  /**
   * Creates a completion block for when workout execution is finished.
   */
  end(runtime: ITimerRuntime): IRuntimeBlock {
    // Return DoneRuntimeBlock instance
    throw new Error("DoneRuntimeBlock not implemented yet");
  }

  /**
   * Creates the root runtime block that serves as the top-level execution container.
   */
  root(): IRuntimeBlock {
    console.log(`🌱 JitCompiler.root() - Creating root block from script statements`);
    
    // Get all statements that start at column position 0 (no indentation)
    const rootStatements = this.script.statements
      .filter(stmt => stmt.meta?.columnStart === 0)
      .map(stmt => stmt.id.toString());
    
    console.log(`  📝 Found ${rootStatements.length} root-level statements: [${rootStatements.join(', ')}]`);
    
    return new RootBlock(rootStatements);
  }

  /**
   * Registers a custom block compilation strategy with the strategy manager.
   */
  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategyManager.addStrategy(strategy);
  }

  /**
   * Compiles an array of JitStatement nodes into an executable runtime block 
   * using the two-phase compilation process with metric inheritance.
   * 
   * @param nodes Array of JitStatement nodes to compile
   * @param runtime Timer runtime instance for context
   * @returns Compiled runtime block or undefined if compilation fails
   */
  compile(nodes: JitStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    this.isCompiling = true;
    try {
      // Phase 1: Fragment Compilation - compile each statement's fragments into RuntimeMetric objects
      const compiledMetrics: RuntimeMetric[] = [];
    
      for (const statement of nodes) {
        const context = this.createCompilationContext(runtime); 
        const metric = this.fragmentCompiler.compileStatementFragments(statement, context);
        compiledMetrics.push(metric);
      }

      // Phase 2: Metric Inheritance - apply inheritance rules from parent blocks
      const composedMetrics = this.applyMetricInheritance(compiledMetrics, runtime);

      // Phase 3: Block Creation - use strategy pattern to create the appropriate block
      return this.strategyManager.compile(composedMetrics, nodes, runtime);
    } finally {
      this.isCompiling = false;
    }
  }

  /**
   * Applies metric inheritance rules from parent blocks in the runtime stack.
   */
  private applyMetricInheritance(baseMetrics: RuntimeMetric[], runtime: IScriptRuntime): RuntimeMetric[] {
    // Get inheritance stack from parent blocks
    const inheritanceStack: IMetricInheritance[] = [];
    
    if (runtime.stack) {
      const parentBlocks = runtime.stack.getParentBlocks();
      
      // Build inheritance stack from outermost parent to immediate parent
      for (const parentBlock of parentBlocks) {
        parentBlock.inherit().forEach(inheritance => {
          inheritanceStack.push(inheritance);
        });
      }
    }

    // Create a MetricComposer and apply inheritance rules
    const composer = new MetricComposer(baseMetrics);
    return composer.compose(inheritanceStack);
  }

  /**
   * Creates compilation context for fragment compilation.
   */
  private createCompilationContext(runtime: IScriptRuntime): FragmentCompilationContext {
    // Create context with runtime and block state
    // This would need to be implemented based on the actual context requirements
    return {} as FragmentCompilationContext;
  }
}
