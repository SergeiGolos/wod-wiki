import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutTimerDialog } from '../../src/markdown-editor/components/WorkoutTimerDialog';
import { WodBlock } from '../../src/markdown-editor/types';
import { ICodeStatement } from '../../src/CodeStatement';
import { ICodeFragment } from '../../src/CodeFragment';
import { useState } from 'react';

const meta: Meta<typeof WorkoutTimerDialog> = {
  title: 'Markdown Editor/WorkoutTimerDialog',
  component: WorkoutTimerDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Dialog for tracking workouts with timer controls. Opens when Track button is clicked in ContextPanel.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample fragments for testing
const timerFragment: ICodeFragment = {
  type: 'Timer',
  fragmentType: 'timer' as any,
  image: '20:00',
  value: { duration: 1200 }
};

const actionFragment: ICodeFragment = {
  type: 'Action',
  fragmentType: 'action' as any,
  image: 'AMRAP',
  value: 'AMRAP'
};

const effortFragment1: ICodeFragment = {
  type: 'Effort',
  fragmentType: 'effort' as any,
  image: '+ 5 Pullups',
  value: { count: 5, exercise: 'Pullups' }
};

const effortFragment2: ICodeFragment = {
  type: 'Effort',
  fragmentType: 'effort' as any,
  image: '+ 10 Pushups',
  value: { count: 10, exercise: 'Pushups' }
};

const effortFragment3: ICodeFragment = {
  type: 'Effort',
  fragmentType: 'effort' as any,
  image: '+ 15 Squats',
  value: { count: 15, exercise: 'Squats' }
};

// Sample statements
const statement1: ICodeStatement = {
  id: 1,
  children: [[2, 3, 4]],
  fragments: [timerFragment, actionFragment],
  isLeaf: false,
  meta: {} as any
};

const statement2: ICodeStatement = {
  id: 2,
  parent: 1,
  children: [],
  fragments: [effortFragment1],
  isLeaf: true,
  meta: {} as any
};

const statement3: ICodeStatement = {
  id: 3,
  parent: 1,
  children: [],
  fragments: [effortFragment2],
  isLeaf: true,
  meta: {} as any
};

const statement4: ICodeStatement = {
  id: 4,
  parent: 1,
  children: [],
  fragments: [effortFragment3],
  isLeaf: true,
  meta: {} as any
};

// Sample WOD block
const sampleBlock: WodBlock = {
  id: 'wod-1',
  startLine: 5,
  endLine: 10,
  content: `20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Squats`,
  state: 'parsed',
  statements: [statement1, statement2, statement3, statement4],
  widgetIds: {}
};

// Wrapper component with state management
const DialogWrapper = ({ block }: { block: WodBlock }) => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Timer Dialog
      </button>
      <WorkoutTimerDialog
        open={open}
        onOpenChange={setOpen}
        block={block}
      />
    </>
  );
};

export const Default: Story = {
  render: () => <DialogWrapper block={sampleBlock} />
};

export const SimpleCountup: Story = {
  render: () => <DialogWrapper block={{
    id: 'wod-simple',
    startLine: 0,
    endLine: 1,
    content: 'For Time:\n  100 Burpees',
    state: 'parsed',
    statements: [
      {
        id: 1,
        children: [],
        fragments: [{
          type: 'Effort',
          fragmentType: 'effort' as any,
          image: '100 Burpees',
          value: { count: 100, exercise: 'Burpees' }
        }],
        isLeaf: true,
        meta: {} as any
      }
    ],
    widgetIds: {}
  }} />
};

export const WithRounds: Story = {
  render: () => <DialogWrapper block={{
    id: 'wod-rounds',
    startLine: 0,
    endLine: 3,
    content: '(3)\n  10 Thrusters\n  10 Pullups',
    state: 'parsed',
    statements: [
      {
        id: 1,
        children: [[2, 3]],
        fragments: [{
          type: 'Rounds',
          fragmentType: 'rounds' as any,
          image: '(3)',
          value: { count: 3 }
        }],
        isLeaf: false,
        meta: {} as any
      },
      {
        id: 2,
        parent: 1,
        children: [],
        fragments: [{
          type: 'Effort',
          fragmentType: 'effort' as any,
          image: '10 Thrusters',
          value: { count: 10, exercise: 'Thrusters' }
        }],
        isLeaf: true,
        meta: {} as any
      },
      {
        id: 3,
        parent: 1,
        children: [],
        fragments: [{
          type: 'Effort',
          fragmentType: 'effort' as any,
          image: '10 Pullups',
          value: { count: 10, exercise: 'Pullups' }
        }],
        isLeaf: true,
        meta: {} as any
      }
    ],
    widgetIds: {}
  }} />
};
