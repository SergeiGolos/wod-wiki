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
import { LoopCoordinatorBehavior, LoopType } from "../behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Strategy that creates rounds-based parent blocks for multi-round workouts.
 * Matches statements with Rounds fragments but NOT Timer fragments.
 * Timer takes precedence over Rounds.
 */
export class RoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('RoundsStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('RoundsStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);

        // Match rounds BUT NOT timer (timer takes precedence)
        return hasRounds && !hasTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // Compile statement fragments to metrics using FragmentCompilationManager
        const compiledMetric: RuntimeMetric = runtime.fragmentCompiler.compileStatementFragments(
            code[0] as CodeStatement,
            runtime
        );

        // Extract rounds configuration from fragments
        const fragments = code[0]?.fragments || [];
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);

        if (!roundsFragment) {
          console.error('RoundsStrategy: No Rounds fragment found');
          throw new Error('RoundsStrategy requires Rounds fragment');
        }

        // Extract rep scheme
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
          repScheme = roundsFragment.value as number[];
          totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
          totalRounds = roundsFragment.value;
        }

        // Get children IDs
        let children = code[0]?.children || [];

        if (children.length === 0 && code.length > 1) {
          const siblingIds = code.slice(1).map(s => s.id as number);
          children = [siblingIds];
        } else if (children.length === 0) {
          throw new Error(`RoundsStrategy requires child statements to execute.`);
        }

        // Create BlockContext
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = compiledMetric.exerciseId || (code[0] as any)?.exerciseId || '';
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];

        const loopType = repScheme ? LoopType.REP_SCHEME : LoopType.FIXED;
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType,
            totalRounds,
            repScheme,
            onRoundStart: (rt, roundIndex) => {
                if (repScheme && repScheme.length > roundIndex) {
                     const currentReps = repScheme[roundIndex];
                     const refs = rt.memory.search({
                         type: MemoryTypeEnum.METRIC_REPS,
                         ownerId: blockId,
                         id: null,
                         visibility: 'inherited'
                     });
                     if (refs.length > 0) {
                         rt.memory.set(refs[0] as any, currentReps);
                     }
                }
            }
        });
        behaviors.push(loopCoordinator);
        behaviors.push(new HistoryBehavior("Rounds"));

        // Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['rounds:complete']
        ));

        // Allocate public reps metric if rep scheme
        if (repScheme && repScheme.length > 0) {
             context.allocate(
                MemoryTypeEnum.METRIC_REPS,
                repScheme[0],
                'inherited'
            );


        }

        const label = repScheme ? repScheme.join('-') : `${totalRounds} Rounds`;

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Rounds",
            label,
            compiledMetric
        );
    }
}
