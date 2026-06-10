import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/atoms/primitives/button';
import { ButtonLink } from '@/components/molecules/ButtonLink';
import { ButtonGroup } from '@/components/molecules/ButtonGroup';
import { ButtonGroupDropdown } from '@/components/molecules/ButtonGroupDropdown';
import { ButtonListControl } from '@/components/molecules/ButtonListControl';
import { CalendarButton } from '@/components/molecules/CalendarButton';
import { WorkoutActionButton } from '@/components/molecules/WorkoutActionButton';
import { WhiteboardPlaygroundButton } from '@/components/atoms/WhiteboardPlaygroundButton';
import { WidgetEditButton } from '@/components/atoms/WidgetEditButton';
import { Play, Copy, ExternalLink, Calendar, Plus } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';

const meta: Meta = {
  title: 'design/Button Inventory',
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;

const Section = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <div className="mb-12 border rounded-lg p-6 bg-card text-card-foreground">
    <h2 className="text-2xl font-semibold mb-2">{title}</h2>
    <p className="text-muted-foreground mb-6">{description}</p>
    <div className="flex flex-wrap gap-4 items-center">
      {children}
    </div>
  </div>
);

export const Inventory: StoryObj = {
  render: () => {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Button Inventory</h1>
          <p className="text-lg text-muted-foreground">
            A comprehensive overview of all button types used across the application,
            demonstrating their visual states, typical use cases, and variations.
          </p>
        </div>

        <Section
          title="Primitive Button"
          description="The base `Button` component, utilizing class-variance-authority for standard styling. Used for standard singular actions."
        >
          <div className="flex flex-col gap-4">
             <div className="flex gap-4 items-center">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
             </div>
             <div className="flex gap-4 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Plus className="h-4 w-4" /></Button>
             </div>
          </div>
        </Section>

        <Section
          title="ButtonLink"
          description="A link styled as a button. Uses `react-router-dom`'s Link internally if `to` is provided, otherwise acts as a standard `<a>` tag."
        >
          <ButtonLink to="/example" icon={ExternalLink}>Router Link</ButtonLink>
          <ButtonLink href="https://example.com" variant="outline" trailingIcon={ExternalLink}>External Link</ButtonLink>
        </Section>

        <Section
          title="ButtonGroup"
          description="A pill-shaped button splitting a primary action and a secondary action. Often used for 'Run' or complex actions."
        >
           <ButtonGroup
             primary={{ id: '1', label: 'Start', icon: Play, action: { type: 'call', handler: () => {} } }}
             secondary={{ id: '2', label: 'Copy', icon: Copy, action: { type: 'call', handler: () => {} } }}
           />
           <ButtonGroup
             variant="primary"
             primary={{ id: '3', label: 'Run Workout', icon: Play, action: { type: 'call', handler: () => {} } }}
             secondary={{ id: '4', label: 'Fullscreen', icon: ExternalLink, action: { type: 'call', handler: () => {} } }}
           />
        </Section>

        <Section
          title="ButtonGroupDropdown"
          description="Similar to ButtonGroup, but the right side opens a dropdown menu containing multiple actions."
        >
           <ButtonGroupDropdown
             primary={{ id: '1', label: 'Actions', icon: Play, action: { type: 'call', handler: () => {} } }}
             actions={[
                { id: '2', label: 'Copy Link', icon: Copy, action: { type: 'call', handler: () => {} } },
                { id: '3', label: 'Open in new tab', icon: ExternalLink, action: { type: 'call', handler: () => {} } }
             ]}
           />
        </Section>

        <Section
          title="CalendarButton"
          description="A button displaying a selected date, clicking it opens a popover to select a different date."
        >
           <CalendarButton selectedDate={new Date()} onDateSelect={() => {}} />
        </Section>

        <Section
          title="WorkoutActionButton"
          description="A split button specifically designed for 'Create' or 'Clone' actions. The left side performs the action for today, the right side opens a calendar."
        >
           <WorkoutActionButton onAction={() => {}} mode="create" />
           <WorkoutActionButton onAction={() => {}} mode="clone" variant="default" />
        </Section>

        <Section
          title="ButtonListControl"
          description="A list box of styled buttons, used for selection menus. Acts like a rich radio group."
        >
           <ButtonListControl
             items={[
               { id: 'a', label: 'Option A', description: 'This is the first option', icon: Play, action: { type: 'call', handler: () => {} } },
               { id: 'b', label: 'Option B', badge: 'New', action: { type: 'call', handler: () => {} } }
             ]}
             defaultSelectedId="a"
           />
        </Section>

        <Section
          title="WhiteboardPlaygroundButton"
          description="A specialized pill button that opens workout content in the playground on the left, and copies the playground URL on the right."
        >
           <WhiteboardPlaygroundButton wodContent="4 RFT:\n400m Run\n15 Pull-ups" />
        </Section>

        <Section
          title="WidgetEditButton"
          description="A circular floating button used in widget editing contexts, transitions between edit/save/undo states."
        >
           <div className="relative h-16 w-32 bg-muted rounded">
              <WidgetEditButton mode="view" enterEditMode={() => {}} onSave={() => {}} onUndo={() => {}} />
           </div>
           <div className="relative h-16 w-32 bg-muted rounded">
              <WidgetEditButton mode="editing" enterEditMode={() => {}} onSave={() => {}} onUndo={() => {}} />
           </div>
        </Section>

      </div>
    );
  }
};
