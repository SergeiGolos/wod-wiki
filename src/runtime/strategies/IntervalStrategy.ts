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
import { PREDEFINED_SOUNDS } from "../models/SoundModels";
import { createCountdownSoundCues } from "./TimerStrategy";

/**
 * Strategy that creates interval-based parent blocks for EMOM workouts.
 * Matches statements with Timer + Action fragments (e.g., "EMOM 10" or "every 1 minute for 10 minutes").
 *
 * EMOM = Every Minute On the Minute
 * Example: "EMOM 10\n  5 Pullups\n  10 Pushups"
 * - Executes child exercises at the start of each minute
 * - Continues for specified number of intervals
 *
 * Implementation Status: PARTIAL - Match logic complete, compile logic needs full implementation
 *
 * TODO: Full compile() implementation requires:
 * 1. Extract interval duration from Timer fragment (e.g., 60000ms from "1:00")
 * 2. Extract total intervals from Rounds fragment or Action value
 * 3. Extract child statements from code[0].children
 * 4. Create LoopCoordinatorBehavior with:
 *    - loopType: LoopType.INTERVAL
 *    - childGroups: [childStatements]
 *    - totalRounds: totalIntervals
 *    - intervalDurationMs: intervalDuration
 * 5. Create RuntimeBlock with the loop coordinator behavior
 * 6. Block should emit interval:start and interval:complete events
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

        // Extract interval duration and rounds
        // Placeholder values for now
        const intervalDurationMs = 60000;
        const totalRounds = 10;
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
        behaviors.push(new HistoryBehavior("EMOM"));

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
