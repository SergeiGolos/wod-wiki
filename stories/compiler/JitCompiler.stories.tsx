import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo } from './JitCompilerDemo';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Compiler/JIT Compiler Demo',
  component: JitCompilerDemo,
};

export default meta;

type Story = StoryObj<typeof JitCompilerDemo>;

export const BasicDemo: Story = {
  args: {},
};
