import type { Preview, StoryFn } from "@storybook/react";
import '../src/darkModeInit.js'; // Initialize dark mode
import '../src/index.css'; // Import Tailwind CSS
import React from 'react';
import { SoundProvider } from '../src/contexts/SoundContext';
import { ScreenProvider } from '../src/contexts/ScreenContext';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#fdf6e3' }, // Solarized light
        { name: 'dark', value: '#002b36' },  // Solarized dark
        { name: 'paper', value: '#f5f1e4' }  // Journal paper color
      ],
    },
    darkMode: {
      current: 'light',
      darkClass: 'dark',
      lightClass: 'light',
      stylePreview: true,
    }
  },
  decorators: [
    (Story: StoryFn) => (
      <SoundProvider>
        <ScreenProvider>
          <div className="transition-colors duration-300">
            <Story />
          </div>
        </ScreenProvider>
      </SoundProvider>
    ),
  ],
};

export default preview;
