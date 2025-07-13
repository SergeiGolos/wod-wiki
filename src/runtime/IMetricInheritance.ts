import { RuntimeMetric } from "./RuntimeMetric";

export interface IMetricInheritance {
    compose(metric: RuntimeMetric): RuntimeMetric;
}