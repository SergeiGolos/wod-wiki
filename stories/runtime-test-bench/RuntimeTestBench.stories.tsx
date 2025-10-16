import type { Meta, StoryObj } from '@storybook/react';
import { RuntimeTestBench } from '../../src/runtime-test-bench/RuntimeTestBench';

const meta: Meta<typeof RuntimeTestBench> = {
  title: 'Runtime Test Bench/RuntimeTestBench',
  component: RuntimeTestBench,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Main Runtime Test Bench component integrating all 6 panels with cross-panel highlighting and keyboard shortcuts.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    initialCode: {
      control: 'text',
      description: 'Initial code to display in the editor'
    },
    onCodeChange: {
      action: 'codeChanged',
      description: 'Callback when code changes'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialCode: `(21-15-9)
  Thrusters 95lb
  Pullups`,
    onCodeChange: (code: string) => console.log('Code changed:', code)
  }
};

export const WithErrors: Story = {
  args: {
    initialCode: `// Script with syntax errors
(21-15-9)
  Thrusters 95lb
  invalid syntax here
  Pullups`,
    onCodeChange: (code: string) => console.log('Code changed:', code)
  }
};

export const Empty: Story = {
  args: {
    initialCode: '',
    onCodeChange: (code: string) => console.log('Code changed:', code)
  }
};

export const ComplexWorkout: Story = {
  args: {
    initialCode: `20:00 AMRAP
  + 5 Handstand Pushups
  + 10 Single-leg Squats
  + 15 Pullups`,
    onCodeChange: (code: string) => console.log('Code changed:', code)
  }
};

export const MobileViewport: Story = {
  args: {
    initialCode: `(15) :60 EMOM
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb`,
    onCodeChange: (code: string) => console.log('Code changed:', code)
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

export const TabletViewport: Story = {
  args: {
    initialCode: `For Time:
  100 Burpees
  75 Situps
  50 Pushups
  25 Handstand Pushups`,
    onCodeChange: (code: string) => console.log('Code changed:', code)
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};