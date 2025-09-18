import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IInheritMetricsBehavior } from './IInheritMetricsBehavior';
import { RuntimeMetric } from '../RuntimeMetric';

export class InheritMetricsBehavior implements IInheritMetricsBehavior {
  private inheritedMetricsRef?: IMemoryReference<RuntimeMetric[]>;

  constructor(private readonly initialMetrics: RuntimeMetric[] = []) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    const inherited = this.computeInheritedMetrics(runtime, block);
    this.inheritedMetricsRef = runtime.memory.allocate<RuntimeMetric[]>(
      'inherited-metrics',
      block.key.toString(),
      inherited,
      undefined,
      'public'
    );
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getInheritedMetrics(): RuntimeMetric[] {
    return this.inheritedMetricsRef?.get() ?? [];
  }

  getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
    return this.inheritedMetricsRef;
  }

  private computeInheritedMetrics(runtime: IScriptRuntime, block: IRuntimeBlock): RuntimeMetric[] {
    // Preferred path: compose from visible metric items (single-object references)
    const metricEntries = this.findVisibleByType<any>(runtime, block, 'metric');
    if (metricEntries.length > 0) {
      const entries = metricEntries
        .map(ref => ref.get())
        .filter(Boolean) as Array<{ sourceId: string; type: any; value: any; unit: string }>;

      // Group by sourceId to form RuntimeMetric objects
      const bySource = new Map<string, RuntimeMetric>();
      for (const e of entries) {
        const rm = bySource.get(e.sourceId) || { sourceId: e.sourceId, values: [] };
        rm.values.push({ type: e.type, value: e.value, unit: e.unit });
        bySource.set(e.sourceId, rm);
      }
      return Array.from(bySource.values());
    }

    // Fallback: legacy public metrics array if present
    const parentPublicMetrics = this.findVisibleByType<RuntimeMetric[]>(runtime, block, 'metrics-snapshot');
    if (parentPublicMetrics.length > 0) {
      const parentMetrics = parentPublicMetrics[0].get() || [];
      return [...this.initialMetrics, ...parentMetrics];
    }

    // Fallback to own metrics if no parent metrics available
    return [...this.initialMetrics];
  }

  private findVisibleByType<T>(runtime: IScriptRuntime, block: IRuntimeBlock, type: string): IMemoryReference<T>[] {
    // Search for visible memory references of the given type
    return runtime.memory.searchReferences<T>({ type, visibility: 'public' });
  }
}