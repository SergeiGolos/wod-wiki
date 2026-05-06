/**
 * Catalog / Molecules / SidebarAccordion
 *
 * SidebarAccordion — collapsible section group used inside NavSidebar for L2
 * navigation items (e.g., Syntax sub-pages, collection groups).
 *
 * Built on Headless UI Disclosure. Animates the chevron on open/close.
 * Accepts: title, defaultOpen, count (badge), children (SidebarItem list).
 */

import type { Meta, StoryObj } from '@storybook/react';
import { DocumentTextIcon, BoltIcon, CubeIcon } from '@heroicons/react/20/solid';

import { SidebarAccordion } from '@/components/playground/SidebarAccordion';
import { SidebarItem, SidebarLabel, SidebarSection } from '@/components/playground/sidebar';

const meta: Meta<typeof SidebarAccordion> = {
  title: 'catalog/molecules/navigation/SidebarAccordion',
  component: SidebarAccordion,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-56 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 space-y-1">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  name: 'Collapsed (default)',
  render: () => (
    <SidebarAccordion title="Syntax" defaultOpen={false}>
      <SidebarSection>
        <SidebarItem href="/syntax/protocols">
          <DocumentTextIcon data-slot="icon" />
          <SidebarLabel>Protocols</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/syntax/structure">
          <BoltIcon data-slot="icon" />
          <SidebarLabel>Structure</SidebarLabel>
        </SidebarItem>
      </SidebarSection>
    </SidebarAccordion>
  ),
};

export const Expanded: Story = {
  name: 'Expanded (defaultOpen)',
  render: () => (
    <SidebarAccordion title="Syntax" defaultOpen>
      <SidebarSection>
        <SidebarItem href="/syntax/protocols">
          <DocumentTextIcon data-slot="icon" />
          <SidebarLabel>Protocols</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/syntax/structure">
          <BoltIcon data-slot="icon" />
          <SidebarLabel>Structure</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/syntax/basics">
          <CubeIcon data-slot="icon" />
          <SidebarLabel>Basics</SidebarLabel>
        </SidebarItem>
      </SidebarSection>
    </SidebarAccordion>
  ),
};

export const WithCountBadge: Story = {
  name: 'With Count Badge',
  render: () => (
    <SidebarAccordion title="Collections" count={12} defaultOpen>
      <SidebarSection>
        <SidebarItem href="/collections/hero">
          <SidebarLabel>Hero WODs</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/collections/benchmark" current>
          <SidebarLabel>Benchmark Girls</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/collections/strength">
          <SidebarLabel>Strength Programs</SidebarLabel>
        </SidebarItem>
      </SidebarSection>
    </SidebarAccordion>
  ),
};

export const ActiveChildItem: Story = {
  name: 'Active Child Highlighted',
  render: () => (
    <SidebarAccordion title="Getting Started" count={3} defaultOpen>
      <SidebarSection>
        <SidebarItem href="/getting-started/intro">
          <SidebarLabel>Introduction</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/getting-started/timers" current>
          <SidebarLabel>Timer Syntax</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="/getting-started/reps">
          <SidebarLabel>Rep Schemes</SidebarLabel>
        </SidebarItem>
      </SidebarSection>
    </SidebarAccordion>
  ),
};

export const MultipleAccordions: Story = {
  name: 'Multiple Accordions',
  render: () => (
    <div className="space-y-1">
      <SidebarAccordion title="Getting Started" count={3} defaultOpen>
        <SidebarSection>
          <SidebarItem href="/getting-started/intro">
            <SidebarLabel>Introduction</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/getting-started/timers" current>
            <SidebarLabel>Timer Syntax</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarAccordion>
      <SidebarAccordion title="Reference" count={5}>
        <SidebarSection>
          <SidebarItem href="/reference/fragments">
            <SidebarLabel>Fragments</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/reference/operators">
            <SidebarLabel>Operators</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarAccordion>
      <SidebarAccordion title="Collections" count={12}>
        <SidebarSection>
          <SidebarItem href="/collections/hero">
            <SidebarLabel>Hero WODs</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarAccordion>
    </div>
  ),
};
