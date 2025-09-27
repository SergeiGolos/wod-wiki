import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo } from './JitCompilerDemo';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { WodScript } from '../../src/WodScript';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { MdTimerRuntime } from '../../src/parser/md-timer';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Compiler/JIT Compiler Demo',
  component: JitCompilerDemo,
};

export default meta;

type Story = StoryObj<typeof JitCompilerDemo>;

export const BasicDemo: Story = {
  args: {
    initialScript: `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`
  },
};

const scriptText = `3 rounds:
  run 400m
  21 air squats
  12 push-ups
rest 1:00
row 500m for time`;

// Parse the markdown to get actual statements
const mdRuntime = new MdTimerRuntime();
const script = mdRuntime.read(scriptText) as WodScript;
const jitCompiler = new JitCompiler([]);
const runtime = new ScriptRuntime(script, jitCompiler);

export const ChildCompilation: Story = {
  args: {
    initialScript: scriptText,
    runtime: runtime
  }
};
