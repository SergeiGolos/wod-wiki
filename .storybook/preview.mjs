import React from 'react';
import { StorybookHost } from '../stories/StorybookHost';
import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story, context) => {
      const initialEntries = context.parameters?.router?.initialEntries;
      return React.createElement(
        StorybookHost,
        initialEntries ? { initialEntries } : null,
        React.createElement(Story, null)
      );
    },
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
    layout: 'fullscreen',
    options: {
      storySort: {
        order: [
          'Syntax',
          ['Pages', ['ScriptedTutorial', 'Collections', 'Calendar', 'Planner', 'Note']],
          'Panels',
          'Components',
        ],
      },
    },
  },

};

export default preview;