import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { TypedBlock, TypedBlockConfig } from './TypedBlock';

/**
 * Abstract base class for leaf blocks — blocks with no children.
 *
 * Leaf blocks represent terminal execution units: user input gates,
 * timed rest periods, or effort/rep tracking exercises.
 *
 * Default completion: onNext() marks complete. Subclasses override
 * for alternative completion policies (timer expiry, target-met, etc.).
 */
export abstract class LeafBlock extends TypedBlock {
    constructor(runtime: IScriptRuntime, config: TypedBlockConfig) {
        super(runtime, config);
    }

    /**
     * Default onNext for leaf blocks: mark complete.
     * Override in subclasses for different completion policies.
     */
    protected onNext(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.markComplete('user-advance');
        return [];
    }

    /**
     * Default onUnmount for leaf blocks: no-op.
     */
    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }
}
