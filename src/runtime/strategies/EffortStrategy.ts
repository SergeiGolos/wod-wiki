import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement, CodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { FragmentType } from "../../core/models/CodeFragment";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { EffortBlock } from "../blocks/EffortBlock";
import { RuntimeMetric } from "../RuntimeMetric";
import { TimerBehavior } from "../behaviors/TimerBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { createDebugMetadata } from "../models/ExecutionSpan";

export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        if (!statements[0].fragments) return false;

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);

        // Only match if NO timer AND NO rounds (pure effort)
        return !hasTimer && !hasRounds;
    }
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // 1. Compile statement fragments to metrics using FragmentCompilationManager
        const compiledMetric: RuntimeMetric = runtime.fragmentCompiler.compileStatementFragments(
            code[0] as CodeStatement,
            runtime
        );

        // 2. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();

        // 3. Extract exerciseId from compiled metric or statement
        const exerciseId = compiledMetric.exerciseId || (code[0] as any)?.exerciseId || '';

        // 4. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);

        // 5. Extract reps from compiled metrics OR inherit from parent's public metric
        let reps: number | undefined = undefined;

        // First, check if compiled metrics contain reps
        const repsValue = compiledMetric.values.find(v => v.type === 'repetitions');
        if (repsValue && typeof repsValue.value === 'number') {
            reps = repsValue.value;
        }

        // Also check fragment for explicit reps (fallback)
        if (reps === undefined) {
            const fragments = code[0]?.fragments || [];
            const repsFragment = fragments.find(f => f.fragmentType === FragmentType.Effort);
            if (repsFragment && typeof repsFragment.value === 'number') {
                reps = repsFragment.value;
            }
        }

        // If no explicit reps, check for inherited reps from parent blocks
        if (reps === undefined) {
          const inheritedRepsRefs = runtime.memory.search({
            type: MemoryTypeEnum.METRIC_REPS,
            visibility: 'inherited',
            id: null,
            ownerId: null
          });

          if (inheritedRepsRefs.length > 0) {
            // Use the most recent inherited reps metric (last in array)
            const latestRepsRef = inheritedRepsRefs[inheritedRepsRefs.length - 1];
            const inheritedReps = runtime.memory.get(latestRepsRef as any);
            if (inheritedReps !== undefined) {
              reps = inheritedReps as number;
            }
          }
        }

        // 6. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // Effort blocks are leaf nodes that complete on first next() call (not on push)
        // This prevents recursion during mount where push -> complete -> pop -> next -> push...
        // TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here

        // For generic Effort blocks (no reps), we want them to complete ONLY on user 'next' action
        // NOT on periodic 'tick' (which calls next())
        // So we disable checkOnNext, and rely on triggerEvents=['next']
        behaviors.push(new CompletionBehavior(
            () => true, // Always complete when checked
            ['next'], // Check on 'next' event (User Action)
            false, // Don't check on push
            false  // Don't check on next() (Tick)
        ));

        // 7. Create RuntimeBlock with context and compiled metrics
        // Use EffortBlock if reps are specified, otherwise fallback to generic RuntimeBlock
        // This ensures proper rep tracking and completion logic
        if (reps !== undefined) {
            // Extract exercise name from compiled metric
            const exerciseName = compiledMetric.exerciseId || (code[0] as any)?.exerciseName || "Exercise";

            return new EffortBlock(
                runtime,
                code[0]?.id ? [code[0].id] : [],
                {
                    exerciseName,
                    targetReps: reps
                },
                compiledMetric
            );
        }

        // Add TimerBehavior for generic effort blocks (count up)
        behaviors.push(new TimerBehavior('up', undefined, 'Segment Timer', 'primary'));
        
        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify effort blocks
        behaviors.push(new HistoryBehavior({
            label: "Effort",
            debugMetadata: createDebugMetadata(
                ['effort', 'leaf_node'],
                {
                    strategyUsed: 'EffortStrategy',
                    exerciseId: exerciseId || undefined
                }
            )
        }));

        const block = new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort",
            "Effort",
            compiledMetric
        );

        return block;
    }
}
