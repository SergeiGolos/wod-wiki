import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { DurationFragment } from "../../fragments/DurationFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// Specific behaviors not covered by aspect composers
import {
    LabelingBehavior,
    HistoryRecordBehavior,
    SoundCueBehavior,
    ReportOutputBehavior
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
        
        // Match if ANY statement has timer and ANY statement has rounds/amrap keyword
        const hasTimer = statements.some(s => s.hasFragment(FragmentType.Duration));
        const hasRounds = statements.some(s => s.hasFragment(FragmentType.Rounds));
        const hasRoundsKeyword = statements.some(s => s.fragments.some(
            f => (f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Action)
                && typeof f.value === 'string'
                && (f.value.toLowerCase() === 'rounds' || f.value.toLowerCase() === 'amrap')
        ));

        return hasTimer && (hasRounds || hasRoundsKeyword);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const firstStatementWithTimer = statements.find(s => s.hasFragment(FragmentType.Duration)) || statements[0];
        
        const timerFragment = firstStatementWithTimer.fragments.find(
            f => f.fragmentType === FragmentType.Duration
        ) as DurationFragment | undefined;
        const durationMs = timerFragment?.value || 0;

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatementWithTimer.exerciseId || '');
        const label = `AMRAP ${Math.round(durationMs / 60000)} min`;

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("AMRAP")
            .setLabel(label)
            .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = statements.flatMap(s => 
            distributor.distribute(s.fragments || [], "AMRAP")
        ).filter(group => group.length > 0);
        
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
            addCompletion: false  // No RoundsEndBehavior - timer controls completion
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Display Aspect
        builder.addBehavior(new LabelingBehavior({
            mode: 'countdown',
            label
        }));

        // Output Aspect
        builder.addBehavior(new ReportOutputBehavior({ label }));
        builder.addBehavior(new HistoryRecordBehavior());

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
