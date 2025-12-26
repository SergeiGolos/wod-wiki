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
import { PREDEFINED_SOUNDS, SoundCue } from "../models/SoundModels";
import { TimerBehavior } from "../behaviors/TimerBehavior";
import { createSpanMetadata } from "../utils/metadata";
import { PassthroughFragmentDistributor } from "../IDistributedFragments";
import { ActionLayerBehavior } from "../behaviors/ActionLayerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Creates default countdown sound cues for a timer with specified duration.
 * Includes: 3-2-1 tick countdown and final buzzer.
 *
 * @param durationMs Total timer duration in milliseconds
 * @returns Array of SoundCue configurations
 */
export function createCountdownSoundCues(durationMs: number): SoundCue[] {
    const cues: SoundCue[] = [];

    // 3-2-1 countdown ticks
    if (durationMs >= 3000) {
        cues.push({ id: '3-sec', threshold: 3000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    }
    if (durationMs >= 2000) {
        cues.push({ id: '2-sec', threshold: 2000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    }
    if (durationMs >= 1000) {
        cues.push({ id: '1-sec', threshold: 1000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    }

    // Final buzzer at completion
    cues.push({ id: 'complete', threshold: 0, sound: PREDEFINED_SOUNDS.BUZZER, volume: 1.0 });

    return cues;
}

/**
 * Creates default count-up sound cues for a timer.
 * Includes: Start beep.
 *
 * @returns Array of SoundCue configurations
 */
export function createCountUpSoundCues(): SoundCue[] {
    return [
        { id: 'start', threshold: 0, sound: PREDEFINED_SOUNDS.START, volume: 1.0 }
    ];
}

/**
 * Strategy that creates timer-based parent blocks for time-bound workouts.
 * Matches statements with Timer fragments (e.g., "20:00 AMRAP").
 *
 * Timer direction logic:
 * - Duration specified without ^ → countdown
 * - Duration specified with ^ modifier → count-up (forced)
 * - No duration → count-up
 *
 * This strategy now supports optional `behavior.timer` hint from dialects.
 * Dialects can flag "Rest" or "Work" timers explicitly.
 *
 * NOTE: Due to precedence, this strategy only matches if
 * TimeBoundRoundsStrategy and IntervalStrategy didn't match.
 *
 * Implementation Status: COMPLETE - Match logic uses hints with structural fallback
 */
export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            return false;
        }

        if (!statements[0].fragments) {
            return false;
        }

        const statement = statements[0];
        const fragments = statement.fragments;

        // Structural check: Has timer fragment
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);

        // Check for explicit timer hint from dialect (optional)
        // Dialects can flag "Rest" or "Work" timers explicitly
        const isExplicitTimer = statement.hints?.has('behavior.timer') ?? false;

        // Match if has Timer fragment OR explicit timer hint
        // NOTE: Due to precedence, this only matches if
        // TimeBoundRoundsStrategy and IntervalStrategy didn't match
        return hasTimer || isExplicitTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Timer");

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();

        // 2. Extract exerciseId from compiled metric or statement
        const exerciseId = getExerciseId(code[0]);

        // 3. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);

        // 4. Extract timer fragment to determine direction
        const fragments = code[0]?.fragments || [];
        const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment | undefined;

        // Determine timer direction from fragment or default to count-up
        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const label = direction === 'down' ? 'Countdown' : 'For Time';

        // 5. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // Add timer behavior with determined direction
        const timerBehavior = new TimerBehavior(direction, durationMs, label);
        behaviors.push(timerBehavior);


        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify the timer configuration
        behaviors.push(new HistoryBehavior({
            label: "Timer",
            debugMetadata: createSpanMetadata(
                ['timer', direction === 'down' ? 'countdown' : 'count_up'],
                {
                    strategyUsed: 'TimerStrategy',
                    timerDirection: direction,
                    ...(durationMs && { timerDuration: durationMs })
                }
            )
        }));

        // Add SoundBehavior
        if (direction === 'down' && durationMs && durationMs > 0) {
            // Countdown: tick-tick-buzz
            const soundCues = createCountdownSoundCues(durationMs);
            const soundBehavior = new SoundBehavior({
                direction: 'down',
                durationMs,
                cues: soundCues
            });
            behaviors.push(soundBehavior);
        } else if (direction === 'up') {
            // Count-up: start beep
            const soundCues = createCountUpSoundCues();
            const soundBehavior = new SoundBehavior({
                direction: 'up',
                cues: soundCues
            });
            behaviors.push(soundBehavior);
        }

        // Add LoopCoordinator if children exist (Fixed 1 round)
        const children = code[0]?.children || [];
        let loopCoordinator: LoopCoordinatorBehavior | undefined;

        if (children.length > 0) {
            loopCoordinator = new LoopCoordinatorBehavior({
                childGroups: children,
                loopType: LoopType.FIXED,
                totalRounds: 1
            });
            behaviors.push(loopCoordinator);
        }

        // Add CompletionBehavior
        // Complete when children complete (if any), otherwise manual completion?
        // For simple timer, maybe it never completes automatically unless children complete?
        behaviors.push(new CompletionBehavior(
            (_rt, block) => {
                if (loopCoordinator) {
                    return loopCoordinator.isComplete(_rt, block);
                }
                return false; // Simple timer runs until stopped manually
            },
            ['timer:complete', 'children:complete']
        ));

        // 6. Create RuntimeBlock with compiled metrics
        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Timer",
            label,
            fragmentGroups
        );
    }
}
