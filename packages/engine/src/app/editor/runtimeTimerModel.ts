import type { IOutputStatement } from '../../core/models/OutputStatement';
import type { WorkoutResults, ScriptBlock } from '../../types';
import { toStoredOutputStatement } from '../../types';
import type { INowProvider } from '../../runtime/INowProvider';
import { createParser } from '../../parser/parserInstance';

export function prepareRuntimeBlock(block: ScriptBlock): ScriptBlock & { statements: NonNullable<ScriptBlock['statements']> } {
  if (block.statements?.length) {
    return block as ScriptBlock & { statements: NonNullable<ScriptBlock['statements']> };
  }
  return { ...block, statements: createParser().read(block.content, block.sport).statements };
}
export function buildWorkoutResults(
  outputs: readonly IOutputStatement[],
  options: {
    readonly startTime?: number;
    readonly elapsedTime: number;
    readonly completed: boolean;
    readonly now: INowProvider;
  },
): WorkoutResults {
  return {
    startTime: options.startTime ?? options.now.nowMs(),
    endTime: options.now.nowMs(),
    duration: options.elapsedTime,
    completed: options.completed,
    logs: outputs.map(toStoredOutputStatement),
  };
}

export function countSegmentOutputs(outputs: readonly IOutputStatement[]): number {
  return outputs.filter((output) => output.outputType === 'segment').length;
}
