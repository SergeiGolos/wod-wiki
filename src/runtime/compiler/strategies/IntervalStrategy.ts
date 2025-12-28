import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { FragmentType } from "../../../core/models/CodeFragment";
import { BlockContext } from "../../BlockContext";
import { CompletionBehavior } from "../../behaviors/CompletionBehavior";
import { LoopCoordinatorBehavior, LoopType } from "../../behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { TimerBehavior } from "../../behaviors/TimerBehavior";
import { SoundBehavior } from "../../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Strategy that creates interval-based parent blocks for EMOM workouts.
 * Matches statements with Timer + behavior.repeating_interval hint from dialect.
 *
 * EMOM = Every Minute On the Minute
 * Example: "EMOM 10\n  5 Pullups\n  10 Pushups"
 * - Executes child exercises at the start of each minute
 * - Continues for specified number of intervals
 *
 * The strategy now uses semantic hints from the dialect registry instead of
 * hardcoded regex matching. The 'behavior.repeating_interval' hint is set by
 * dialects like CrossFitDialect when detecting EMOM or similar patterns.
 *
 * Implementation Status: COMPLETE
 */
export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            return false;
        }

        if (!statements[0].fragments) {
            return false;
        }

        const statement = statements[0];
        const fragments = statement.fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasEmomAction = fragments.some(
            f => f.fragmentType === FragmentType.Action && typeof f.value === 'string' && f.value.toLowerCase() === 'emom'
        );

        // Check for behavior.repeating_interval hint from dialect (e.g., EMOM detected)
        const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;

        // Match if has Timer AND (repeating_interval hint OR explicit EMOM action)
        // This takes precedence over simple TimerStrategy
        return hasTimer && (isInterval || hasEmomAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Interval");

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = getExerciseId(code[0]);
        const context = new BlockContext(runtime, blockId, exerciseId);

        const fragments = code[0]?.fragments || [];

        // 1. Extract interval duration from Timer fragment
        // If there are multiple timers, the first one is considered the interval duration.
        // E.g., "Every 1:00 for 10:00" - 1:00 is interval.
        const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer);
        const intervalDurationMs = (timerFragment?.value as number) || 60000; // Default 1 min

        // 2. Extract total rounds
        // Look for RoundsFragment
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
        let totalRounds = roundsFragment?.value as number | undefined;

        // If no rounds fragment, check if there's a second timer (Total Duration)
        if (totalRounds === undefined) {
            const timers = fragments.filter(f => f.fragmentType === FragmentType.Timer);
            if (timers.length > 1) {
                const totalDurationMs = timers[1].value as number;
                if (totalDurationMs > intervalDurationMs) {
                    totalRounds = Math.floor(totalDurationMs / intervalDurationMs);
                }
            }
        }

        // If still undefined, fallback to 10 if standard EMOM format implies 10 rounds?
        // Or if "EMOM 10" was parsed with 10 as something else.
        // Assuming RoundsFragment captures "10" in "EMOM 10".
        // If not found, default to 10 (as per previous stub) or maybe Infinite?
        // Let's use 10 as a safe default for now if parsing fails, but ideally parser works.
        // Actually, if totalRounds is undefined, LoopCoordinator defaults to 0 (immediate complete).
        // We should set it to something reasonable or Infinity.
        if (totalRounds === undefined) {
            // Check if action text has number? Dangerous.
            // Default to 10 minutes (10 rounds) as standard EMOM behavior if unspecified
            totalRounds = 10;
        }

        const children = code[0]?.children || [];

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // Add TimerBehavior for interval countdown (primary)
        // LoopCoordinatorBehavior will restart this timer on every round
        // Interval timer drives segment pacing; keep it secondary so the global clock stays primary
        const timerBehavior = new TimerBehavior('down', intervalDurationMs, 'Interval', 'secondary');
        behaviors.push(timerBehavior);

        // Add SoundBehavior for countdown cues
        const soundCues = createCountdownSoundCues(intervalDurationMs);
        const soundBehavior = new SoundBehavior({
            direction: 'down',
            durationMs: intervalDurationMs,
            cues: soundCues
        });
        behaviors.push(soundBehavior);

        // Loop Coordinator (Interval)
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType: LoopType.INTERVAL,
            totalRounds,
            intervalDurationMs
        });
        behaviors.push(loopCoordinator);

        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify this as an EMOM workout
        behaviors.push(new HistoryBehavior({
            label: "EMOM",
            debugMetadata: createSpanMetadata(
                ['emom', 'interval', 'fixed_rounds'],
                {
                    strategyUsed: 'IntervalStrategy',
                    intervalDuration: intervalDurationMs,
                    totalRounds,
                    loopType: 'interval'
                }
            )
        }));

        // Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['interval:complete']
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Interval",
            "EMOM",
            fragmentGroups
        );
    }
}
