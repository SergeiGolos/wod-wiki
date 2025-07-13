import { RuntimeMetric } from "./RuntimeMetric";
import { IMetricInheritance } from "./IMetricInheritance";

/**
 * Composes final metrics for a runtime block by applying inheritance rules
 * from parent blocks in the runtime stack.
 */
export class MetricComposer {
    constructor(private baseMetrics: RuntimeMetric[]) {}

    /**
     * Composes the final metrics by applying inheritance rules from parent blocks.
     * 
     * @param inheritanceStack Array of IMetricInheritance objects from parent blocks,
     *                        ordered from outermost parent to immediate parent
     * @returns Final composed metrics with inheritance rules applied
     */
    compose(inheritanceStack: IMetricInheritance[]): RuntimeMetric[] {
        // Create deep copies of base metrics to avoid mutation
        let composedMetrics = this.baseMetrics.map(metric => ({
            sourceId: metric.sourceId,
            effort: metric.effort,
            values: metric.values.map(value => ({ ...value }))
        }));

        // Apply inheritance rules from each parent in order
        for (const inheritance of inheritanceStack) {
            composedMetrics = composedMetrics.map(metric => {
                return inheritance.compose(metric);
            });
        }

        return composedMetrics;
    }

    /**
     * Gets the base metrics without any inheritance applied.
     * Useful for testing and debugging.
     */
    getBaseMetrics(): RuntimeMetric[] {
        return [...this.baseMetrics];
    }
}
