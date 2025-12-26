import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { FragmentType } from "../../core/models/CodeFragment";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { LoopCoordinatorBehavior, LoopType } from "../behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../utils/metadata";
import { PassthroughFragmentDistributor } from "../IDistributedFragments";
import { ActionLayerBehavior } from "../behaviors/ActionLayerBehavior";

/**
 * Strategy that creates rounds-based parent blocks for multi-round workouts.
 * Matches statements with Rounds fragments but NOT Timer fragments.
 * Timer takes precedence over Rounds.
 *
 * This strategy now supports optional `behavior.fixed_rounds` hint from dialects.
 * The structural fallback is preserved for backward compatibility.
 *
 * Implementation Status: COMPLETE - Match logic uses hints with structural fallback
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

        const statement = statements[0];
        const fragments = statement.fragments;

        // Check for behavior.fixed_rounds hint from dialect
        const isFixedRounds = statement.hints?.has('behavior.fixed_rounds') ?? false;

        // Structural fallback: Has rounds fragment
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);

        // Exclusion: Timer presence means higher-precedence strategy should handle
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);

        // Match if (fixed_rounds hint OR rounds fragment) AND no timer
        return (isFixedRounds || hasRounds) && !hasTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Rounds");

        const exerciseId = (code[0] as any)?.exerciseId || '';

        // Extract rounds configuration from fragments
        const fragments = code[0]?.fragments || [];
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);

        if (!roundsFragment) {
            console.error('RoundsStrategy: No Rounds fragment found');
            throw new Error('RoundsStrategy requires Rounds fragment');
        }

        // Extract rep scheme from fragments
        // Two patterns:
        // 1. RoundsFragment with array value (legacy): value = [21, 15, 9]
        // 2. RoundsFragment with count + separate RepFragments: value = 3, plus RepFragment(21), RepFragment(15), RepFragment(9)
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
            // Legacy pattern: RoundsFragment contains full rep scheme
            repScheme = roundsFragment.value as number[];
            totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;

            // Check for separate RepFragments (modern parser pattern)
            const repFragments = fragments.filter(f => f.fragmentType === FragmentType.Reps);
            if (repFragments.length > 0) {
                // Build rep scheme from RepFragments
                repScheme = repFragments.map(f => f.value as number);
                // totalRounds stays as specified in RoundsFragment
                // Rep scheme cycles via modulo if totalRounds > repScheme.length
            }
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
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        const loopType = repScheme ? LoopType.REP_SCHEME : LoopType.FIXED;
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType,
            totalRounds,
            repScheme,
            onRoundStart: (rt, roundIndex) => {
                if (repScheme && repScheme.length > 0) {
                    // Use modulo to cycle through rep scheme
                    // E.g., 21-15-9 with 5 rounds: round 0→21, round 1→15, round 2→9, round 3→21, round 4→15
                    const schemeIndex = roundIndex % repScheme.length;
                    const currentReps = repScheme[schemeIndex];
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


        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify the workout structure
        behaviors.push(new HistoryBehavior({
            label: "Rounds",
            debugMetadata: createSpanMetadata(
                ['rounds', repScheme ? 'rep_scheme' : 'fixed_rounds'],
                {
                    strategyUsed: 'RoundsStrategy',
                    totalRounds,
                    loopType,
                    ...(repScheme && { repScheme })
                }
            )
        }));

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

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Rounds",
            repScheme ? repScheme.join('-') : `${totalRounds} Rounds`,
            fragmentGroups
        );
    }
}
