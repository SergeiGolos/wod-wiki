// Barrel export for fragment visualization components and utilities

export * from '../../views/runtime/FragmentVisualizer';

export { fragmentColorMap, getFragmentColorClasses, getFragmentIcon } from '../../views/runtime/fragmentColorMap';
export type { FragmentType, FragmentColorMap } from '../../views/runtime/fragmentColorMap';

export type { ParseError } from '../../views/runtime/types';

// Unified statement/block display components
export { StatementDisplay, BlockDisplay, FragmentList } from './StatementDisplay';
export type { StatementDisplayProps, BlockDisplayProps, FragmentListProps } from './StatementDisplay';

// Fragment Source Visualization
export { FragmentSourceRow, type FragmentSourceRowProps, type FragmentSourceStatus, type FragmentSourceEntry } from './FragmentSourceRow';
export { FragmentSourceList, type FragmentSourceListProps } from './FragmentSourceList';

// Re-export display configuration types
export {
    type DisplayStatus,
    type VisualizerSize,
    type VisualizerFilter,
} from '@/core/models/DisplayItem';
