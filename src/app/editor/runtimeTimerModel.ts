import { globalParser, runtimeFactory } from '@/hooks/useRuntimeFactory';
import type { IScriptRuntime } from '@/hooks/useRuntimeTimer';
import type { IOutputStatement } from '@/core/models/OutputStatement';
import type { WodBlock, WorkoutResults } from '@/components/Editor/types';
import { toStoredOutputStatement } from '@/components/Editor/types';

const factory = runtimeFactory;

export function prepareRuntimeBlock(block: WodBlock): WodBlock & { statements: NonNullable<WodBlock['statements']> } {
  if (block.statements?.length) {
    return block as WodBlock & { statements: NonNullable<WodBlock['statements']> };
  }
  return { ...block, statements: globalParser.read(block.content).statements };
}

export function createRuntimeForBlock(block: WodBlock): IScriptRuntime | null {
  return factory.createRuntime(prepareRuntimeBlock(block)) ?? null;
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
