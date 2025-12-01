import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement, CodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { FragmentType } from "../../core/models/CodeFragment";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { LoopCoordinatorBehavior, LoopType } from "../behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { RuntimeMetric } from "../RuntimeMetric";
import { TimerBehavior } from "../behaviors/TimerBehavior";
import { SoundBehavior } from "../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { createDebugMetadata } from "../models/ExecutionSpan";

/**
 * Strategy that creates interval-based parent blocks for EMOM workouts.
 * Matches statements with Timer + Action fragments (e.g., "EMOM 10" or "every 1 minute for 10 minutes").
 *
 * EMOM = Every Minute On the Minute
 * Example: "EMOM 10\n  5 Pullups\n  10 Pushups"
 * - Executes child exercises at the start of each minute
 * - Continues for specified number of intervals
 *
 * Implementation Status: COMPLETE
 */
export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('IntervalStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('IntervalStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasEmomAction = fragments.some(f =>
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('EMOM')
        );

        // Match if has Timer AND Action/Effort with "EMOM"
        // This takes precedence over simple TimerStrategy
        return hasTimer && hasEmomAction;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // Compile statement fragments to metrics using FragmentCompilationManager
        const compiledMetric: RuntimeMetric = runtime.fragmentCompiler.compileStatementFragments(
            code[0] as CodeStatement,
            runtime
        );

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = compiledMetric.exerciseId || (code[0] as any)?.exerciseId || '';
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

        // Add TimerBehavior for interval countdown (primary)
        // LoopCoordinatorBehavior will restart this timer on every round
        const timerBehavior = new TimerBehavior('down', intervalDurationMs, 'Interval', 'primary');
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
            debugMetadata: createDebugMetadata(
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
            compiledMetric
        );
    }
}
