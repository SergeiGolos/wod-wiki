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
import { SoundBehavior } from "../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { TimerBehavior } from "../behaviors/TimerBehavior";

/**
 * Strategy that creates time-bound rounds blocks for AMRAP workouts.
 * Matches statements with Timer + (Rounds OR Action="AMRAP").
 *
 * AMRAP = As Many Rounds As Possible
 * Example: "20:00 AMRAP\n  5 Pullups\n  10 Pushups"
 * - Executes as many rounds as possible within time limit
 * - Timer runs down, rounds are unlimited
 *
 * This strategy has higher precedence than TimerStrategy and RoundsStrategy
 * because it combines both concepts.
 *
 * Implementation Status: PARTIAL - Match logic complete, compile logic needs full implementation
 *
 * TODO: Full compile() implementation requires:
 * 1. Extract timer duration from Timer fragment (e.g., 1200000ms from "20:00")
 * 2. Extract child statements from code[0].children
 * 3. Create TimerBlock with direction='down' and durationMs
 * 4. Create nested RoundsBlock with:
 *    - loopType: LoopType.TIME_BOUND (infinite until timer expires)
 *    - childGroups: [childStatements]
 *    - totalRounds: Infinity or large number
 * 5. TimerBlock wraps the RoundsBlock as its child
 * 6. Completion: when timer expires
 * 7. Block should track completed rounds for display
 */
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('TimeBoundRoundsStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('TimeBoundRoundsStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        const hasAmrapAction = fragments.some(f =>
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('AMRAP')
        );

        // Match if has Timer AND (Rounds OR AMRAP action/effort)
        return hasTimer && (hasRounds || hasAmrapAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // Compile statement fragments to metrics using FragmentCompilationManager
        const compiledMetric: RuntimeMetric = runtime.fragmentCompiler.compileStatementFragments(
            code[0] as CodeStatement,
            runtime
        );

        const stmt = code[0];
        const fragments = stmt.fragments || [];;

        // Extract timer duration
        const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer);
        let durationMs: number | undefined;
        if (timerFragment && timerFragment.value) {
            const timeStr = String(timerFragment.value);
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                const minutes = parseInt(parts[0], 10);
                const seconds = parseInt(parts[1], 10);
                durationMs = (minutes * 60 + seconds) * 1000;
            }
        }

        if (!durationMs || durationMs <= 0) {
            durationMs = 20 * 60 * 1000; // Default 20 mins
        }

        // Extract children
        const children = stmt.children || [];

        // Create BlockContext
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = compiledMetric.exerciseId || (stmt as any)?.exerciseId || '';
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // 1. Timer Behavior (Countdown)
        const timerBehavior = new TimerBehavior('down', durationMs, 'AMRAP');
        behaviors.push(timerBehavior);
        behaviors.push(new HistoryBehavior("AMRAP"));

        // 2. Sound Behavior (tick-tick-buzz countdown)
        const soundCues = createCountdownSoundCues(durationMs);
        const soundBehavior = new SoundBehavior({
            direction: 'down',
            durationMs,
            cues: soundCues
        });
        behaviors.push(soundBehavior);

        // 3. Loop Coordinator (Time Bound / Infinite)
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType: LoopType.TIME_BOUND,
            totalRounds: Infinity // Run until timer expires
        });
        behaviors.push(loopCoordinator);

        // 4. Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['timer:complete', 'children:complete']
        ));

        const label = `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')} AMRAP`;

        return new RuntimeBlock(
            runtime,
            stmt.id ? [stmt.id] : [],
            behaviors,
            context,
            blockKey,
            "Timer", // It's technically a Timer block structure
            label,
            compiledMetric
        );
    }
}
