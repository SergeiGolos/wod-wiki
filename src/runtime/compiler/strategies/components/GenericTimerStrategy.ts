import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { DurationFragment } from "../../fragments/DurationFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { LabelComposer } from "../../utils/LabelComposer";

// Specific behaviors not covered by aspect composers
import {
    CountdownTimerBehavior,
    LabelingBehavior,
    ExitBehavior,
    SoundCueBehavior
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

        // Match if duration fragment exists in ANY statement, ignoring runtime-generated ones
        return statements.some(s => s.fragments.some(
            f => f.fragmentType === FragmentType.Duration && f.origin !== 'runtime'
        ));
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if a timer behavior was already added by a higher-priority strategy
        if (builder.hasTimerBehavior()) {
            return;
        }

        const firstStatementWithTimer = statements.find(s => s.fragments.some(
            f => f.fragmentType === FragmentType.Duration && f.origin !== 'runtime'
        )) || statements[0];
        
        const timerFragment = firstStatementWithTimer.fragments.find(
            f => f.fragmentType === FragmentType.Duration && f.origin !== 'runtime'
        ) as DurationFragment | undefined;

        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        
        // Use LabelComposer for a standardized, descriptive label
        const label = LabelComposer.build(statements, {
            defaultLabel: direction === 'down' ? 'Countdown' : 'For Time'
        });

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatementWithTimer.exerciseId || '');

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Timer")
            .setLabel(label)
            .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = statements.flatMap(s => 
            distribute(s.fragments || [], "Timer")
        ).filter(group => group.length > 0);
        
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Specific Behaviors - Added BEFORE aspects to ensure correct execution order
        // (LeafExit before Timer ensures Pop comes before Rest Push onNext)
        // =====================================================================

        // Completion Aspect
        // User can still advance manually (skip or acknowledge completion).
        // For parent blocks with children, ChildrenStrategy removes
        // ExitBehavior since children manage advancement.
        builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Check for inject-rest hint
        const injectRest = statements.some(s => s.hints?.has('behavior.inject_rest'));

        // Timer Aspect - countdown or countup timer
        if (durationMs && direction === 'down') {
            // Countdown timer with completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: true,  // Timer completion marks block as complete
                injectRest
            });
        } else {
            // Countup timer without completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: false,  // No timer completion - user must advance
                injectRest
            });
        }

        // =====================================================================
        // Display and Sound
        // =====================================================================

        // Sound Cues
        if (durationMs && direction === 'down') {
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'timer-complete', trigger: 'complete' }
                ]
            }));
        }

        // Display Aspect
        builder.addBehavior(new LabelingBehavior({
            mode: durationMs ? 'countdown' : 'clock',
            label
        }));
    }
}

// Keep the logic-heavy fragment distribution local to the strategy
function distribute(fragments: any[], type: string): any[][] {
    const distributor = new PassthroughFragmentDistributor();
    return distributor.distribute(fragments, type);
}
