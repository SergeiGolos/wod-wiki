import { JitCompiler } from '@/runtime/compiler';
import { IRuntimeBlockStrategy } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { MdTimerRuntime } from '@/parser/md-timer';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/EventBus';
import { createMockClock } from '@/runtime/RuntimeClock';
import { WodScript } from '@/parser/WodScript';
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
  readonly script: WodScript;
  readonly jit: JitCompiler;

  constructor(
    scriptText: string,
    strategies: IRuntimeBlockStrategy[] = [],
    clockTime: Date = new Date()
  ) {
    // 1. Parser
    const parser = new MdTimerRuntime();
    this.script = parser.read(scriptText) as WodScript;

    // 2. JIT
    this.jit = new JitCompiler(strategies);

    // 3. Runtime dependencies
    const clock = createMockClock(clockTime);
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
            clock,
            eventBus
        }
    );
  }

  // Quick accessors
  get stackDepth(): number { return this.runtime.stack.count; }
  get currentBlock() { return this.runtime.stack.current; }

  pushStatement(index: number) {
    const statement = this.script.statements[index];
    if (!statement) throw new Error(`Statement index ${index} out of bounds`);

    const block = this.jit.compile([statement as ICodeStatement], this.runtime);
    if (!block) throw new Error(`Failed to compile statement ${index}`);

    this.runtime.stack.push(block);
    return block;
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
