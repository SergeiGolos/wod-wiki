import { JitCompiler } from '../compiler/JitCompiler';
import { Registry } from '@/core/Registry';

// Strategies (ordered by specificity)
import { AmrapLogicStrategy } from '../compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '../compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '../compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '../compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '../compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '../compiler/strategies/fallback/EffortFallbackStrategy';

import type { IRuntimeBlockStrategy } from '../contracts/IRuntimeBlockStrategy';

/**
 * Consumer-facing strategy registry, pre-seeded with the built-in strategies.
 *
 * Replaces the previous hardcoded `PRODUCTION_STRATEGIES` flat array. Consumer
 * code can call `strategyRegistry.register(new MyStrategy())` to add their
 * own strategies without editing the library.
 *
 * @example
 * ```typescript
 * import { strategyRegistry } from 'wod-wiki/core';
 * strategyRegistry.register(new MySportStrategy());
 * ```
 *
 * Note: rest blocks are NOT produced by a JIT strategy. They are built
 * directly at runtime (PushRestBlockAction / BlockBuilder) and pushed onto
 * the stack, so no rest strategy appears in this registry.
 */
export const strategyRegistry = new Registry<IRuntimeBlockStrategy>([
    // Logic (priority 90)
    new AmrapLogicStrategy(),
    new IntervalLogicStrategy(),

    // Components (priority 50)
    new GenericTimerStrategy(),
    new GenericLoopStrategy(),
    new GenericGroupStrategy(),

    // Enhancements (priority 15–50)
    new SoundStrategy(),
    new ReportOutputStrategy(),
    new ChildrenStrategy(),

    // Fallback (priority 0)
    new EffortFallbackStrategy(),
]);
/**
 * Legacy array form of the production strategy set, kept for backward
 * compatibility. Derived from {@link strategyRegistry} (same instances, same
 * priority-sorted order `JitCompiler` itself would apply) rather than
 * re-constructing a separate set of strategy instances — a previous version
 * of this export built its own `new XxxStrategy()` list independently,
 * which meant `strategyRegistry.register()`/`unregister()` calls silently
 * had no effect on anything reading `PRODUCTION_STRATEGIES` directly. Use
 * `strategyRegistry` (or `createCompiler()`, which reads it live) for new code.
 */
export const PRODUCTION_STRATEGIES: readonly IRuntimeBlockStrategy[] = strategyRegistry.list();

/**
 * Create a JitCompiler with the given strategies (or the registered set).
 *
 * The default argument now reads from the consumer-facing
 * {@link strategyRegistry} so consumer registrations are honored. Pass an
 * explicit array to override (e.g. in tests).
 */
export function createCompiler(strategies?: IRuntimeBlockStrategy[]): JitCompiler {
    const compiler = new JitCompiler();
    for (const strategy of (strategies ?? strategyRegistry.list())) {
        compiler.registerStrategy(strategy);
    }
    return compiler;
}
