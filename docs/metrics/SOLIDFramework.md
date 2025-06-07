# SOLID Metrics Framework Architecture

## Overview

The SOLID Metrics Framework is a modular, extensible, and SOLID-compliant metrics aggregation system for processing ResultSpan data within the Wod.Wiki runtime system. It replaces the inheritance-based approach with a composition-based design that enables custom metric modules, improved testability, and clean separation of concerns.

## Core Principles

The framework follows SOLID principles:

- **S**ingle Responsibility: Each utility class has one specific job
- **O**pen/Closed: System is open for extension via registration but closed for modification
- **L**iskov Substitution: Aggregators are interchangeable through common interfaces
- **I**nterface Segregation: Small, focused interfaces instead of large monolithic ones
- **D**ependency Inversion: Aggregators depend on abstractions, with utilities injected as dependencies

## Architecture Components

### Core Types and Interfaces

#### `MetricsContext`
Provides context information to aggregators and utilities:
```typescript
interface MetricsContext {
  spans: ResultSpan[];           // The spans to process
  sourceNodes?: IRuntimeBlock[]; // Source blocks that generated spans
  metadata?: Record<string, any>; // Additional metadata
}
```

#### `AggregatedMetric`
Represents a single computed metric result:
```typescript
interface AggregatedMetric {
  id: string;                    // Unique identifier
  displayName: string;           // Human-readable name
  data: Record<string, any>;     // The computed data
  unit?: string;                 // Optional unit
  category?: string;             // Optional grouping category
}
```

### Utility Classes (Composition Dependencies)

#### `SpanFilters`
Filters spans based on various criteria:
```typescript
// Example usage
const filters = new SpanFilters();
const repSpans = spans.filter(filters.byMetricType('repetitions'));
const leafSpans = spans.filter(filters.leafSpansOnly());
const combined = spans.filter(filters.and(
  filters.byMetricType('repetitions'),
  filters.byEffort('pushups')
));
```

#### `MetricExtractors`
Extracts specific values from metrics:
```typescript
const extractors = new MetricExtractors();
const repExtractor = extractors.valuesByType('repetitions');
const numericExtractor = extractors.numericValues();
```

#### `SpanCalculators`
Performs calculations on collections of spans:
```typescript
const calculators = new SpanCalculators();
const totalReps = calculators.sum(repExtractor)(spans, context);
const avgReps = calculators.average(repExtractor)(spans, context);
```

#### `MetricFactory`
Creates standardized metric result objects:
```typescript
const factory = new MetricFactory();
const totalMetric = factory.createTotal('total-reps', 'Total Repetitions', 150, 'reps');
const groupedMetric = factory.createGrouped('by-exercise', 'Reps by Exercise', exerciseMap);
```

### Aggregator System

#### `IMetricAggregator`
Core interface for all metric aggregators:
```typescript
interface IMetricAggregator {
  readonly id: string;
  readonly displayName: string;
  readonly category?: string;
  
  aggregate(context: MetricsContext): AggregatedMetric[];
  canProcess(context: MetricsContext): boolean;
}
```

#### `BaseMetricAggregator`
Base class using dependency injection:
```typescript
abstract class BaseMetricAggregator implements IMetricAggregator {
  constructor(
    id: string,
    displayName: string,
    protected filters: ISpanFilters,
    protected extractors: IMetricExtractors,
    protected calculators: ISpanCalculators,
    protected factory: IMetricFactory,
    category?: string
  ) {}
  
  abstract aggregate(context: MetricsContext): AggregatedMetric[];
}
```

### Registry and Engine

#### `MetricAggregatorRegistry`
Manages registration and discovery of aggregators:
```typescript
const registry = new MetricAggregatorRegistry();
registry.register(new TotalRepetitionsAggregator(...));
registry.register(new TotalDistanceAggregator(...));

const allAggregators = registry.getAll();
const basicAggregators = registry.getByCategory('basic');
```

#### `MetricAggregationEngine`
Coordinates the aggregation process:
```typescript
const engine = new MetricAggregationEngine(registry);
const results = engine.aggregate(context);
```

## Creating Custom Aggregators

### Step 1: Extend BaseMetricAggregator

```typescript
export class CustomAggregator extends BaseMetricAggregator {
  aggregate(context: MetricsContext): AggregatedMetric[] {
    // Use injected utilities
    const filteredSpans = this.filterSpans(
      context,
      this.filters.byMetricType('repetitions')
    );
    
    if (filteredSpans.length === 0) return [];
    
    // Perform calculations
    const total = this.calculate(
      filteredSpans,
      context,
      this.calculators.sum(this.extractors.numericValues())
    );
    
    // Create result using factory
    return [
      this.factory.createTotal(
        this.id,
        this.displayName,
        total,
        'reps',
        this.category
      )
    ];
  }
}
```

