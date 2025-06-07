import { IMetricAggregationEngine, IMetricAggregatorRegistry } from "./aggregator";
import { ISpanFilters, IMetricExtractors, ISpanCalculators, IMetricFactory } from "./interfaces";
import { MetricAggregationEngine } from "./MetricAggregationEngine";
import { MetricAggregatorRegistry } from "./MetricAggregatorRegistry";
import { SpanFilters } from "./utilities/SpanFilters";
import { MetricExtractors } from "./utilities/MetricExtractors";
import { SpanCalculators } from "./utilities/SpanCalculators";
import { MetricFactory } from "./utilities/MetricFactory";
import { TotalDistanceAggregator } from "./aggregators/TotalDistanceAggregator";
import { TotalRepetitionsAggregator } from "./aggregators/TotalRepetitionsAggregator";

/**
 * Factory for creating a fully configured metrics framework.
 * Provides default implementations and built-in aggregators.
 */
export class MetricsFrameworkFactory {
  
  /**
   * Create a complete metrics framework with default utilities and built-in aggregators.
   */
  static createDefault(): {
    engine: IMetricAggregationEngine;
    registry: IMetricAggregatorRegistry;
    utilities: {
      filters: ISpanFilters;
      extractors: IMetricExtractors;
      calculators: ISpanCalculators;
      factory: IMetricFactory;
    };
  } {
    // Create utility instances
    const filters = new SpanFilters();
    const extractors = new MetricExtractors();
    const calculators = new SpanCalculators();
    const factory = new MetricFactory();
    
    // Create registry and engine
    const registry = new MetricAggregatorRegistry();
    const engine = new MetricAggregationEngine(registry);
    
    // Register built-in aggregators
    const builtInAggregators = [
      new TotalDistanceAggregator(
        "totalDistance",
        "Total Distance Covered",
        filters,
        extractors,
        calculators,
        factory,
        "basic"
      ),
      new TotalRepetitionsAggregator(
        "totalRepetitions", 
        "Total Repetitions",
        filters,
        extractors,
        calculators,
        factory,
        "basic"
      )
    ];
    
    builtInAggregators.forEach(aggregator => registry.register(aggregator));
    
    return {
      engine,
      registry,
      utilities: {
        filters,
        extractors,
        calculators,
        factory
      }
    };
  }
  
  /**
   * Create a minimal framework without built-in aggregators.
   */
  static createMinimal(): {
    engine: IMetricAggregationEngine;
    registry: IMetricAggregatorRegistry;
    utilities: {
      filters: ISpanFilters;
      extractors: IMetricExtractors;
      calculators: ISpanCalculators;
      factory: IMetricFactory;
    };
  } {
    const filters = new SpanFilters();
    const extractors = new MetricExtractors();
    const calculators = new SpanCalculators();
    const factory = new MetricFactory();
    
    const registry = new MetricAggregatorRegistry();
    const engine = new MetricAggregationEngine(registry);
    
    return {
      engine,
      registry,
      utilities: {
        filters,
        extractors,
        calculators,
        factory
      }
    };
  }
}