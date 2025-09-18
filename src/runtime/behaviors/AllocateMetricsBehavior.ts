import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IAllocateMetricsBehavior } from './IAllocateMetricsBehavior';
import { RuntimeMetric } from '../RuntimeMetric';

export class AllocateMetricsBehavior implements IAllocateMetricsBehavior {
  private metricsRef?: IMemoryReference<RuntimeMetric[]>;

  constructor(private readonly initial: RuntimeMetric[] = []) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.metricsRef = runtime.memory.allocate<RuntimeMetric[]>('metrics', block.key.toString(), [...this.initial], undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getMetrics(): RuntimeMetric[] { return this.metricsRef?.get() ?? []; }
  setMetrics(metrics: RuntimeMetric[]): void { this.metricsRef?.set(metrics); }
  addMetric(metric: RuntimeMetric): void {
    const curr = this.getMetrics();
    this.metricsRef?.set([...curr, metric]);
  }
  getMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined { return this.metricsRef; }
  initializeMetrics(initialMetrics: RuntimeMetric[]): void { this.metricsRef?.set([...initialMetrics]); }
}
