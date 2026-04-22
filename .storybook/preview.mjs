import React from 'react';
import { StorybookHost } from '../stories/_shared/StorybookHost';
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
              'display',   ['Badge', 'Card', 'Label', 'MetricPill', 'Progress', 'ShortcutBadge', 'VisibilityBadge'],
              'interactive', ['Button', 'Dialog', 'DropdownMenu'],
              'layout',    ['Navbar'],
            ],
            'molecules',
            [
              'actions',    ['AudioToggle', 'ButtonGroup', 'ButtonGroupDropdown', 'CastButtonRpc'],
              'calendar',   ['CalendarButton', 'CalendarCard', 'CalendarSplitButton'],
              'chrome',     ['MacOSChrome'],
              'commands',   ['CommandInput', 'CommandItem', 'CommandPill'],
              'content',    ['CanvasProse'],
              'metrics',    ['MetricSourceRow', 'MetricTrackerCard', 'MetricVisualizer'],
              'navigation', ['PageNavDropdown', 'SidebarAccordion', 'StickyNavPanel', 'TextFilterStrip'],
              'overlays',   ['FocusedDialog'],
              'workout',    ['CommitGraph', 'GridHeaderCell', 'ResultListItem', 'StatementDisplay'],
            ],
            'organisms',
            ['CommandPalette', 'NavSidebar', 'RuntimeTimerPanel', 'MarkdownCanvasPage', 'SidebarLayout'],
            'templates',
            ['HomeHero', 'JournalDateScroll', 'CollectionWorkoutsList'],
            'pages',
          ],
          'acceptance',
        ],
      },
    },
  },

};

export default preview;