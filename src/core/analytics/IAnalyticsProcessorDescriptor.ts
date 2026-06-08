import type { FenceDialect } from '@/components/Editor/types';
import type { MetricType } from '../models/Metric';

/**
 * Shared descriptor for all analytics processors.
 *
 * Defines applicability rules: which dialects the processor supports
 * and which metrics must be present in the authored script for the
 * processor to activate.
 */
export interface IAnalyticsProcessorDescriptor {
  readonly id: string;

  /**
   * Allow-list of dialects this processor is eligible for.
   * Omit or leave undefined to allow all dialects.
   */
  readonly dialects?: readonly FenceDialect[];

  /**
   * Metrics that must ALL be present in the authored script for this
   * processor to activate (AND semantics).
   * Omit or leave undefined when applicability cannot be expressed
   * with a simple metric list (e.g. disjunctive conditions).
   */
  readonly requiredMetrics?: readonly MetricType[];
}
