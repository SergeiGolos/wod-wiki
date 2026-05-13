import { globalParser, runtimeFactory } from '@/hooks/useRuntimeFactory';
import type { IScriptRuntime } from '@/hooks/useRuntimeTimer';
import type { IOutputStatement } from '@/core/models/OutputStatement';
import type { WodBlock, WorkoutResults } from '@/components/Editor/types';
import { toStoredOutputStatement } from '@/components/Editor/types';

const factory = runtimeFactory;

export function createRuntimeForBlock(block: WodBlock): IScriptRuntime | null {
  const blockWithStatements = block.statements?.length
    ? block
    : { ...block, statements: globalParser.read(block.content).statements };

  return factory.createRuntime(blockWithStatements) ?? null;
}

export function buildWorkoutResults(
  outputs: readonly IOutputStatement[],
  options: {
    readonly startTime?: number;
    readonly elapsedTime: number;
    readonly completed: boolean;
  },
): WorkoutResults {
  return {
    startTime: options.startTime || Date.now(),
    endTime: Date.now(),
    duration: options.elapsedTime,
    completed: options.completed,
    logs: outputs.map(toStoredOutputStatement),
  };
}

export function countSegmentOutputs(outputs: readonly IOutputStatement[]): number {
  return outputs.filter((output) => output.outputType === 'segment').length;
}
