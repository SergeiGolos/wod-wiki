/**
 * ConcreteBehaviorFactory — the default {@link IBehaviorFactory} that
 * `BlockBuilder` consults.  Owns the only references to concrete
 * behavior constructors in the compiler/builder layer, so the
 * builder can stay free of those imports.
 *
 * Adding a new behavior is a one-line change here (a new entry in
 * `REGISTRY`) rather than a touch-everything change across the
 * strategies that want to use it.
 */
import type { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import {
    CountdownTimerBehavior,
    CountupTimerBehavior,
    ChildSelectionBehavior,
} from '../behaviors';
import type { IBehaviorFactory } from './contracts/IBehaviorFactory';
import type {
    CountdownTimerConfig,
    CountupTimerConfig,
} from '../behaviors';
import type {
    ChildSelectionConfig,
} from '../behaviors';

/**
 * Per-name factory function.  Each function is a small adapter that
 * trusts its caller to pass a config of the right shape.  The factory
 * does not validate config structure — the constructor of the
 * underlying behavior does, and `BlockBuilder` is the only caller
 * and always passes the expected shape.
 */
type BehaviorCtor = (config: any) => IRuntimeBehavior;

const REGISTRY: Record<string, BehaviorCtor> = {
    'countdown-timer': (config: CountdownTimerConfig) =>
        new CountdownTimerBehavior(config),

    'countup-timer': (config: CountupTimerConfig) =>
        new CountupTimerBehavior(config),

    'child-selection': (config: ChildSelectionConfig) =>
        new ChildSelectionBehavior(config),
};

export class ConcreteBehaviorFactory implements IBehaviorFactory {
    createBehavior(name: string, config: unknown): IRuntimeBehavior {
        const ctor = REGISTRY[name];
        if (!ctor) {
            throw new Error(
                `ConcreteBehaviorFactory: unknown behavior name "${name}". ` +
                `Registered: ${Object.keys(REGISTRY).join(', ')}`
            );
        }
        return ctor(config);
    }

    has(name: string): boolean {
        return name in REGISTRY;
    }

    names(): readonly string[] {
        return Object.keys(REGISTRY);
    }
}
