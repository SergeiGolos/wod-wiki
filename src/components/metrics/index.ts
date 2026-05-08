// Barrel export for metric visualization components and utilities

export * from '../../views/runtime/MetricVisualizer';

export { metricColorMap, getMetricColorClasses, getMetricIcon } from '../../views/runtime/metricColorMap';
export { MetricType } from '@/core/models/Metric';
export type { FragmentColorMap } from '../../views/runtime/metricColorMap';

export type { ParseError } from '../../views/runtime/types';

// Unified statement/block display components
export { StatementDisplay, BlockDisplay, MetricList } from './StatementDisplay';
export type { StatementDisplayProps, BlockDisplayProps, MetricListProps } from './StatementDisplay';

// Fragment Source Visualization
export { MetricSourceRow, type MetricSourceRowProps, type FragmentSourceStatus, type FragmentSourceEntry } from './MetricSourceRow';
export { MetricSourceList, type MetricSourceListProps } from './MetricSourceList';

// Re-export display configuration types
export {
    type DisplayStatus,
    type VisualizerSize,
    type VisualizerFilter,
} from '@/core/models/DisplayItem';
