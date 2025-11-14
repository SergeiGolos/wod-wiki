import type { Meta, StoryObj } from '@storybook/react';
import { ContextPanel } from '../../src/markdown-editor/components/ContextPanel';
import { WodBlock } from '../../src/markdown-editor/types';
import { ICodeStatement } from '../../src/CodeStatement';
import { ICodeFragment } from '../../src/CodeFragment';

const meta: Meta<typeof ContextPanel> = {
  title: 'Markdown Editor/ContextPanel',
  component: ContextPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Context panel showing parsed WOD block with inline editing capabilities.'
      }
    }
  },
  argTypes: {
    block: {
      description: 'WOD block data to display'
    },
    compact: {
      control: 'boolean',
      description: 'Whether panel is in compact mode'
    },
    showEditor: {
      control: 'boolean',
      description: 'Whether to show inline editor'
    },
    onAddStatement: {
      action: 'addStatement',
      description: 'Callback when adding a statement'
    },
    onEditStatement: {
      action: 'editStatement',
      description: 'Callback when editing a statement'
    },
    onDeleteStatement: {
      action: 'deleteStatement',
      description: 'Callback when deleting a statement'
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

const roundsFragment: ICodeFragment = {
  type: 'Rounds',
  fragmentType: 'rounds' as any,
  image: '(3)',
  value: { count: 3 }
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

const roundsStatement: ICodeStatement = {
  id: 5,
  children: [[6]],
  fragments: [roundsFragment],
  isLeaf: false,
  meta: {} as any
};

const roundsChildStatement: ICodeStatement = {
  id: 6,
  parent: 5,
  children: [],
  fragments: [effortFragment1],
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

const sampleBlockWithRounds: WodBlock = {
  id: 'wod-2',
  startLine: 5,
  endLine: 8,
  content: `(3)
  + 5 Pullups`,
  state: 'parsed',
  statements: [roundsStatement, roundsChildStatement],
  widgetIds: {}
};

const emptyBlock: WodBlock = {
  id: 'wod-empty',
  startLine: 5,
  endLine: 6,
  content: '',
  state: 'idle',
  widgetIds: {}
};

const errorBlock: WodBlock = {
  id: 'wod-error',
  startLine: 5,
  endLine: 6,
  content: '20:00 AMRAP',
  state: 'error',
  errors: [
    {
      line: 5,
      column: 1,
      message: 'Unexpected token at line 5',
      severity: 'error'
    }
  ],
  widgetIds: {}
};

export const Default: Story = {
  args: {
    block: sampleBlock,
    compact: false,
    showEditor: true
  }
};

export const WithRoundsAndIndentation: Story = {
  args: {
    block: sampleBlockWithRounds,
    compact: false,
    showEditor: true
  }
};

export const CompactMode: Story = {
  args: {
    block: sampleBlock,
    compact: true,
    showEditor: true
  }
};

export const WithoutEditor: Story = {
  args: {
    block: sampleBlock,
    compact: false,
    showEditor: false
  }
};

export const EmptyState: Story = {
  args: {
    block: emptyBlock,
    compact: false,
    showEditor: true
  }
};

export const WithErrors: Story = {
  args: {
    block: errorBlock,
    compact: false,
    showEditor: true
  }
};

export const ParsingState: Story = {
  args: {
    block: {
      ...sampleBlock,
      state: 'parsing'
    },
    compact: false,
    showEditor: true
  }
};
