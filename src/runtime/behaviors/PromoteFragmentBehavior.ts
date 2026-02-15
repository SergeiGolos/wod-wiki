import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment, FragmentOrigin, FragmentType } from '../../core/models/CodeFragment';
import { MemoryTag } from '../memory/MemoryLocation';

export interface PromoteFragmentConfig {
    /** The code fragment type to promote (e.g. FragmentType.Timer) */
    fragmentType: FragmentType;
    /** Origin to override the fragment with (default: 'execution') */
    origin?: FragmentOrigin;
    /** 
     * If true, updates the promoted fragment on every next() call 
     * by finding the source fragment in the block's memory.
     * Use this for dynamic values like current round count.
     */
    enableDynamicUpdates?: boolean;
    /** Source memory tag to read dynamic values from (default: checks all) */
    sourceTag?: MemoryTag;
}

/**
 * PromoteFragmentBehavior
 * 
 * Promotes a specific fragment type from the current block's memory to its children.
 * This works by creating a 'fragment:promote' memory location with the fragment.
 * The JitCompiler then injects these promoted fragments into child block statements.
 * 
 * ## Usage
 * - Add to a block strategy to make a value available to all children.
 * - Use `enableDynamicUpdates: true` for changing values (e.g. Round count).
 */
export class PromoteFragmentBehavior implements IRuntimeBehavior {
    constructor(private config: PromoteFragmentConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        this.promoteCurrentValue(ctx);
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.config.enableDynamicUpdates) {
            this.promoteCurrentValue(ctx);
        }
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void { }

    private promoteCurrentValue(ctx: IBehaviorContext): void {
        const sourceFragment = this.findSourceFragment(ctx);

        if (!sourceFragment) return;

        // Create the promoted version
        const promotedFragment: ICodeFragment = {
            ...sourceFragment,
            origin: this.config.origin ?? 'execution'
        };

        // Check if we already have a promoted location for this type
        const existingPromotedLocs = ctx.block.getFragmentMemoryByVisibility('promote');
        const existingLoc = existingPromotedLocs.find(loc =>
            loc.fragments.some(f => f.fragmentType === this.config.fragmentType)
        );

        if (existingLoc) {
            existingLoc.update([promotedFragment]);
        } else {
            ctx.pushMemory('fragment:promote', [promotedFragment]);
        }
    }

    private findSourceFragment(ctx: IBehaviorContext): ICodeFragment | undefined {
        const memory = ctx.block.getAllMemory();

        for (const loc of memory) {
            // Skip the promoted memory itself to avoid cycles
            if (loc.tag === 'fragment:promote') continue;

            // If sourceTag is specified, respect it
            if (this.config.sourceTag && loc.tag !== this.config.sourceTag) continue;

            const match = loc.fragments.find(f => f.fragmentType === this.config.fragmentType);
            if (match) return match;
        }

        return undefined;
    }
}
