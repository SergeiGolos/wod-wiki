import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { FragmentType } from "../../core/models/CodeFragment";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { LoopCoordinatorBehavior, LoopType } from "../behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { SoundBehavior } from "../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { TimerBehavior } from "../behaviors/TimerBehavior";
import { createSpanMetadata } from "../utils/metadata";
import { PassthroughFragmentDistributor } from "../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../behaviors/ActionLayerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Strategy that creates time-bound rounds blocks for AMRAP workouts.
 * Matches statements with Timer + (Rounds OR behavior.time_bound hint from dialect).
 *
 * AMRAP = As Many Rounds As Possible
 * Example: "20:00 AMRAP\n  5 Pullups\n  10 Pushups"
 * - Executes as many rounds as possible within time limit
 * - Timer runs down, rounds are unlimited
 *
 * This strategy has higher precedence than TimerStrategy and RoundsStrategy
 * because it combines both concepts.
 *
 * The strategy now uses semantic hints from the dialect registry instead of
 * hardcoded regex matching. The 'behavior.time_bound' hint is set by dialects
 * like CrossFitDialect when detecting AMRAP or similar patterns.
 *
 * Implementation Status: COMPLETE - Match logic uses hints, compile logic implemented
 */
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
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
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        const hasAmrapAction = fragments.some(
            f => f.fragmentType === FragmentType.Action && typeof f.value === 'string' && f.value.toLowerCase() === 'amrap'
        );

        // Check for behavior.time_bound hint from dialect (e.g., AMRAP detected)
        const isTimeBound = statement.hints?.has('behavior.time_bound') ?? false;

        // Match if has Timer AND (Rounds OR time_bound hint OR explicit AMRAP action)
        return hasTimer && (hasRounds || isTimeBound || hasAmrapAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "TimeBoundRounds");

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
        const exerciseId = getExerciseId(stmt);
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, stmt.id ? [stmt.id] : []));

        // 1. Timer Behavior (Countdown) - keep secondary so global clock stays primary
        const timerBehavior = new TimerBehavior('down', durationMs, 'AMRAP', 'secondary');
        behaviors.push(timerBehavior);

        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify this as an AMRAP workout
        behaviors.push(new HistoryBehavior({
            label: "AMRAP",
            debugMetadata: createSpanMetadata(
                ['amrap', 'time_bound', 'max_rounds'],
                {
                    strategyUsed: 'TimeBoundRoundsStrategy',
                    timerDuration: durationMs,
                    timerDirection: 'down',
                    targetRounds: Infinity
                }
            )
        }));

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
            fragmentGroups
        );
    }
}
