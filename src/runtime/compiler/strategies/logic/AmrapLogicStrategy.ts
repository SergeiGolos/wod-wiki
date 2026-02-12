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
    DisplayInitBehavior,
    RoundDisplayBehavior,
    RoundOutputBehavior,
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
 * Uses aspect composer methods:
 * - .asTimer() - Time tracking with countdown
 * - .asRepeater() - Unbounded rounds (no completion)
 * Plus specific behaviors for display, output, rest, and sound.
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
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - AMRAP uses countdown timer that marks block complete when expired
        builder.asTimer({
            direction: 'down',
            durationMs,
            label: 'AMRAP',
            role: 'primary',
            addCompletion: true  // Timer completion marks block as complete
        });

        // Repeater Aspect - AMRAP has unbounded rounds (no completion on round exhaustion)
        builder.asRepeater({
            totalRounds: undefined,  // Unbounded - run until timer expires
            startRound: 1,
            addCompletion: false  // No RoundCompletionBehavior - timer controls completion
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Display Aspect
        builder.addBehavior(new DisplayInitBehavior({
            mode: 'countdown',
            label
        }));
        builder.addBehavior(new RoundDisplayBehavior());

        // Output Aspect
        builder.addBehavior(new RoundOutputBehavior());
        builder.addBehavior(new SegmentOutputBehavior({ label }));
        builder.addBehavior(new HistoryRecordBehavior());

        // Rest Insertion Aspect - Auto-generate rest blocks
        // RestBlockBehavior must be added BEFORE ChildLoopBehavior and
        // ChildRunnerBehavior (which are added by ChildrenStrategy at priority 50)
        builder.addBehavior(new RestBlockBehavior({
            label: 'Rest'
        }));

        // Sound Cues
        builder.addBehavior(new SoundCueBehavior({
            cues: [
                { sound: 'start-beep', trigger: 'mount' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'timer-complete', trigger: 'complete' }
            ]
        }));
    }
}
