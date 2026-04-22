/**
 * Catalog / Atoms / Navbar + Sidebar
 *
 * Horizontal Navbar and vertical Sidebar are the two layout atoms that compose
 * the app shell. Both live in src/components/playground/ and follow the Catalyst
 * Headless UI pattern.
 *
 * Navbar sub-components: NavbarSection, NavbarItem, NavbarSpacer, NavbarDivider, NavbarLabel
 * Sidebar sub-components: SidebarHeader, SidebarBody, SidebarFooter, SidebarSection,
 *   SidebarItem, SidebarLabel, SidebarHeading, SidebarDivider, SidebarSpacer
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  HomeIcon,
  BookOpenIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/20/solid';

import {
  Navbar,
  NavbarDivider,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from '@/components/playground/navbar';

import {
  Sidebar,
  SidebarBody,
  SidebarDivider,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/playground/sidebar';

// Sentinel for meta
function NavbarAtoms() { return <div />; }

const meta: Meta<typeof NavbarAtoms> = {
  title: 'catalog/atoms/Navbar',
  component: NavbarAtoms,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Navbar stories ────────────────────────────────────────────────────────────

export const NavbarDefault: Story = {
  name: 'Navbar — Default',
  render: () => (
    <div className="bg-white dark:bg-zinc-900 border-b border-border px-4 flex items-center">
      <Navbar>
        <NavbarSection>
          <NavbarItem href="/">
            <HomeIcon data-slot="icon" />
            <NavbarLabel>Home</NavbarLabel>
          </NavbarItem>
          <NavbarItem href="/journal">
            <BookOpenIcon data-slot="icon" />
            <NavbarLabel>Journal</NavbarLabel>
          </NavbarItem>
          <NavbarItem href="/collections" current>
            <FolderIcon data-slot="icon" />
            <NavbarLabel>Collections</NavbarLabel>
          </NavbarItem>
        </NavbarSection>
        <NavbarSpacer />
        <NavbarSection>
          <NavbarItem href="/search" aria-label="Search">
            <MagnifyingGlassIcon data-slot="icon" />
          </NavbarItem>
          <NavbarDivider />
          <NavbarItem href="/notifications" aria-label="Notifications">
            <BellIcon data-slot="icon" />
          </NavbarItem>
        </NavbarSection>
      </Navbar>
    </div>
  ),
};

export const NavbarWithCurrentIndicator: Story = {
  name: 'Navbar — Current Indicator (motion)',
  render: () => (
    <div className="bg-white dark:bg-zinc-900 border-b border-border px-4 flex items-center">
      <Navbar>
        <NavbarSection>
          <NavbarItem href="/">
            <NavbarLabel>Home</NavbarLabel>
          </NavbarItem>
          <NavbarItem href="/journal" current>
            <NavbarLabel>Journal</NavbarLabel>
          </NavbarItem>
          <NavbarItem href="/collections">
            <NavbarLabel>Collections</NavbarLabel>
          </NavbarItem>
          <NavbarItem href="/syntax">
            <NavbarLabel>Syntax</NavbarLabel>
          </NavbarItem>
        </NavbarSection>
        <NavbarSpacer />
        <NavbarSection>
          <NavbarItem href="/settings" aria-label="Settings">
            <Cog6ToothIcon data-slot="icon" />
          </NavbarItem>
        </NavbarSection>
      </Navbar>
    </div>
  ),
};

// ─── Sidebar stories ───────────────────────────────────────────────────────────

export const SidebarDefault: Story = {
  name: 'Sidebar — Default',
  render: () => (
    <div className="h-[600px] w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-border flex flex-col">
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-3 text-sm font-black uppercase tracking-wider text-foreground">
            Wod Wiki
          </div>
        </SidebarHeader>
        <SidebarBody>
          <SidebarSection>
            <SidebarItem href="/" current>
              <HomeIcon data-slot="icon" />
              <SidebarLabel>Home</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/journal">
              <BookOpenIcon data-slot="icon" />
              <SidebarLabel>Journal</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/collections">
              <FolderIcon data-slot="icon" />
              <SidebarLabel>Collections</SidebarLabel>
            </SidebarItem>
          </SidebarSection>

          <SidebarDivider />

          <SidebarSection>
            <SidebarHeading>Tools</SidebarHeading>
            <SidebarItem href="/search">
              <MagnifyingGlassIcon data-slot="icon" />
              <SidebarLabel>Search</SidebarLabel>
            </SidebarItem>
          </SidebarSection>

          <SidebarSpacer />
        </SidebarBody>
        <SidebarFooter>
          <SidebarItem href="/settings">
            <Cog6ToothIcon data-slot="icon" />
            <SidebarLabel>Settings</SidebarLabel>
          </SidebarItem>
        </SidebarFooter>
      </Sidebar>
    </div>
  ),
};

export const SidebarWithMultipleSections: Story = {
  name: 'Sidebar — Multiple Sections',
  render: () => (
    <div className="h-[600px] w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-border">
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-3 text-sm font-black uppercase tracking-wider text-foreground">
            Wod Wiki
          </div>
          <SidebarSection>
            <SidebarItem href="/">
              <HomeIcon data-slot="icon" />
              <SidebarLabel>Home</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/journal" current>
              <BookOpenIcon data-slot="icon" />
              <SidebarLabel>Journal</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/collections">
              <FolderIcon data-slot="icon" />
              <SidebarLabel>Collections</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        </SidebarHeader>
        <SidebarBody>
          <SidebarSection>
            <SidebarHeading>Recent</SidebarHeading>
            <SidebarItem href="/journal/2026-04-20">
              <SidebarLabel>April 20, 2026</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/journal/2026-04-19">
              <SidebarLabel>April 19, 2026</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/journal/2026-04-18">
              <SidebarLabel>April 18, 2026</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
          <SidebarDivider />
          <SidebarSection>
            <SidebarHeading>Tags</SidebarHeading>
            <SidebarItem href="/tags/strength">
              <SidebarLabel>Strength</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/tags/cardio">
              <SidebarLabel>Cardio</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        </SidebarBody>
      </Sidebar>
    </div>
  ),
};
