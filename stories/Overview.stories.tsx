import { WodWorkbench } from '@/components/layout/WodWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof WodWorkbench> = {
  title: 'Overview',
  component: WodWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Overview of the WOD Wiki editor capabilities with complex markdown content.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# Workout Journal - Week 47

## Goals for this week
- [ ] 3 strength sessions
- [ ] 2 conditioning sessions
- [x] Mobility work daily

## Monday - 11/13/2024

**Weather:** Sunny, 72°F  
**Energy Level:** 8/10  
**Sleep:** 7 hours

### Main Workout
\`\`\`wod
(15) :60 EMOM
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb
\`\`\`

#### Notes
- Felt great today
- Form was solid on all lifts
- Need to work on breathing during EMOM

### Accessories
1. Bicep curls 3x10
2. Tricep extensions 3x10
3. Core work - planks

---

## Resources
- [Workout programming guide](https://example.com)
- Check out **CrossFit** workouts`,
    showToolbar: true,
    readonly: false,
    theme: 'vs'
  }
};
