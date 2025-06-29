import { IMetricInheritance } from "./IMetricInheritance";
import { RuntimeMetric } from "./RuntimeMetric";

/**
 * Default implementation of IMetricInheritance that does not modify metrics.
 * Used by runtime blocks that don't need to apply any inheritance transformations.
 */
export class NullMetricInheritance implements IMetricInheritance {
    /**
     * Does not modify the metric (null object pattern).
     * @param metric The metric to compose (left unchanged)
     */
    compose(metric: RuntimeMetric): void {
        // No-op: this implementation doesn't modify metrics
    }
}
