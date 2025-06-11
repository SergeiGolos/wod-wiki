import { CodeFragment, FragmentType } from "../../types/CodeFragment";
import { RuntimeMetric } from "../../types/RuntimeMetric";
import { BlockKey } from "../../types/BlockKey";
import { IRuntimeBlock } from "../../IRuntimeBlock";

export interface IFragmentCompilationStrategy<TFragment extends CodeFragment> {
  readonly fragmentType: FragmentType;
  
  compile(
    fragment: TFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[];
}

export interface FragmentCompilationContext {
  readonly runtimeState: RuntimeState;
  readonly blockContext: BlockContext;
  readonly parentMetrics: RuntimeMetric[];
  readonly executionDepth: number;
  readonly currentTime: number;
  readonly currentRound?: number; // Based on actual RuntimeBlockMetrics.extractMetricValues usage
}

export interface RuntimeState {
  readonly isActive: boolean;
  readonly isPaused: boolean;
  readonly elapsedTime: number;
  readonly currentRep: number;
  readonly currentRound: number;
}

export interface BlockContext {
  readonly blockKey: BlockKey;
  readonly parentBlock?: IRuntimeBlock;
  readonly childBlocks: IRuntimeBlock[];
  readonly isRepeating: boolean;
  readonly iterationCount: number;
}
