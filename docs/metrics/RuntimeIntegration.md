# Runtime Integration Example

This example demonstrates how to integrate the new SOLID metrics framework with the existing TimerRuntime system.

## Basic Integration

```typescript
import { TimerRuntime } from '@/core/runtime/TimerRuntime';
import { MetricsIntegrationAdapter } from '@/core/metrics';

// Example of how a consumer could optionally use the new framework
class EnhancedTimerRuntime extends TimerRuntime {
  private metricsAdapter?: MetricsIntegrationAdapter;
  
  constructor(...args: any[]) {
    super(...args);
    
    // Optionally enable the new metrics framework
    if (this.shouldUseNewMetrics()) {
      this.metricsAdapter = MetricsIntegrationAdapter.createForRuntime();
    }
  }
  
  /**
   * Get aggregated metrics using the new framework.
   * Falls back to traditional span collection if the new framework is not enabled.
   */
  public getAggregatedMetrics() {
    if (this.metricsAdapter) {
      // Use the new SOLID framework
      const newMetrics = this.metricsAdapter.processSpansFromBuilder(this.registry);
      return {
        framework: 'solid',
        metrics: newMetrics,
        legacy: this.metricsAdapter.toLegacyFormat(newMetrics)
      };
    } else {
      // Use the existing ResultSpanBuilder
      return {
        framework: 'legacy',
        spans: this.registry.Build()
      };
    }
  }
  
  private shouldUseNewMetrics(): boolean {
    // This could be a configuration option, feature flag, etc.
    return process.env.USE_SOLID_METRICS === 'true';
  }
}
```

## Standalone Usage

```typescript
import { 
  MetricsFrameworkFactory, 
  MetricsIntegrationAdapter,
  TotalRepetitionsAggregator,
  TotalDistanceAggregator
} from '@/core/metrics';

// Create the framework
const framework = MetricsFrameworkFactory.createDefault();

// Add custom aggregators if needed
const customAggregator = new CustomWorkoutAggregator(
  'workout-summary',
  'Workout Summary',
  framework.utilities.filters,
  framework.utilities.extractors,
  framework.utilities.calculators,
  framework.utilities.factory,
  'analysis'
);
framework.registry.register(customAggregator);

// Create the adapter
const adapter = new MetricsIntegrationAdapter(framework.engine);

// Process spans from any source
const aggregatedMetrics = adapter.processSpans(resultSpans);

console.log('Aggregated metrics:', aggregatedMetrics);
// Output:
// [
//   { id: 'totalRepetitions', displayName: 'Total Repetitions', data: { total: 150 } },
//   { id: 'totalDistance', displayName: 'Total Distance', data: { byGroup: {...} } },
//   { id: 'workout-summary', displayName: 'Workout Summary', data: {...} }
// ]
```

## Consumer Applications

Applications consuming the wod-wiki library can now:

1. **Use the traditional system** (no changes required)
2. **Opt into the new framework** for enhanced metrics
3. **Gradually migrate** by using both systems side-by-side
4. **Extend with custom aggregators** for domain-specific metrics

```typescript
import { WikiContainer } from '@bitcobblers/wod-wiki-library';
import { MetricsFrameworkFactory } from '@bitcobblers/wod-wiki-library';

function MyWorkoutApp() {
  const [metricsData, setMetricsData] = useState(null);
  
  const handleWorkoutComplete = (runtime) => {
    // Option 1: Use traditional spans
    const spans = runtime.registry.Build();
    
    // Option 2: Use new framework for advanced metrics
    const framework = MetricsFrameworkFactory.createDefault();
    const adapter = new MetricsIntegrationAdapter(framework.engine);
    const metrics = adapter.processSpansFromBuilder(runtime.registry);
    
    setMetricsData({ spans, metrics });
  };
  
  return (
    <div>
      <WikiContainer onWorkoutComplete={handleWorkoutComplete} />
      {metricsData && (
        <MetricsDisplay 
          spans={metricsData.spans}
          aggregatedMetrics={metricsData.metrics}
        />
      )}
    </div>
  );
}
```

This approach ensures backward compatibility while providing a clear migration path to the new SOLID framework.