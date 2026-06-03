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
            'Primitives',
            'atoms',
            [
              'display',    ['BuyMeACoffee', 'MetricPill', 'Progress', 'ShortcutBadge', 'VisibilityBadge'],
              'layout',     ['ScrollSection'],
            ],
            'molecules',
            [
              'actions',    ['AudioToggle', 'ButtonGroup', 'ButtonGroupDropdown', 'ButtonLink', 'CastButtonRpc'],
              'calendar',   ['CalendarButton', 'CalendarCard', 'CalendarSplitButton'],
              'chrome',     ['MacOSChrome'],
              'commands',   ['CommandInput', 'CommandItem', 'CommandPill'],
              'content',    ['ButtonListControl', 'CanvasProse'],
              'data',       ['LinkChip'],
              'efforts',    ['EffortCard'],
              'layout',     ['HeroBanner', 'Navbar'],
              'metrics',    ['MetricSourceRow', 'MetricTrackerCard', 'MetricVisualizer'],
              'navigation', ['NavSearchInput', 'PageNavDropdown', 'SidebarAccordion', 'StickyNavPanel', 'TextFilterStrip'],
              'overlays',   ['FocusedDialog'],
              'workout',    ['GridHeaderCell', 'ResultListItem', 'StatementDisplay', 'StatementList', 'WorkoutActionButton'],
            ],
            'organisms',
            [
              'CommandPalette', 'CommitGraph', 'FullscreenReview', 'FullscreenTimer',
              'HeroSlider', 'ListView', 'MarkdownCanvasPage', 'NavSidebar',
              'ParallaxSection', 'RuntimeTimerPanel', 'SidebarLayout', 'TimerStackView',
              'workout', ['WorkoutContextPanel'],
            ],
            'templates',
            [
              'CanvasPage', 'CollectionWorkoutsList', 'HomeHero', 'JournalDateScroll',
              'LandingTemplate', 'ResultsView', 'ReviewGrid', 'SidebarLayout',
              'WorkbenchTemplate',
              'layout',    ['TrackViewShell'],
              'NoteEditor', ['Mobile', 'Web'],
              'Preview',   ['Chromecast'],
              'Review',    ['Chromecast', 'Mobile', 'Web'],
              'Tracker',   ['Chromecast', 'Mobile', 'Web'],
            ],
            'pages',
            [
              'Calendar', 'Collections', 'EffortDetailPage', 'EffortsCatalogPage',
              'HomeView', 'JournalPage', 'JournalPageShell', 'JournalWeeklyPage',
              'Planner', 'PlaygroundNotePage', 'ReviewPage', 'Syntax',
              'TrackerPage', 'WorkoutEditorPage',
            ],
          ],
          'integration',
          [
            'Playground', ['Collections', 'Home', 'Journal', 'Review', 'Tracker'],
            'SpatialNavigation', ['AudioFeedback'],
          ],
          'acceptance',
          ['RuntimeCrossFit'],
          'testing',
          ['ClockSyncValidation', 'SpatialNavigationValidation'],
        ],
      },
    },
  },

};

export default preview;