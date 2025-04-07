import type { Preview, StoryFn } from "@storybook/react";
import '../src/index.css'; // Import Tailwind CSS
import React from 'react';
import { SoundProvider } from '../src/core/contexts/SoundContext';
import { ScreenProvider } from '../src/core/contexts/ScreenContext';

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
        <ScreenProvider>
          <Story />
        </ScreenProvider>
      </SoundProvider>
    ),
  ],
};

export default preview;
