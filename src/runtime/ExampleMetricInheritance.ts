import { IMetricInheritance } from "./IMetricInheritance";
import { RuntimeMetric } from "./RuntimeMetric";

/**
 * Example implementation of IMetricInheritance for rounds-based blocks.
 * This shows how a parent block can multiply child metrics by the number of rounds.
 */
export class RoundsMetricInheritance implements IMetricInheritance {
    constructor(private rounds: number) {}

    /**
     * Multiplies repetition and round metric values by the number of rounds.
     * @param metric The metric to compose with rounds multiplication
     */
    compose(metric: RuntimeMetric): void {
        for (const value of metric.values) {
            if (value.type === "repetitions" || value.type === "rounds") {
                value.value *= this.rounds;
            }
        }
    }
}

/**
 * Example implementation for resistance progression in rounds.
 * This could increment resistance values across rounds.
 */
export class ProgressiveResistanceInheritance implements IMetricInheritance {
    constructor(private increment: number, private currentRound: number) {}

    /**
     * Adds progressive resistance based on the current round.
     * @param metric The metric to compose with resistance progression
     */
    compose(metric: RuntimeMetric): void {
        for (const value of metric.values) {
            if (value.type === "resistance") {
                value.value += this.increment * (this.currentRound - 1);
            }
        }
    }
}

/**
 * Example implementation for percentage-based progression.
 * Applies a percentage multiplier to all metric values.
 */
export class PercentageProgressionInheritance implements IMetricInheritance {
    constructor(private percentage: number) {}

    /**
     * Applies percentage progression to all metric values.
     * @param metric The metric to compose with percentage progression
     */
    compose(metric: RuntimeMetric): void {
        const multiplier = Math.max(0, this.percentage / 100);
        for (const value of metric.values) {
            value.value = Math.round(value.value * multiplier);
        }
    }
}

/**
 * Example implementation for time-based adjustments.
 * Adjusts time-related metrics by a fixed amount.
 */
export class TimeBasedInheritance implements IMetricInheritance {
    constructor(private timeAdjustment: number) {}

    /**
     * Adjusts time metrics by the specified amount.
     * @param metric The metric to compose with time adjustments
     */
    compose(metric: RuntimeMetric): void {
        for (const value of metric.values) {
            if (value.type === "time") {
                value.value += this.timeAdjustment;
            }
        }
    }
}
