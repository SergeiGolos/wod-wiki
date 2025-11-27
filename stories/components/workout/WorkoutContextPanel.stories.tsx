import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutContextPanel } from '@/components/workout/WorkoutContextPanel';
import { WodBlock, WodBlockState } from '@/markdown-editor/types';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { FragmentType } from '@/core/models/CodeFragment';

const meta: Meta<typeof WorkoutContextPanel> = {
  title: 'Components/Workout/WorkoutContextPanel',
  component: WorkoutContextPanel,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['edit', 'run', 'analyze'],
    },
    showStartButton: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutContextPanel>;

// Mock Data
const mockStatements: ICodeStatement[] = [
  {
    id: 1,
    children: [],
    meta: { line: 1, column: 1, text: "For time:" },
    fragments: [
      { fragmentType: FragmentType.Text, image: "For time:", type: "text" }
    ]
  },
  {
    id: 2,
    children: [],
    meta: { line: 2, column: 1, text: "21-15-9 reps of:" },
    fragments: [
      { fragmentType: FragmentType.Rounds, image: "21-15-9", value: [21, 15, 9], type: "rounds" },
      { fragmentType: FragmentType.Text, image: "reps of:", type: "text" }
    ]
  },
  {
    id: 3,
    parent: 2,
    children: [],
    meta: { line: 3, column: 3, text: "Pull-ups" },
    fragments: [
      { fragmentType: FragmentType.Action, image: "Pull-ups", value: { exercise: "Pull-ups" }, type: "action" }
    ]
  },
  {
    id: 4,
    parent: 2,
    children: [],
    meta: { line: 4, column: 3, text: "Thrusters" },
    fragments: [
      { fragmentType: FragmentType.Action, image: "Thrusters", value: { exercise: "Thrusters" }, type: "action" }
    ]
  }
];

const mockBlock: WodBlock = {
  id: 'block-1',
  startLine: 0,
  endLine: 5,
  content: "For time:\n21-15-9 reps of:\n  Pull-ups\n  Thrusters",
  state: 'parsed' as WodBlockState,
  statements: mockStatements,
  widgetIds: {}
};

export const EditMode: Story = {
  args: {
    block: mockBlock,
    mode: 'edit',
    showStartButton: true,
    onStart: () => alert('Start Workout Clicked'),
    onEditStatement: (index, text) => console.log('Edit', index, text),
    onDeleteStatement: (index) => console.log('Delete', index),
  },
};

export const RunMode: Story = {
  args: {
    block: { ...mockBlock, state: 'running' as WodBlockState },
    mode: 'run',
    activeStatementIds: new Set([3]), // Highlight Pull-ups
  },
};

export const AnalyzeMode: Story = {
  args: {
    block: { ...mockBlock, state: 'completed' as WodBlockState },
    mode: 'analyze',
  },
};

export const Empty: Story = {
  args: {
    block: null,
    mode: 'edit',
  },
};

export const NoStatements: Story = {
  args: {
    block: { ...mockBlock, statements: [] },
    mode: 'edit',
  },
};
