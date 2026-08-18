/**
 * Headless Execution Command Runner
 *
 * Executes Whiteboard Script through JIT compiler and runtime state machine,
 * emitting a versioned execution-log IR envelope.
 */

import { createParser } from '../parser/parserInstance';
import type { WhiteboardScript } from '../parser/WhiteboardScript';
import { createCompiler } from '../runtime/services/runtimeServices';
import { RuntimeStack } from '../runtime/RuntimeStack';
import { createMockClock } from '../runtime/RuntimeClock';
import { EventBus } from '../runtime/events/EventBus';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { StartSessionAction } from '../runtime/actions/stack/StartSessionAction';
import { NextEvent } from '../runtime/events/NextEvent';
import { createAnalyticsEngineForBlock } from '../core/analytics/createAnalyticsEngineForBlock';
import { toStoredOutputStatement, type StoredOutputStatement } from '../types';
import { buildWorkoutResults } from '../app/editor/runtimeTimerModel';
import type { INowProvider } from '../runtime/INowProvider';
import { frozenNow } from '../runtime/INowProvider';
import type { IOutputStatement } from '../core/models/OutputStatement';
import { createIRFile, type WodWikiIRFile, type ExecutionLog } from '../ir';
import { ParseSyntaxError } from './parse';

export interface RunOptions {
  sport?: string;
  startTime?: number;
  maxIterations?: number;
  now?: INowProvider;
  sourceLabel?: string;
}

/**
 * Runs a workout script to completion using headless state machine and Node clock.
 */
export async function runExecution(
  source: string,
  options: RunOptions = {},
): Promise<WodWikiIRFile<ExecutionLog>> {
  const parser = createParser();
  const script = parser.read(source, options.sport) as WhiteboardScript;

  if (script.errors && script.errors.length > 0) {
    throw new ParseSyntaxError(script.errors);
  }

  const startTime = options.startTime ?? Date.now();
  const now = options.now ?? frozenNow(new Date(startTime));
  const compiler = createCompiler();
  const clock = createMockClock(new Date(startTime));
  const stack = new RuntimeStack();
  const eventBus = new EventBus();

  const runtime = new ScriptRuntime(
    script,
    compiler,
    { stack, clock, eventBus },
    {},
    now,
  );

  const { engine, analyticsContext } = createAnalyticsEngineForBlock({
    id: 'cli-block',
    content: source,
    statements: script.statements,
    sport: options.sport as any,
    version: 1,
    startLine: 0,
    endLine: 0,
    dialect: 'time',
    state: 'idle',
    widgetIds: {},
    createdAt: Date.now(),
  });
  runtime.analyticsContext = analyticsContext;
  runtime.setAnalyticsEngine(engine);

  const outputs: IOutputStatement[] = [];
  runtime.subscribeToOutput((out) => {
    outputs.push(out);
  });

  // Start the workout session
  runtime.do(new StartSessionAction());

  const maxSteps = options.maxIterations ?? 5000;
  let steps = 0;

  while (stack.count > 0 && steps < maxSteps) {
    runtime.handle(new NextEvent(undefined, runtime.nowProvider));
    clock.advance(1000);
    steps++;
  }

  const workoutResults = buildWorkoutResults(outputs, {
    startTime,
    elapsedTime: steps * 1000,
    completed: stack.count === 0,
    now,
  });

  const statements: StoredOutputStatement[] = outputs.map(toStoredOutputStatement);

  return createIRFile(
    'execution-log',
    {
      results: workoutResults,
      statements,
    },
    options.sourceLabel ?? 'cli:wod run',
  );
}
