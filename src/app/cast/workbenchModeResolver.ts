import type { DocumentItem } from '@/components/Editor/utils/documentStructure';
import type { WodBlock } from '@/components/Editor/types';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { ViewMode } from '@/panels/panel-system/ResponsiveViewport';
import type { ExecutionStatus } from '@/runtime/hooks/useRuntimeExecution';
import type { RpcWorkbenchUpdate } from '@/hooks/useCastSignaling';
import { buildPreviewProjection, buildReviewProjection } from './workbenchProjection';

export interface WorkbenchModeResolverState {
  readonly viewMode: ViewMode;
  readonly executionStatus: ExecutionStatus;
  readonly runtime: unknown | null;
  readonly analyticsSegments: Segment[];
  readonly selectedBlock: WodBlock | null;
  readonly documentItems: DocumentItem[];
}

/**
 * Single mapping point from workbench state to receiver display update.
 */
export class WorkbenchModeResolver {
  resolve(state: WorkbenchModeResolverState): RpcWorkbenchUpdate {
    const mode = this.resolveMode(state);

    if (mode === 'active') {
      return { type: 'rpc-workbench-update', mode: 'active' };
    }

    if (mode === 'review') {
      return buildReviewProjection(state.analyticsSegments);
    }

    return buildPreviewProjection(state.selectedBlock, state.documentItems);
  }

  private resolveMode(state: WorkbenchModeResolverState): 'active' | 'review' | 'preview' {
    if (state.viewMode === 'track') {
      if (state.runtime && (state.executionStatus === 'running' || state.executionStatus === 'paused')) {
        return 'active';
      }

      if (state.analyticsSegments.length > 0) {
        return 'review';
      }

      if (state.runtime) {
        return 'active';
      }

      return 'preview';
    }

    if (state.viewMode === 'review' && state.analyticsSegments.length > 0) {
      return 'review';
    }

    return 'preview';
  }
}

export const workbenchModeResolver = new WorkbenchModeResolver();
