import { JitCompiler } from '@/runtime/compiler';
import { IRuntimeBlockStrategy } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { sharedParser } from '@/parser/parserInstance';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock, type MockClock } from '@/runtime/RuntimeClock';
import { WhiteboardScript } from '@/parser/WhiteboardScript';
import { ICodeStatement } from '@/core/models/CodeStatement';

export interface RuntimeSnapshot {
  stackDepth: number;
  currentBlockId?: string;
  memoryEntries: MemoryEntry[];
}

export interface MemoryEntry {
  type: string;
  ownerId: string;
  value: any;
}

export interface SnapshotDiff {
  stack: {
    depthChange: number;
    pushed: string[];
    popped: string[];
  };
}

export class RuntimeTestHarness {
  readonly runtime: ScriptRuntime;
  readonly script: WhiteboardScript;
  readonly jit: JitCompiler;
  readonly clock: MockClock;

  constructor(
    scriptText: string,
    strategies: IRuntimeBlockStrategy[] = [],
    clockTime: Date = new Date()
  ) {
    // 1. Parser (use shared singleton)
    this.script = sharedParser.read(scriptText) as WhiteboardScript;

    // 2. JIT
    this.jit = new JitCompiler(strategies);

    // 3. Runtime dependencies
    this.clock = createMockClock(clockTime);
    const memory = new RuntimeMemory();
    const stack = new RuntimeStack();
    const eventBus = new EventBus();

    // 4. Runtime
    this.runtime = new ScriptRuntime(
        this.script,
        this.jit,
        {
            memory,
            stack,
            clock: this.clock,
            eventBus
        }
    );
  }

  // Quick accessors
  get stackDepth(): number { return this.runtime.stack.count; }
  get currentBlock() { return this.runtime.stack.current; }

  /**
   * Advance the mock clock by milliseconds and dispatch a tick event.
   */
  advanceClock(ms: number): this {
    this.clock.advance(ms);
    this.runtime.handle({
      name: 'tick',
      timestamp: this.clock.now,
      data: { source: 'test-harness' }
    });
    return this;
  }

  pushStatement(index: number) {
    const statement = this.script.statements[index];
    if (!statement) throw new Error(`Statement index ${index} out of bounds`);

    const block = this.jit.compile([statement as ICodeStatement], this.runtime);
    if (!block) throw new Error(`Failed to compile statement ${index}`);

    this.runtime.stack.push(block);
    return block;
  }

  /**
   * Dispose the runtime and release all resources.
   */
  dispose(): void {
    this.runtime.dispose();
  }
}

export class RuntimeTestBuilder {
  private scriptText = '';
  private strategies: IRuntimeBlockStrategy[] = [];
  private clockTime = new Date();

  withScript(text: string): this {
    this.scriptText = text;
    return this;
  }

  withStrategy(strategy: IRuntimeBlockStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  withClock(time: Date): this {
    this.clockTime = time;
    return this;
  }

  build(): RuntimeTestHarness {
    return new RuntimeTestHarness(this.scriptText, this.strategies, this.clockTime);
  }
}
