import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';

// Aspect-based behaviors
import {
    ReportOutputBehavior,
    LeafExitBehavior,
    LabelingBehavior,
    ButtonBehavior
} from '../behaviors';

/**
 * WaitingToStartBlock is an idle gate that pauses before workout execution.
 *
 * The user must click 'next()' (i.e., the "Start" button) to advance.
 * When next() is called, WaitingToStart pops immediately via LeafExitBehavior.
 * The parent SessionRoot then detects the pop and pushes the first workout block.
 *
 * ## Lifecycle
 *
 * 1. Mount: Emits 'segment' output with "Ready to Start" message
 * 2. User clicks next → LeafExitBehavior marks complete, returns PopBlockAction
 * 3. Unmount: Emits 'completion' output
 * 4. Parent receives control, pushes next child
 *
 * ## Behavior Chain
 *
 * - ReportOutputBehavior (output on mount/unmount)
 * - LabelingBehavior (show "Ready to Start")
 * - ButtonBehavior (show "Start" button)
 * - LeafExitBehavior (pop on user advance)
 */
export class WaitingToStartBlock extends RuntimeBlock {
    constructor(runtime: IScriptRuntime) {
        const blockKey = new BlockKey('waiting-to-start');
        const context = new BlockContext(runtime, blockKey.toString(), 'WaitingToStart');
        const behaviors = WaitingToStartBlock.buildBehaviors();

        super(
            runtime,
            [], // No source IDs for idle block
            behaviors,
            context,
            blockKey,
            'WaitingToStart',
            'Ready to Start'
        );
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
        behaviors.push(new LeafExitBehavior({ onNext: true }));

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
