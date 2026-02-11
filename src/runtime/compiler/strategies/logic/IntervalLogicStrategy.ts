import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
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
    RoundCompletionBehavior,
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
 * IntervalLogicStrategy handles EMOM (Every Minute On the Minute) blocks.
 * 
 * Pattern: Repeating interval timer + Rounds
 * Each interval resets the timer.
 * 
 * Uses aspect-based behaviors:
 * - Time: TimerInit (countdown per interval), TimerTick, TimerCompletion
 * - Iteration: RoundInit, RoundAdvance, RoundCompletion
 * - Display: DisplayInit, RoundDisplay
 * - Output: TimerOutput, RoundOutput, HistoryRecord
 */
export class IntervalLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90; // High priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const fragments = statement.fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;

        // EMOM can be parsed as 'Action' OR 'Effort' depending on parser version
        const hasEmomAction = fragments.some(
            f => (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort)
                && typeof f.value === 'string'
                && f.value.toLowerCase() === 'emom'
        );
        return hasTimer && (isInterval || hasEmomAction);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const statement = statements[0];
        const timerFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Timer
        ) as TimerFragment | undefined;
        const roundsFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Rounds
        ) as RoundsFragment | undefined;

        const intervalMs = timerFragment?.value || 60000; // Default 1 minute
        const totalRounds = typeof roundsFragment?.value === 'number'
            ? roundsFragment.value
            : 10; // Default 10 rounds if not specified

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), (statement as any).exerciseId || '');
        const label = `EMOM ${totalRounds}`;

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("EMOM")
            .setLabel(label)
            .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "EMOM");
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Time Aspect - EMOM uses countdown timer per interval
        // =====================================================================
        builder.addBehavior(new TimerInitBehavior({
            direction: 'down',
            durationMs: intervalMs,
            label: 'Interval',
            role: 'primary'
        }));
        builder.addBehavior(new TimerTickBehavior());
        builder.addBehavior(new TimerPauseBehavior());

        // Timer completion does NOT mark EMOM as complete — the interval timer
        // is a per-round pacing signal. When it expires, children are auto-popped
        // and the timer resets for the next round. Block completion is handled by
        // RoundCompletionBehavior when all rounds are exhausted.
        builder.addBehavior(new TimerCompletionBehavior({ completesBlock: false }));

        // =====================================================================
        // Iteration Aspect - EMOM has fixed rounds
        // =====================================================================
        builder.addBehavior(new RoundInitBehavior({
            totalRounds,
            startRound: 1
        }));
        builder.addBehavior(new RoundAdvanceBehavior());
        builder.addBehavior(new RoundCompletionBehavior()); // Complete when all rounds done

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
        // priority 50). When exercises finish before the interval timer
        // expires, a RestBlock fills the remaining interval time.
        builder.addBehavior(new RestBlockBehavior({
            label: 'Rest'
        }));

        // =====================================================================
        // Sound Cues
        // =====================================================================
        builder.addBehavior(new SoundCueBehavior({
            cues: [
                { sound: 'interval-start', trigger: 'mount' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'interval-complete', trigger: 'complete' }
            ]
        }));
    }
}
