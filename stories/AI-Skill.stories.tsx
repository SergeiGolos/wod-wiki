import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AISkillPage } from './AI-SkillPage';

const meta: Meta<typeof AISkillPage> = {
  title: 'Syntax/! AI Skill',
  component: AISkillPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Detailed documentation for the WOD Extraction skill used by LLMs to convert natural language workouts to WOD Wiki syntax.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
