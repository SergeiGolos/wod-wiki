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
