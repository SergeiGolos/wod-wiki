import { AggregatedMetric } from "../types";
import { IMetricFactory } from "../interfaces";

/**
 * Concrete implementation of metric factory utilities.
 * Follows Single Responsibility Principle - only handles metric creation.
 */
export class MetricFactory implements IMetricFactory {
  
  create(id: string, displayName: string, data: Record<string, any>, unit?: string, category?: string): AggregatedMetric {
    return {
      id,
      displayName,
      data,
      unit,
      category
    };
  }
  
  createCount(id: string, displayName: string, count: number, category?: string): AggregatedMetric {
    return this.create(id, displayName, { count }, 'count', category);
  }
  
  createTotal(id: string, displayName: string, total: number, unit: string, category?: string): AggregatedMetric {
    return this.create(id, displayName, { total }, unit, category);
  }
  
  createGrouped<K>(id: string, displayName: string, groups: Map<K, any>, category?: string): AggregatedMetric {
    const data: Record<string, any> = {};
    groups.forEach((value, key) => {
      data[String(key)] = value;
    });
    return this.create(id, displayName, { byGroup: data }, undefined, category);
  }
  
  createRatio(id: string, displayName: string, numerator: number, denominator: number, category?: string): AggregatedMetric {
    const ratio = denominator !== 0 ? numerator / denominator : 0;
    return this.create(id, displayName, { 
      numerator, 
      denominator, 
      ratio 
    }, 'ratio', category);
  }
}