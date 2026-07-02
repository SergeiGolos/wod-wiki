import type { IRuntimeContext } from '../contracts/IRuntimeContext';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';

// Aspect-based behaviors
import {
    ReportOutputBehavior,
    ExitBehavior,
    LabelingBehavior,
    ButtonBehavior
} from '../behaviors';

/**
 * WaitingToStartBlock is an idle gate that pauses before workout execution.
 *
 * The user must click 'next()' (i.e., the "Start" button) to advance.
 * When next() is called, WaitingToStart pops immediately via ExitBehavior.
 * The parent SessionRoot then detects the pop and pushes the first workout block.
 *
 * ## Lifecycle
 *
 * 1. Mount: Emits 'segment' output with "Ready to Start" message
 * 2. User clicks next → ExitBehavior marks complete, returns PopBlockAction
 * 3. Unmount: Emits 'completion' output
 * 4. Parent receives control, pushes next child
 *
 * ## Behavior Chain
 *
 * - ReportOutputBehavior (output on mount/unmount)
 * - LabelingBehavior (show "Ready to Start")
 * - ButtonBehavior (show "Start" button)
 * - ExitBehavior (pop on user advance)
 */
export class WaitingToStartBlock extends RuntimeBlock {
    constructor(runtime: IRuntimeContext) {
        const blockKey = new BlockKey('waiting-to-start');
        const context = new BlockContext(runtime, blockKey.toString(), 'WaitingToStart');
        const behaviors = WaitingToStartBlock.buildBehaviors();

        super({
            runtime,
            sourceIds: [], // No source IDs for idle block
            behaviors,
            context,
            key: blockKey,
            blockType: 'WaitingToStart',
            label: 'Ready to Start',
        });
    }

    /**
     * Builds the behavior list for the WaitingToStart block.
     */
    static buildBehaviors(): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];

        // =====================================================================
        // Output Aspect - Segment tracking
        // =====================================================================
        behaviors.push(new ReportOutputBehavior({ label: 'Ready to Start' }));

        // =====================================================================
        // Display Aspect
        // =====================================================================
        behaviors.push(new LabelingBehavior({
            mode: 'clock',
            label: 'Ready to Start'
        }));

        // =====================================================================
        // Controls Aspect - Start button
        // =====================================================================
        behaviors.push(new ButtonBehavior({
            buttons: [
                {
                    id: 'start',
                    label: 'Start Workout',
                    variant: 'primary' as const,
                    visible: true,
                    enabled: true,
                    eventName: 'next'
                }
            ]
        }));

        // =====================================================================
        // Completion Aspect - Pop on user advance
        // =====================================================================
        behaviors.push(new ExitBehavior({ mode: 'immediate', onNext: true }));

        return behaviors;
    }

    mount(runtime: IRuntimeContext, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.mount(runtime, options);
    }

    unmount(runtime: IRuntimeContext, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.unmount(runtime, options);
    }

    dispose(runtime: IRuntimeContext): void {
        super.dispose(runtime);
        if (this.context) {
            this.context.release();
        }
    }
}
