import React from 'react';
import { StorybookHost } from '../stories/catalog/_shared/StorybookHost';
import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  globalTypes: {
    theme: {
      description: 'Theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'system', icon: 'browser', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const initialEntries = context.parameters?.router?.initialEntries;
      const theme = context.globals.theme || 'light';
      return React.createElement(
        StorybookHost,
        { ...(initialEntries ? { initialEntries } : {}), theme },
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
          'catalog',
          [
            'atoms',
            [
              'primitives',
              [
                'Badge', 'Button', 'Card', 'Checkbox', 'Dialog', 'DropdownMenu',
                'Input', 'Label', 'Progress', 'Select', 'Switch', 'Table',
                'Textarea', 'Toast', 'Toaster',
              ],
            ],
            'molecules',
            [
              'ButtonGroup', 'ButtonLink', 'CalendarSplitButton',
              'NavSearchInput', 'ResultListItem',
            ],
            'organisms',
            ['FullscreenReview', 'FullscreenTimer', 'RuntimeTimerPanel'],
            'templates',
            [
              'CanvasPage', 'CollectionWorkoutsList', 'JournalDateScroll',
              'LandingTemplate', 'ReviewGrid',
              'SidebarLayout',
              'NoteEditor', ['Mobile', 'Web'],
              'Review',   ['Chromecast', 'Mobile', 'Web'],
              'WallClock',  ['Chromecast', 'Mobile', 'Web'],
            ],
            'pages',
            [
              'Collections', 'EffortDetailPage', 'EffortsCatalogPage',
              'HomeView', 'JournalPage', 'JournalWeeklyPage', 'Planner',
              'PlaygroundNotePage', 'ReviewPage', 'WallClockPage',
            ],
          ],
          'integration',
          [
            'Playground', ['Collections', 'Home', 'Journal', 'Review', 'WallClock'],
            'SpatialNavigation', ['AudioFeedback'],
          ],
          'acceptance',
          ['RuntimeCrossFit'],
          'testing',
          [
            'benchmarks',
            'syntax',
            'mobile',
            'ClockSyncValidation',
            'SpatialNavigationValidation',
          ],
        ],
      },
    },
  },

};

export default preview;