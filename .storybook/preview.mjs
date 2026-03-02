import React from 'react';
import { StorybookHost } from '../stories/StorybookHost';
import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story) => React.createElement(StorybookHost, null, React.createElement(Story, null)),
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
        order: [
          'Playground',
          'Overview',
          'Syntax',
          'Examples',
          [
            '*',
            [
              'Crossfit',
              [
                'Girls of Crossfit',
                'Crossfit Games',
                [
                  '2007', '2008', '2009', '2010', '2011', '2012',
                  '2013', '2014', '2015', '2016', '2017', '2018',
                  '2019', '2020', '2021', '2022', '2023', '2024',
                ],
              ],
            ],
          ],
          'Components',
        ],
      },
    },
  },
};

export default preview;