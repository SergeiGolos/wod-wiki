import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// Specific behaviors not covered by aspect composers
import {
    TimerInitBehavior,
    DisplayInitBehavior,
    PopOnNextBehavior,
    SoundCueBehavior,
    SegmentOutputBehavior
} from "../../../behaviors";

/**
 * GenericTimerStrategy handles blocks with timer fragments.
 *
 * Uses aspect composer methods:
 * - .asTimer() - Time tracking (countdown or countup)
 * Plus specific behaviors for display, output, completion, and sound.
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
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - countdown or countup timer
        if (durationMs && direction === 'down') {
            // Countdown timer with completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: true  // Timer completion marks block as complete
            });
        } else {
            // Countup timer without completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: false  // No timer completion - user must advance
            });
        }

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Completion Aspect
        // User can still advance manually (skip or acknowledge completion).
        // For parent blocks with children, ChildrenStrategy removes
        // PopOnNextBehavior since children manage advancement.
        builder.addBehavior(new PopOnNextBehavior());

        // Sound Cues
        if (durationMs && direction === 'down') {
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'timer-complete', trigger: 'complete' }
                ]
            }));
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
        builder.addBehavior(new SegmentOutputBehavior({ label }));
    }
}
