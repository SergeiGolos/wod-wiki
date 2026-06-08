import { globalParser, runtimeFactory } from '@/hooks/useRuntimeFactory';
import type { IScriptRuntime } from '@/hooks/useRuntimeTimer';
import type { IOutputStatement } from '@/core/models/OutputStatement';
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types';
import { toStoredOutputStatement } from '@/components/Editor/types';

const factory = runtimeFactory;

export function prepareRuntimeBlock(block: ScriptBlock): ScriptBlock & { statements: NonNullable<ScriptBlock['statements']> } {
  if (block.statements?.length) {
    return block as ScriptBlock & { statements: NonNullable<ScriptBlock['statements']> };
  }
  return { ...block, statements: globalParser.read(block.content).statements };
}

export function createRuntimeForBlock(block: ScriptBlock): IScriptRuntime | null {
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
