import { ICodeStatement } from "@/core/models/CodeStatement";
import type { IRuntimeContext } from "./IRuntimeContext";
import { BlockBuilder } from "../compiler/BlockBuilder";

/**
 * Contract for a JIT compiler strategy.
 *
 * Each strategy must carry a stable `id` (used by the consumer-facing
 * {@link strategyRegistry}) and a `priority` (ordering). `id` is the lookup
 * key for `register(id)` / override; `priority` is the registration-order
 * tiebreaker (higher runs first).
 */
export interface IRuntimeBlockStrategy {
    /** Stable, unique identifier (used by strategyRegistry for registration). */
    readonly id: string;

    /**
     * Execution priority. Higher values run first.
     * Suggested ranges:
     * - Logic/Drivers: 90-100 (e.g. Interval, AMRAP)
     * - Components: 50-80 (e.g. Timer, Loop)
     * - Enhancements: 20-40 (e.g. Sound, History)
     * - Fallback: 0 (e.g. Effort)
     */
    priority: number;

    /**
     * Checks if this strategy applies to the given statement.
     */
    match(statements: ICodeStatement[], runtime: IRuntimeContext): boolean;

    /**
     * Applies this strategy to the block builder.
     * Note: This replaces `compile`. The builder accumulates state.
     */
    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IRuntimeContext): void;
}
