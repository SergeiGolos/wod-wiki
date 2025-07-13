import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo, MockRuntimeBlock } from './JitCompilerDemo';
import { JitCompiler, RuntimeJitStrategies } from '../../src/runtime/JitCompiler';
import { compilers, parseWodLine } from '../../src/runtime/FragmentCompilationManager.fixture';
import { IScriptRuntime } from '../../src/runtime/IScriptRuntime';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { BlockKey } from '../../src/BlockKey';
import { FragmentCompilationManager } from '../../src/runtime/FragmentCompilationManager';
import { CountdownStrategy, EffortStrategy, RoundsStrategy } from '../../src/runtime/strategies';
import { CountdownParentBlock, EffortBlock, RoundsParentBlock } from '../../src/runtime/blocks';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Compiler/JIT Compiler Demo',
  component: JitCompilerDemo,
};

export default meta;

type Story = StoryObj<typeof JitCompilerDemo>;

export const BasicDemo: Story = {
  args: {},
};

const script = `(21-15-9)
  Thrusters`;

const parsedScript = parseWodLine(script);
const runtime: IScriptRuntime = {
    stack: new RuntimeStack(),
} as IScriptRuntime;
const fragmentCompiler = new FragmentCompilationManager(compilers);
const strategyManager = new RuntimeJitStrategies()
    .addStrategy(new CountdownStrategy())
    .addStrategy(new RoundsStrategy())
    .addStrategy(new EffortStrategy());

const compiler = new JitCompiler(parsedScript, fragmentCompiler, strategyManager);
const parent = compiler.compile([parsedScript[0]], runtime);

runtime.stack.push(parent!);

const child = compiler.compile([parsedScript[1]], runtime);
runtime.stack.push(child!);

const toMockBlock = (block: IRuntimeBlock, depth: number): MockRuntimeBlock => {
    let blockType: MockRuntimeBlock['blockType'] = 'Idle';
    if (block instanceof CountdownParentBlock) {
        blockType = 'Timer';
    } else if (block instanceof RoundsParentBlock) {
        blockType = 'Group';
    } else if (block instanceof EffortBlock) {
        blockType = 'Effort';
    }

    const metrics = block.metrics.flatMap(m => m.values.map(v => ({ type: v.type, value: v.value, unit: v.unit })));

    return {
        displayName: block.constructor.name.replace('Block', ''),
        description: block.key.toString(),
        blockType: blockType,
        depth: depth,
        metrics: metrics,
        key: block.key.toString(),
        parentKey: block.parent?.key.toString()
    };
};

export const ChildCompilation: Story = {
    args: {
        initialScript: script,
        initialStack: {
            blocks: [
                toMockBlock(parent!, 0),
                toMockBlock(child!, 1)
            ],
            currentIndex: 1
        }
    }
};
