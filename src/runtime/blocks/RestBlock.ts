import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';

// Aspect-based behaviors
import {
    SegmentOutputBehavior,
    TimerBehavior,
    TimerCompletionBehavior,
    PopOnNextBehavior,
    DisplayInitBehavior,
    SoundCueBehavior
} from '../behaviors';

/**
 * Configuration for the rest block.
 */
export interface RestBlockConfig {
    /** Duration of the rest period in milliseconds */
    durationMs: number;
    /** Label for the rest period (default: "Rest") */
    label?: string;
}

/**
 * RestBlock is a timer-based block for rest periods between exercises.
 *
 * Timer-based parents (AMRAP, EMOM) can auto-generate Rest blocks between exercises.
 * The rest block counts down from the configured duration and auto-pops when the timer expires.
 *
 * ## Lifecycle
 *
 * 1. Mount: Emits 'segment' output with rest label and duration, starts countdown timer
 * 2. Timer counts down via TimerBehavior state updates
 * 3. TimerCompletionBehavior marks complete when elapsed >= durationMs
 * 4. Unmount: Emits 'completion' output, plays rest-over sound cue
 *
 * ## Behavior Chain
 *
 * - SegmentOutputBehavior (output on mount/unmount)
 * - TimerBehavior (countdown timer + pause/resume state)
 * - TimerCompletionBehavior (auto-complete when timer expires)
 * - DisplayInitBehavior (show rest countdown)
 * - SoundCueBehavior (beep on unmount for rest-over signal)
 */
export class RestBlock extends RuntimeBlock {
    constructor(
        runtime: IScriptRuntime,
        config: RestBlockConfig
    ) {
        if (config.durationMs < 0) {
            throw new RangeError(`RestBlock durationMs must be >= 0, got: ${config.durationMs}`);
        }

        const restLabel = config.label ?? 'Rest';
        const blockKey = new BlockKey('rest');
        const context = new BlockContext(runtime, blockKey.toString(), 'Rest');
        const behaviors = RestBlock.buildBehaviors(config);

        super(
            runtime,
            [], // No source IDs for auto-generated block
            behaviors,
            context,
            blockKey,
            'Rest',
            restLabel
        );
    }

    /**
     * Builds the behavior list for a rest block.
     */
    static buildBehaviors(config: RestBlockConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const restLabel = config.label ?? 'Rest';

        // =====================================================================
        // Output Aspect - Segment tracking
        // =====================================================================
        behaviors.push(new SegmentOutputBehavior({ label: restLabel }));

        // =====================================================================
        // Time Aspect - Countdown timer
        // =====================================================================
        behaviors.push(new TimerBehavior({
            direction: 'down',
            durationMs: config.durationMs,
            label: restLabel,
            role: 'primary'
        }));
        behaviors.push(new TimerCompletionBehavior());

        // =====================================================================
        // Completion Aspect - User can skip rest or acknowledge completion
        // =====================================================================
        behaviors.push(new PopOnNextBehavior());

        // =====================================================================
        // Display Aspect
        // =====================================================================
        behaviors.push(new DisplayInitBehavior({
            mode: 'timer',
            label: restLabel
        }));

        // =====================================================================
        // Sound Aspect - Rest-over beep
        // =====================================================================
        behaviors.push(new SoundCueBehavior({
            cues: [
                {
                    sound: 'rest-over',
                    trigger: 'complete'
                },
                {
                    sound: 'countdown-beep',
                    trigger: 'countdown',
                    atSeconds: [3, 2, 1]
                }
            ]
        }));

        return behaviors;
    }

    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.mount(runtime, options);
    }

    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.unmount(runtime, options);
    }

    dispose(runtime: IScriptRuntime): void {
        super.dispose(runtime);
        if (this.context) {
            this.context.release();
        }
    }
}
