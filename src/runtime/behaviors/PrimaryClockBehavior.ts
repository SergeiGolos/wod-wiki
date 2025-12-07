import { ScriptRuntime } from '../ScriptRuntime';
import { IRuntimeBehavior, RuntimeBlock } from '../RuntimeBlock';

/**
 * Behavior to register a block as the "primary clock" source.
 * This instructs the UI to use this block's timer for the main large display.
 */
export class PrimaryClockBehavior implements IRuntimeBehavior {
    type = 'primary-clock';

    constructor(private priority: number = 0) {}

    onMount(block: RuntimeBlock, runtime: ScriptRuntime): void {
        this.registerAsPrimary(block, runtime);
    }

    onUnmount(block: RuntimeBlock, runtime: ScriptRuntime): void {
        // Cleanup if we are still the primary clock?
        // Usually registry keys are just overwritten or we can let them stick until next update.
        // But for cleanliness/fallback, we might want to unset if WE are the current value.
        // However, standard registry pattern is often "last writer wins" or explicit management.
        // Let's just rely on the next block taking over, or 'onFocus' logic if we had it.
    }

    private registerAsPrimary(block: RuntimeBlock, runtime: ScriptRuntime) {
        // Write to memory registry
        runtime.memory.write({
            type: 'registry',
            id: 'primary-clock',
            visibility: 'public',
            value: block.id
        });
    }
}
