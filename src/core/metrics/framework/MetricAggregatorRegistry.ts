import { IMetricAggregator, IMetricAggregatorRegistry } from "../aggregator";
import { MetricsContext } from "../types";

/**
 * Concrete implementation of the metric aggregator registry.
 * Follows Open/Closed Principle - system is open for extension via registration.
 */
export class MetricAggregatorRegistry implements IMetricAggregatorRegistry {
  private aggregators = new Map<string, IMetricAggregator>();
  
  register(aggregator: IMetricAggregator): void {
    this.aggregators.set(aggregator.id, aggregator);
  }
  
  unregister(id: string): void {
    this.aggregators.delete(id);
  }
  
  getAll(): IMetricAggregator[] {
    return Array.from(this.aggregators.values());
  }
  
  getByCategory(category: string): IMetricAggregator[] {
    return this.getAll().filter(aggregator => aggregator.category === category);
  }
  
  getById(id: string): IMetricAggregator | undefined {
    return this.aggregators.get(id);
  }
  
  getCompatible(context: MetricsContext): IMetricAggregator[] {
    return this.getAll().filter(aggregator => aggregator.canProcess(context));
  }
  
  clear(): void {
    this.aggregators.clear();
  }
}