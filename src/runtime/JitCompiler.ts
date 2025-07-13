import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IMetricInheritance } from "./IMetricInheritance";
import { MetricComposer } from "./MetricComposer";
import { RuntimeJitStrategies, IRuntimeBlockStrategy, JitStatement } from "./RuntimeJitStrategies";
import { FragmentCompilationManager, FragmentCompilationContext } from "./FragmentCompilationManager";
import { IdleRuntimeBlock } from "./IdleRuntimeBlock";
import { DoneRuntimeBlock } from "./DoneRuntimeBlock";
import { RootBlock } from "./RootBlock";
import { BlockEffortStrategy } from "./BlockEffortStrategy";
import { BlockTimerStrategy } from "./BlockTimerStrategy";
import { ITimerRuntime } from "./ITimerRuntime";
import { EventHandler } from "./EventHandler";

// Placeholder interface for RuntimeScript - this will need to be implemented or imported
interface RuntimeScript {
  statements: JitStatement[];
}

/**
 * Just-In-Time Compiler for Runtime Blocks that compiles JitStatement nodes 
 * into executable IRuntimeBlock instances on demand. Serves as the central 
 * compilation engine coordinating fragment compilation, strategy management, 
 * and block creation in the Wod.Wiki runtime system.
 */
export class JitCompiler {
  public script: RuntimeScript;
  private strategyManager: RuntimeJitStrategies;
  private fragmentCompiler: FragmentCompilationManager;
  private handlers: EventHandler[];

  constructor(script: RuntimeScript) {
    this.script = script;
    
    // Initialize strategy manager and fragment compiler with concrete implementations
    this.strategyManager = new RuntimeJitStrategies();
    this.fragmentCompiler = new FragmentCompilationManager();
    this.handlers = []; // Initialize with actual handlers
    
    // Register default strategies in priority order (last added = highest priority)
    this.strategyManager.addStrategy(new BlockEffortStrategy());
    this.strategyManager.addStrategy(new BlockTimerStrategy());
  }

  /**
   * Creates an idle runtime block for when the system is not actively executing.
   */
  idle(runtime: ITimerRuntime): IRuntimeBlock {
    return new IdleRuntimeBlock();
  }

  /**
   * Creates a completion block for when workout execution is finished.
   */
  end(runtime: ITimerRuntime): IRuntimeBlock {
    return new DoneRuntimeBlock();
  }

  /**
   * Creates the root runtime block that serves as the top-level execution container.
   */
  root(runtime: ITimerRuntime): IRuntimeBlock {
    // Compile all statements from the script into child blocks
    const childBlocks: IRuntimeBlock[] = [];
    
    for (const statement of this.script.statements) {
      const compiledBlock = this.compile([statement], runtime);
      if (compiledBlock) {
        childBlocks.push(compiledBlock);
      }
    }
    
    return new RootBlock(childBlocks);
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
  compile(nodes: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
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
  }

  /**
   * Applies metric inheritance rules from parent blocks in the runtime stack.
   */
  private applyMetricInheritance(baseMetrics: RuntimeMetric[], runtime: ITimerRuntime): RuntimeMetric[] {
    // Get inheritance stack from parent blocks
    const inheritanceStack: IMetricInheritance[] = [];
    
    if (runtime.stack) {
      const parentBlocks = runtime.stack.getParentBlocks();
      
      // Build inheritance stack from outermost parent to immediate parent
      for (const parentBlock of parentBlocks) {
        inheritanceStack.push(parentBlock.inherit());
      }
    }

    // Create a MetricComposer and apply inheritance rules
    const composer = new MetricComposer(baseMetrics);
    return composer.compose(inheritanceStack);
  }

  /**
   * Creates compilation context for fragment compilation.
   */
  private createCompilationContext(runtime: ITimerRuntime): FragmentCompilationContext {
    return FragmentCompilationManager.createContext(runtime, runtime.stack?.depth() || 0);
  }
}
