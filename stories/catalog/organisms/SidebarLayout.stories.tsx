/**
 * Catalog / Organisms / SidebarLayout
 *
 * SidebarLayout — the primary app shell. Wraps every page in the playground.
 * On desktop (lg+): persistent sidebar on the left + main content area.
 * On mobile: sticky header with hamburger + slide-out drawer sidebar.
 *
 * Props: sidebar (ReactNode), navbar (ReactNode), children (ReactNode)
 *
 * Note: SidebarLayout uses useLocation from react-router-dom.
 * The global StorybookHost decorator provides MemoryRouter, so no extra
 * router setup is needed here.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HomeIcon, BookOpenIcon, FolderIcon, MagnifyingGlassIcon, Cog6ToothIcon, BellIcon } from '@heroicons/react/20/solid';
import { Dumbbell } from 'lucide-react';

import { SidebarLayout } from '@/components/playground/sidebar-layout';
import {
  Navbar,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from '@/components/playground/navbar';
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/playground/sidebar';
import { AudioToggle } from '@/components/audio/AudioToggle';

// ─── Shared slot components ───────────────────────────────────────────────────

function DemoSidebar({ activeRoute = '/' }: { activeRoute?: string }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center px-2 py-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md rotate-3">
            <Dumbbell size={18} />
          </div>
          <span className="ml-3 text-lg font-black tracking-tighter text-foreground uppercase">
            Wod Wiki
          </span>
        </div>
        <SidebarSection>
          <SidebarItem href="/" current={activeRoute === '/'}>
            <HomeIcon data-slot="icon" />
            <SidebarLabel className="font-semibold">Home</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/journal" current={activeRoute === '/journal'}>
            <BookOpenIcon data-slot="icon" />
            <SidebarLabel className="font-semibold">Journal</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/collections" current={activeRoute === '/collections'}>
            <FolderIcon data-slot="icon" />
            <SidebarLabel className="font-semibold">Collections</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/search" current={activeRoute === '/search'}>
            <MagnifyingGlassIcon data-slot="icon" />
            <SidebarLabel className="font-semibold">Search</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarHeader>
      <SidebarBody />
      <SidebarFooter>
        <SidebarItem href="/settings">
          <Cog6ToothIcon data-slot="icon" />
          <SidebarLabel>Settings</SidebarLabel>
        </SidebarItem>
      </SidebarFooter>
    </Sidebar>
  );
}

function DemoNavbar() {
  return (
    <Navbar>
      <NavbarSection>
        <NavbarItem href="/">
          <NavbarLabel>Home</NavbarLabel>
        </NavbarItem>
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection>
        <AudioToggle />
        <NavbarItem href="/notifications" aria-label="Notifications">
          <BellIcon data-slot="icon" />
        </NavbarItem>
      </NavbarSection>
    </Navbar>
  );
}

function ContentPlaceholder({ title }: { title: string }) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground">
        This is the main content area. On desktop the sidebar is always visible on the left.
        On mobile, tap the hamburger icon (top-left) to open the sidebar drawer.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-2 w-full rounded bg-muted animate-pulse opacity-60" />
            <div className="h-2 w-3/4 rounded bg-muted animate-pulse opacity-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof SidebarLayout> = {
  title: 'catalog/organisms/SidebarLayout',
  component: SidebarLayout,
  parameters: {
    layout: 'fullscreen',
    // Use a route so SidebarLayout's useLocation doesn't see undefined
    router: { initialEntries: ['/'] },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — Desktop Shell',
  render: () => (
    <div className="h-screen">
      <SidebarLayout
        sidebar={<DemoSidebar activeRoute="/" />}
        navbar={<DemoNavbar />}
      >
        <ContentPlaceholder title="Home" />
      </SidebarLayout>
    </div>
  ),
};

export const JournalRoute: Story = {
  name: 'Journal Route',
  parameters: { router: { initialEntries: ['/journal'] } },
  render: () => (
    <div className="h-screen">
      <SidebarLayout
        sidebar={<DemoSidebar activeRoute="/journal" />}
        navbar={<DemoNavbar />}
      >
        <ContentPlaceholder title="Journal" />
      </SidebarLayout>
    </div>
  ),
};

export const CollectionsRoute: Story = {
  name: 'Collections Route',
  parameters: { router: { initialEntries: ['/collections'] } },
  render: () => (
    <div className="h-screen">
      <SidebarLayout
        sidebar={<DemoSidebar activeRoute="/collections" />}
        navbar={<DemoNavbar />}
      >
        <ContentPlaceholder title="Collections" />
      </SidebarLayout>
    </div>
  ),
};

export const MobileViewport: Story = {
  name: 'Mobile (375 × 812)',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    router: { initialEntries: ['/'] },
  },
  render: () => (
    <div className="h-screen">
      <SidebarLayout
        sidebar={<DemoSidebar activeRoute="/" />}
        navbar={<DemoNavbar />}
      >
        <ContentPlaceholder title="Home (Mobile)" />
      </SidebarLayout>
    </div>
  ),
};

export const WithRichContent: Story = {
  name: 'With Rich Content Area',
  render: () => (
    <div className="h-screen">
      <SidebarLayout
        sidebar={<DemoSidebar activeRoute="/" />}
        navbar={<DemoNavbar />}
      >
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Home</h1>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              SidebarLayout renders a persistent sidebar on desktop and a collapsible
              drawer on mobile. The sidebar and navbar slots accept any React subtree —
              typically NavSidebar and Navbar components with live nav items.
            </p>
          </div>
          <div className="border border-border rounded-xl p-4 bg-muted/30">
            <p className="text-xs font-mono text-muted-foreground">
              children — grows to fill the remaining content area
            </p>
          </div>
        </div>
      </SidebarLayout>
    </div>
  ),
};
