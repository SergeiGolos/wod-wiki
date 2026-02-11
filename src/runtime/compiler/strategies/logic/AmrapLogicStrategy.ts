import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// New aspect-based behaviors
import {
    TimerInitBehavior,
    TimerTickBehavior,
    TimerCompletionBehavior,
    TimerPauseBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundDisplayBehavior,
    RoundOutputBehavior,
    DisplayInitBehavior,
    TimerOutputBehavior,
    HistoryRecordBehavior,
    SoundCueBehavior,
    SegmentOutputBehavior,
    RestBlockBehavior
} from "../../../behaviors";

/**
 * AmrapLogicStrategy handles "As Many Rounds As Possible" blocks.
 * 
 * Pattern: Timer (countdown) + Rounds (unbounded)
 * 
 * Uses aspect-based behaviors:
 * - Time: TimerInit (countdown), TimerTick, TimerCompletion, TimerPause
 * - Iteration: RoundInit (unbounded), RoundAdvance (no RoundCompletion!)
 * - Display: DisplayInit, RoundDisplay
 * - Output: TimerOutput, RoundOutput, HistoryRecord
 * - Controls: Sound cues for countdown
 */
export class AmrapLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90; // High priority - runs before generic strategies

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const hasTimer = statement.hasFragment(FragmentType.Timer);

        // Check for AMRAP keyword or rounds with timer
        const hasRounds = statement.hasFragment(FragmentType.Rounds);
        const hasRoundsKeyword = statement.fragments.some(
            f => (f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Action)
                && typeof f.value === 'string'
                && (f.value.toLowerCase() === 'rounds' || f.value.toLowerCase() === 'amrap')
        );

        return hasTimer && (hasRounds || hasRoundsKeyword);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const statement = statements[0];
        const timerFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Timer
        ) as TimerFragment | undefined;
        const durationMs = timerFragment?.value || 0;

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');
        const label = `AMRAP ${Math.round(durationMs / 60000)} min`;

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("AMRAP")
            .setLabel(label)
            .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "AMRAP");
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Time Aspect - AMRAP uses countdown timer
        // =====================================================================
        builder.addBehavior(new TimerInitBehavior({
            direction: 'down',  // AMRAP counts down
            durationMs,
            label: 'AMRAP',
            role: 'primary'
        }));
        builder.addBehavior(new TimerTickBehavior());
        builder.addBehavior(new TimerPauseBehavior());

        // Timer completion marks the block complete (time cap reached)
        builder.addBehavior(new TimerCompletionBehavior());

        // =====================================================================
        // Iteration Aspect - AMRAP has unbounded rounds
        // =====================================================================
        builder.addBehavior(new RoundInitBehavior({
            totalRounds: undefined,  // Unbounded - run until timer expires
            startRound: 1
        }));
        builder.addBehavior(new RoundAdvanceBehavior());
        // NOTE: No RoundCompletionBehavior - rounds don't complete the block!

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new DisplayInitBehavior({
            mode: 'countdown',
            label
        }));
        builder.addBehavior(new RoundDisplayBehavior());

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new TimerOutputBehavior());
        builder.addBehavior(new RoundOutputBehavior());
        builder.addBehavior(new SegmentOutputBehavior({ label }));
        builder.addBehavior(new HistoryRecordBehavior());

        // =====================================================================
        // Rest Insertion Aspect - Auto-generate rest blocks
        // =====================================================================
        // RestBlockBehavior must be added BEFORE ChildLoopBehavior and
        // ChildRunnerBehavior (which are added by ChildrenStrategy at
        // priority 50). When exercises finish before the countdown timer
        // expires, a RestBlock fills the remaining interval time.
        builder.addBehavior(new RestBlockBehavior({
            label: 'Rest'
        }));

        // =====================================================================
        // Sound Cues
        // =====================================================================
        builder.addBehavior(new SoundCueBehavior({
            cues: [
                { sound: 'start-beep', trigger: 'mount' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'timer-complete', trigger: 'complete' }
            ]
        }));
    }
}