### Step 2: Register with the Framework

```typescript
const framework = MetricsFrameworkFactory.createDefault();
const customAggregator = new CustomAggregator(
  'custom-total',
  'Custom Total',
  framework.utilities.filters,
  framework.utilities.extractors,
  framework.utilities.calculators,
  framework.utilities.factory,
  'custom'
);

framework.registry.register(customAggregator);
```

## Built-in Aggregators

The framework includes several sample aggregators:

### `TotalRepetitionsAggregator`
Calculates total repetitions across all spans:
```typescript
// Results in:
{
  id: 'totalRepetitions',
  displayName: 'Total Repetitions',
  data: { total: 150 },
  unit: 'repetitions',
  category: 'basic'
}
```

### `TotalDistanceAggregator`
Calculates total distance grouped by unit:
```typescript
// Results in:
{
  id: 'totalDistance',
  displayName: 'Total Distance Covered',
  data: {
    byGroup: {
      'meters': 500,
      'miles': 2.5
    }
  },
  category: 'basic'
}
```

## Usage Examples

### Basic Setup

```typescript
import { MetricsFrameworkFactory } from '@/core/metrics/framework';

// Create framework with built-in aggregators
const framework = MetricsFrameworkFactory.createDefault();

// Process spans
const context = { spans: resultSpans };
const metrics = framework.engine.aggregate(context);

console.log(metrics);
// [
//   { id: 'totalRepetitions', displayName: 'Total Repetitions', data: { total: 150 } },
//   { id: 'totalDistance', displayName: 'Total Distance', data: { byGroup: {...} } }
// ]
```

### Custom Aggregator Registration

```typescript
// Create minimal framework
const framework = MetricsFrameworkFactory.createMinimal();

// Create custom aggregator
const workRestRatio = new WorkRestRatioAggregator(
  'work-rest-ratio',
  'Work to Rest Ratio',
  framework.utilities.filters,
  framework.utilities.extractors,
  framework.utilities.calculators,
  framework.utilities.factory
);

// Register and use
framework.registry.register(workRestRatio);
const metrics = framework.engine.aggregate(context);
```

### Selective Aggregation

```typescript
// Process only specific aggregators
const metrics = framework.engine.aggregateWith(
  context, 
  ['totalRepetitions', 'totalDistance']
);
```

## Testing

The framework is designed for testability. Each utility can be tested independently:

```typescript
describe('CustomAggregator', () => {
  it('should calculate correctly', () => {
    const mockFilters = new SpanFilters();
    const mockExtractors = new MetricExtractors();
    const mockCalculators = new SpanCalculators();
    const mockFactory = new MetricFactory();
    
    const aggregator = new CustomAggregator(
      'test-id',
      'Test Aggregator',
      mockFilters,
      mockExtractors,
      mockCalculators,
      mockFactory
    );
    
    const result = aggregator.aggregate(mockContext);
    expect(result).toEqual([...]);
  });
});
```

## Migration from Legacy System

To migrate from the old inheritance-based system:

1. **Replace inheritance with composition**: Instead of extending `ResultSpanAggregateBase`, extend `BaseMetricAggregator` and inject utilities
2. **Extract private methods into utilities**: Move shared logic into utility classes
3. **Update registration**: Use `MetricAggregatorRegistry` instead of direct collection management
4. **Update return types**: Return `AggregatedMetric[]` instead of `Record<string, any>`

### Before (Legacy)
```typescript
export class OldAggregator extends ResultSpanAggregateBase {
  aggregate(spans: ResultSpan[]): Record<string, any> {
    // Private method logic inline
    let total = 0;
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        // Repetitive filtering and calculation logic
      });
    });
    return { total };
  }
}
```

### After (New Framework)
```typescript
export class NewAggregator extends BaseMetricAggregator {
  aggregate(context: MetricsContext): AggregatedMetric[] {
    const filteredSpans = this.filterSpans(context, this.filters.byMetricType('repetitions'));
    const total = this.calculate(filteredSpans, context, this.calculators.sum(this.extractors.numericValues()));
    return [this.factory.createTotal(this.id, this.displayName, total, 'reps')];
  }
}
```

## Extension Points

The framework provides multiple extension points:

1. **Custom Filters**: Implement new filtering logic in `ISpanFilters`
2. **Custom Extractors**: Add new extraction methods in `IMetricExtractors`  
3. **Custom Calculators**: Implement new calculation algorithms in `ISpanCalculators`
4. **Custom Aggregators**: Create domain-specific aggregators extending `BaseMetricAggregator`
5. **Custom Metrics**: Define new metric types and processing logic

This architecture ensures the system remains flexible and extensible while maintaining clean separation of concerns and high testability.