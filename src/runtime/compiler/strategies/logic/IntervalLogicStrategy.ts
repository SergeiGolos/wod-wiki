import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { DurationFragment } from "../../fragments/DurationFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
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
 * IntervalLogicStrategy handles EMOM (Every Minute On the Minute) blocks.
 *
 * Pattern: Repeating interval timer + Rounds
 * Each interval resets the timer.
 *
 * Uses aspect composer methods:
 * - .asTimer() - Countdown per interval (completesBlock: false)
 * - .asRepeater() - Fixed rounds with completion
 * Plus specific behaviors for display, output, rest, and sound.
 */
export class IntervalLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90; // High priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        
        // Match if ANY statement has timer and (hint or EMOM keyword)
        const hasTimer = statements.some(s => s.fragments.some(f => f.fragmentType === FragmentType.Duration));
        const isInterval = statements.some(s => s.hints?.has('behavior.repeating_interval') ?? false);

        // EMOM can be parsed as 'Action' OR 'Effort' depending on parser version
        const hasEmomAction = statements.some(s => s.fragments.some(
            f => (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort)
                && typeof f.value === 'string'
                && f.value.toLowerCase() === 'emom'
        ));
        return hasTimer && (isInterval || hasEmomAction);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const firstStatementWithTimer = statements.find(s => s.fragments.some(
            f => f.fragmentType === FragmentType.Duration
        )) || statements[0];

        const timerFragment = firstStatementWithTimer.fragments.find(
            f => f.fragmentType === FragmentType.Duration
        ) as DurationFragment | undefined;

        const roundsFragment = statements.flatMap(s => s.fragments).find(
            f => f.fragmentType === FragmentType.Rounds
        ) as RoundsFragment | undefined;

        const intervalMs = timerFragment?.value || 60000; // Default 1 minute
        const totalRounds = typeof roundsFragment?.value === 'number'
            ? roundsFragment.value
            : 10; // Default 10 rounds if not specified

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), (firstStatementWithTimer as any).exerciseId || '');
        const label = `EMOM ${totalRounds}`;

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("EMOM")
            .setLabel(label)
            .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = statements.flatMap(s => 
            distributor.distribute(s.fragments || [], "EMOM")
        ).filter(group => group.length > 0);
        
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - EMOM uses countdown timer per interval
        // Timer expiry does NOT mark block complete - it's a per-round pacing signal
        builder.asTimer({
            direction: 'down',
            durationMs: intervalMs,
            label: 'Interval',
            role: 'primary',
            addCompletion: true,
            completionConfig: { completesBlock: false }  // Timer resets for next round
        });

        // Repeater Aspect - EMOM has fixed rounds, block completes when exhausted
        builder.asRepeater({
            totalRounds,
            startRound: 1,
            addCompletion: true  // RoundsEndBehavior marks block complete
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
                { sound: 'interval-start', trigger: 'mount' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'interval-complete', trigger: 'complete' }
            ]
        }));
    }
}
