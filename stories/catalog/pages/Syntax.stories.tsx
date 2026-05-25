import type { Meta, StoryObj } from '@storybook/react'

import { syntaxGuideReference } from '../../../src/content/syntaxGuideReference'
import { StorybookWorkbench as Workbench } from '../../_shared/StorybookWorkbench'

const meta: Meta<typeof Workbench> = {
  title: 'catalog/pages/Syntax',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Guide-backed syntax examples that mirror the canonical `/guide/syntax*` pages.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof Workbench>

const WorkbenchTemplate: Story = {
  render: (args) => <Workbench {...args} />,
  args: {
    showToolbar: true,
    readonly: true,
    theme: 'wod-light',
    initialShowPlan: true,
    initialShowTrack: true,
    initialShowReview: true,
  },
  argTypes: {
    initialContent: { control: 'text' },
    theme: {
      control: 'select',
      options: ['wod-light', 'wod-dark'],
      description: 'Editor theme',
    },
    showToolbar: { control: 'boolean' },
    readonly: { control: 'boolean' },
  },
}

function guideStory(initialContent: string): Story {
  return {
    ...WorkbenchTemplate,
    args: {
      ...WorkbenchTemplate.args,
      initialContent,
    },
  }
}

export const CoreRules = guideStory(syntaxGuideReference.coreRules.storyContent)
export const Measurements = guideStory(syntaxGuideReference.measurements.storyContent)
export const TimerModifiers = guideStory(syntaxGuideReference.timerModifiers.storyContent)
export const SimpleRounds = guideStory(syntaxGuideReference.simpleRounds.storyContent)
export const RepSchemes = guideStory(syntaxGuideReference.repSchemes.storyContent)
export const TimersAndRest = guideStory(syntaxGuideReference.timersAndRest.storyContent)
export const ClassicAmrap = guideStory(syntaxGuideReference.classicAmrap.storyContent)
export const BasicEmom = guideStory(syntaxGuideReference.basicEmom.storyContent)
export const StandardTabata = guideStory(syntaxGuideReference.standardTabata.storyContent)
export const MixedSections = guideStory(syntaxGuideReference.mixedSections.storyContent)
export const ComplexNestedProtocols = guideStory(syntaxGuideReference.complexNestedProtocols.storyContent)

export const ClassicAmrapMobileViewport: Story = {
  ...ClassicAmrap,
  name: 'Classic AMRAP — mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}
