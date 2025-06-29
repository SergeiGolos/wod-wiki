import { RuntimeMetric } from "./RuntimeMetric";

/**
 * Interface for metric inheritance logic in runtime blocks.
 * Provides a way for parent blocks to influence the metrics of their children
 * through composition and inheritance rules.
 */
export interface IMetricInheritance {
    /**
     * Composes/mutates the given metric based on the inheritance rules of the block.
     * This method applies the block's inheritance transformations to a child metric.
     * 
     * @param metric The metric to compose/mutate based on inheritance rules
     */
    compose(metric: RuntimeMetric): void;
}
