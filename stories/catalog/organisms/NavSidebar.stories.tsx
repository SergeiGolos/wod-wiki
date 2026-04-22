/**
 * Catalog / Organisms / NavSidebar
 *
 * NavSidebar — the primary navigation sidebar for the playground app.
 * Renders the app logo, L1 nav items (Home, Journal, Collections, Search),
 * and a context-sensitive L2 panel (children list or custom panel component).
 *
 * Requires: NavProvider (provides tree + navState), MemoryRouter (useLocation),
 * and useNavigate. The global StorybookHost decorator provides MemoryRouter.
 * NavProvider is added per-story via a decorator so we can control the nav tree.
 *
 * These stories demonstrate:
 *   - Default nav tree with all L1 items
 *   - Active route highlighted
 *   - L2 accordion expansion (nested children)
 *   - Collapsed state (icon-only — future enhancement placeholder)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  HomeIcon,
  BookOpenIcon,
  FolderIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';

import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import type { NavItem } from '../../../playground/src/nav/navTypes';

// ─── Demo nav tree ────────────────────────────────────────────────────────────

const demoTree: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    level: 1,
    icon: HomeIcon,
    action: { type: 'route', to: '/' },
    children: [
      {
        id: 'getting-started',
        label: 'Getting Started',
        level: 2,
        action: { type: 'route', to: '/getting-started' },
        children: [
          { id: 'intro',  label: 'Introduction',   level: 2, action: { type: 'route', to: '/getting-started/intro' } },
          { id: 'timers', label: 'Timer Syntax',    level: 2, action: { type: 'route', to: '/getting-started/timers' } },
          { id: 'reps',   label: 'Rep Schemes',     level: 2, action: { type: 'route', to: '/getting-started/reps' } },
        ],
      },
      {
        id: 'reference',
        label: 'Reference',
        level: 2,
        action: { type: 'route', to: '/reference' },
        children: [
          { id: 'fragments', label: 'Fragments',  level: 2, action: { type: 'route', to: '/reference/fragments' } },
          { id: 'operators', label: 'Operators',  level: 2, action: { type: 'route', to: '/reference/operators' } },
        ],
      },
    ],
  },
  {
    id: 'journal',
    label: 'Journal',
    level: 1,
    icon: BookOpenIcon,
    action: { type: 'route', to: '/journal' },
  },
  {
    id: 'collections',
    label: 'Collections',
    level: 1,
    icon: FolderIcon,
    action: { type: 'route', to: '/collections' },
  },
  {
    id: 'search',
    label: 'Search',
    level: 1,
    icon: MagnifyingGlassIcon,
    action: { type: 'route', to: '/search' },
  },
];

// ─── Decorator factory ────────────────────────────────────────────────────────

function withNav(tree: NavItem[] = demoTree) {
  return (Story: React.ComponentType) => (
    <NavProvider tree={tree}>
      <Story />
    </NavProvider>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof NavSidebar> = {
  title: 'catalog/organisms/NavSidebar',
  component: NavSidebar,
  parameters: {
    layout: 'padded',
    router: { initialEntries: ['/'] },
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-border overflow-y-auto">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default (Home active)',
  parameters: { router: { initialEntries: ['/'] } },
  decorators: [withNav()],
  render: () => <NavSidebar />,
};

export const JournalActive: Story = {
  name: 'Journal Active',
  parameters: { router: { initialEntries: ['/journal'] } },
  decorators: [withNav()],
  render: () => <NavSidebar />,
};

export const CollectionsActive: Story = {
  name: 'Collections Active',
  parameters: { router: { initialEntries: ['/collections'] } },
  decorators: [withNav()],
  render: () => <NavSidebar />,
};

export const HomeWithChildren: Story = {
  name: 'Home — With L2 Children',
  parameters: { router: { initialEntries: ['/getting-started/timers'] } },
  decorators: [withNav()],
  render: () => <NavSidebar />,
};

export const SearchActive: Story = {
  name: 'Search Active',
  parameters: { router: { initialEntries: ['/search'] } },
  decorators: [withNav()],
  render: () => <NavSidebar />,
};

export const MinimalTree: Story = {
  name: 'Minimal Tree (2 items)',
  parameters: { router: { initialEntries: ['/'] } },
  decorators: [
    withNav([
      {
        id: 'home',
        label: 'Home',
        level: 1,
        icon: HomeIcon,
        action: { type: 'route', to: '/' },
      },
      {
        id: 'journal',
        label: 'Journal',
        level: 1,
        icon: BookOpenIcon,
        action: { type: 'route', to: '/journal' },
      },
    ]),
  ],
  render: () => <NavSidebar />,
};
