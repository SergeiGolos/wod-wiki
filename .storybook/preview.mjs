import React from 'react';
import { HashRouter } from 'react-router-dom';
import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story) => React.createElement(HashRouter, null, React.createElement(Story, null)),
  ],
  tags: ['!autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    },
    options: {
      storySort: {
        order: ['Playground', 'Overview', 'Syntax', 'Examples', 'Components'],
      },
    },
  },
};

export default preview;