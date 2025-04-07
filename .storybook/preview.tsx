import type { Preview, StoryFn } from "@storybook/react";
import '../src/index.css'; // Import Tailwind CSS
import React from 'react';
import { SoundProvider } from '../src/core/contexts/SoundContext';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story: StoryFn) => (
      <SoundProvider>
        <Story />
      </SoundProvider>
    ),
  ],
};

export default preview;
