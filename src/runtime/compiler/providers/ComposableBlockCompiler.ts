import { ICodeStatement } from '@/core/models/CodeStatement';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockKey } from '@/core/models/BlockKey';
import { BlockContext } from '../../BlockContext';
import { RuntimeBlock } from '../../RuntimeBlock';
import { PassthroughFragmentDistributor } from '../../contracts/IDistributedFragments';
import { IBehaviorProvider, ICompilationContext } from './IBehaviorProvider';
import { CompilationContext } from './CompilationContext';
import { BehaviorValidator, ValidationResult } from './BehaviorValidation';

/**
 * Determines block type from collected hints and behaviors.
 */
function determineBlockType(context: ICompilationContext): string {
  const hints = context.blockTypeHints;
  
  // Priority order for block type determination
  const priorityOrder = ['Interval', 'AMRAP', 'Timer', 'Rounds', 'Group', 'Effort'];
  
  for (const type of priorityOrder) {
    if (hints.includes(type)) {
      return type;
    }
  }
  
  // Default fallback
  return 'Block';
}

/**
 * Determines block label from type and statement.
 */
function determineLabel(blockType: string, _statement: ICodeStatement): string {
  const labelMap: Record<string, string> = {
    'Interval': 'EMOM',
    'AMRAP': 'AMRAP',
    'Timer': 'Timer',
    'Rounds': 'Rounds',
    'Group': 'Group',
    'Effort': 'Effort',
  };
  return labelMap[blockType] || blockType;
}

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
  const stmt = statement as ICodeStatement & { exerciseId?: string };
  return stmt.exerciseId ?? '';
}

/**
 * ComposableBlockCompiler orchestrates behavior providers to build runtime blocks.
 * 
 * The compilation process:
 * 1. Providers are sorted by priority (highest first)
 * 2. Each provider is asked if it can contribute
 * 3. Contributing providers add behaviors to the context
 * 4. Exclusions and requirements are tracked
 * 5. Final behaviors are validated for dependencies
 * 6. Block is created with composed behaviors
 */
export class ComposableBlockCompiler {
  private providers: IBehaviorProvider[] = [];
  private readonly validator = new BehaviorValidator();

  constructor(providers: IBehaviorProvider[] = []) {
    this.providers = [...providers].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a behavior provider.
   */
  registerProvider(provider: IBehaviorProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered providers (for debugging).
   */
  getProviders(): IBehaviorProvider[] {
    return [...this.providers];
  }

  /**
   * Compile a statement into a runtime block using composable providers.
   */
  compile(statement: ICodeStatement, runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (!statement) {
      return undefined;
    }

    // Create compilation context
    const distributor = new PassthroughFragmentDistributor();
    const fragmentGroups = distributor.distribute(statement.fragments || [], 'Block');
    const blockKey = new BlockKey();
    const blockId = blockKey.toString();
    const exerciseId = getExerciseId(statement);
    const blockContext = new BlockContext(runtime, blockId, exerciseId);
    const sourceIds = statement.id !== undefined ? [statement.id as number] : [];

    const context = new CompilationContext(
      blockKey,
      blockId,
      exerciseId,
      blockContext,
      fragmentGroups,
      statement,
      sourceIds
    );

    // Process providers in priority order
    const contributions: { provider: IBehaviorProvider; contribution: ReturnType<IBehaviorProvider['provide']> }[] = [];

    for (const provider of this.providers) {
      try {
        // Skip if this provider's group is already handled by a higher-priority provider
        if (provider.group) {
          const sameGroupProvided = contributions.some(
            c => c.provider.group === provider.group
          );
          if (sameGroupProvided) {
            continue;
          }
        }

        if (provider.canProvide(statement, runtime, context)) {
          const contribution = provider.provide(statement, runtime, context);
          contributions.push({ provider, contribution });

          // Add behaviors to context
          for (const behavior of contribution.behaviors) {
            const typeName = behavior.constructor.name;
            
            // Skip excluded behaviors
            if (context.isExcluded(typeName)) {
              continue;
            }
            
            context.addBehavior(behavior);
          }

          // Register exclusions
          if (contribution.excludes) {
            for (const excluded of contribution.excludes) {
              context.addExclusion(excluded);
            }
          }

          // Register block type hint
          if (contribution.blockTypeHint) {
            context.addBlockTypeHint(contribution.blockTypeHint);
          }
        }
      } catch (error) {
        console.error(`[ComposableBlockCompiler] Provider ${provider.id} failed:`, error);
      }
    }

    // Check if any behaviors were collected
    const behaviors = context.currentBehaviors;
    if (behaviors.length === 0) {
      return undefined;
    }

    // Validate behaviors
    const validationResult = this.validator.validate(behaviors);
    if (!validationResult.valid) {
      console.error('[ComposableBlockCompiler] Validation failed:', validationResult.errors);
      // We still return the block but log the errors
      // In strict mode, we could throw here
    }

    // Determine block type and label
    const blockType = determineBlockType(context);
    const label = determineLabel(blockType, statement);

    // Create the runtime block
    return new RuntimeBlock(
      runtime,
      sourceIds,
      behaviors,
      blockContext,
      blockKey,
      blockType,
      label,
      fragmentGroups
    );
  }

  /**
   * Validate a set of behaviors without creating a block.
   * Useful for testing and debugging.
   */
  validateBehaviors(statement: ICodeStatement, runtime: IScriptRuntime): ValidationResult {
    // Create compilation context to collect behaviors
    const distributor = new PassthroughFragmentDistributor();
    const fragmentGroups = distributor.distribute(statement.fragments || [], 'Block');
    const blockKey = new BlockKey();
    const blockId = blockKey.toString();
    const exerciseId = getExerciseId(statement);
    const blockContext = new BlockContext(runtime, blockId, exerciseId);
    const sourceIds = statement.id !== undefined ? [statement.id as number] : [];

    const context = new CompilationContext(
      blockKey,
      blockId,
      exerciseId,
      blockContext,
      fragmentGroups,
      statement,
      sourceIds
    );

    // Process providers to collect behaviors
    for (const provider of this.providers) {
      try {
        if (provider.canProvide(statement, runtime, context)) {
          const contribution = provider.provide(statement, runtime, context);
          for (const behavior of contribution.behaviors) {
            if (!context.isExcluded(behavior.constructor.name)) {
              context.addBehavior(behavior);
            }
          }
          if (contribution.excludes) {
            for (const excluded of contribution.excludes) {
              context.addExclusion(excluded);
            }
          }
        }
      } catch (error) {
        // Skip failing providers
      }
    }

    const behaviors = context.currentBehaviors;
    if (behaviors.length === 0) {
      return { valid: false, errors: ['No behaviors contributed'], warnings: [] };
    }
    return this.validator.validate(behaviors);
  }
}
