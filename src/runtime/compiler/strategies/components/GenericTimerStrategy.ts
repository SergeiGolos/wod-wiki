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
    DisplayInitBehavior,
    TimerOutputBehavior,
    PopOnNextBehavior,
    SoundCueBehavior,
    SegmentOutputBehavior
} from "../../../behaviors";

/**
 * GenericTimerStrategy handles blocks with timer fragments.
 * 
 * Uses aspect-based behaviors:
 * - Time: TimerInit, TimerTick, TimerCompletion, TimerPause
 * - Display: DisplayInit
 * - Output: TimerOutput
 * - Completion: PopOnNext (for countup) or TimerCompletion (for countdown)
 */
export class GenericTimerStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Mid priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;

        // Match if timer fragment exists, ignoring runtime-generated ones
        return statements[0].fragments.some(
            f => f.fragmentType === FragmentType.Timer && f.origin !== 'runtime'
        );
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if timer behaviors already added by higher-priority strategy
        if (builder.hasBehavior(TimerInitBehavior)) {
            return;
        }

        const statement = statements[0];
        const timerFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Timer && f.origin !== 'runtime'
        ) as TimerFragment | undefined;

        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const label = direction === 'down' ? 'Countdown' : 'For Time';

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Timer")
            .setLabel(label)
            .setSourceIds(statement.id ? [statement.id] : []);

        // Filter out runtime-generated fragments
        const cleanFragments = (statement.fragments || [])
            .filter(f => f.origin !== 'runtime');

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(cleanFragments, "Timer");
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Time Aspect
        // =====================================================================
        builder.addBehavior(new TimerInitBehavior({
            direction,
            durationMs,
            label,
            role: 'primary'
        }));
        builder.addBehavior(new TimerTickBehavior());
        builder.addBehavior(new TimerPauseBehavior());

        // =====================================================================
        // Completion Aspect
        // =====================================================================
        if (durationMs && direction === 'down') {
            // Countdown timer: complete when timer expires
            builder.addBehavior(new TimerCompletionBehavior());

            // Add countdown sounds
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'timer-complete', trigger: 'complete' }
                ]
            }));
        } else {
            // Countup timer: complete on user advance
            builder.addBehavior(new PopOnNextBehavior());
        }

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new DisplayInitBehavior({
            mode: durationMs ? 'countdown' : 'clock',
            label
        }));

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new TimerOutputBehavior());
        builder.addBehavior(new SegmentOutputBehavior({ label }));
    }
}
