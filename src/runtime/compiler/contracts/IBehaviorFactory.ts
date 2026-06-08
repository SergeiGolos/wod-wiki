/**
 * IBehaviorFactory — the seam that decouples {@link BlockBuilder} from
 * concrete behavior constructors.
 *
 * Phase C of plan-candidates-2-3-4-5 introduces this factory so that
 * the builder no longer hard-codes `new CountdownTimerBehavior(...)`,
 * `new CountupTimerBehavior(...)`, and `new ChildSelectionBehavior(...)`
 * directly.  The factory accepts a behavior name (e.g. `'countdown-timer'`)
 * and a config payload, and returns a fully-configured `IRuntimeBehavior`
 * instance.
 *
 * Why a factory rather than a registry?
 * - The factory is the only place that imports behavior constructors
 *   (concrete classes).  Strategies and downstream code use string
 *   names + typed configs.
 * - The factory is mockable: tests can pass in a `MockBehaviorFactory`
 *   that records calls or returns stub behaviors, without reaching
 *   inside the builder.
 * - The factory owns construction so DI / option-shaping logic lives
 *   in one place — and the rest of the builder stays a "describe what"
 *   surface rather than a "construct how" surface.
 *
 * Custom factories (e.g. for plugins) can be registered via
 * {@link BlockBuilder.registerBehaviorFactory} or
 * {@link BlockBuilder.unregisterBehaviorFactory}.
 */
import type { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';

/**
 * Generic factory function: given a name and a config object, return a
 * constructed behavior.  Throws if the name is not recognized.
 */
export interface IBehaviorFactory {
    /**
     * Construct a behavior by registered name.  Throws when the name
     * is not registered with this factory.
     */
    createBehavior(name: string, config: unknown): IRuntimeBehavior;

    /**
     * Returns true if the factory knows how to construct a behavior
     * with the given name.  Use this to check before calling
     * `createBehavior` to avoid throwing on unknown names.
     */
    has(name: string): boolean;

    /**
     * Return the list of names this factory knows.  Mostly for
     * debugging and diagnostic logs.
     */
    names(): readonly string[];
}
