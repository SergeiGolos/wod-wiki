/**
 * Catalog / Atoms / Primitives
 *
 * Index story for all Catalyst / Headless UI design-system primitives available
 * in `src/components/playground/`. These are foundational building blocks used
 * throughout the playground app. Each section shows the primitive with a one-line
 * description and basic variant preview.
 *
 * Primitives that require complex provider setup (Alert, Dialog, Dropdown,
 * Combobox, Listbox, AuthLayout, StackedLayout) are documented with usage notes
 * rather than live demos.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '@/components/playground/avatar';
import { Badge } from '@/components/playground/badge';
import { Button } from '@/components/playground/button';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/playground/checkbox';
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/playground/description-list';
import { Divider } from '@/components/playground/divider';
import { Field, Fieldset, Label, FieldGroup, Legend } from '@/components/playground/fieldset';
import { Heading, Subheading } from '@/components/playground/heading';
import { Input } from '@/components/playground/input';
import { Link } from '@/components/playground/link';
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '@/components/playground/pagination';
import { Radio, RadioField, RadioGroup } from '@/components/playground/radio';
import { Select } from '@/components/playground/select';
import { Switch, SwitchField } from '@/components/playground/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/playground/table';
import { Text, TextLink } from '@/components/playground/text';
import { Textarea } from '@/components/playground/textarea';

// Sentinel component — the meta target. The actual stories use custom renders.
function PrimitivesIndex() {
  return <div />;
}

const meta: Meta<typeof PrimitivesIndex> = {
  title: 'catalog/atoms/primitives/Primitives',
  component: PrimitivesIndex,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-10 max-w-3xl dark:bg-zinc-900 dark:text-white min-h-screen">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Section helper ────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <Heading level={3} className="text-base font-semibold">{title}</Heading>
        <Text className="text-xs mt-0.5">{description}</Text>
      </div>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </section>
  );
}

// ─── Typography ────────────────────────────────────────────────────────────────

export const Typography: Story = {
  name: 'Typography',
  render: () => (
    <div className="space-y-6">
      <section className="space-y-2">
        <Subheading>Heading levels</Subheading>
        <Text className="text-xs">src/components/playground/heading.tsx — semantic headings with consistent Zinc/white styling.</Text>
        <div className="space-y-1">
          <Heading level={1}>Heading 1</Heading>
          <Heading level={2}>Heading 2</Heading>
          <Heading level={3}>Heading 3</Heading>
          <Subheading>Subheading (default h2, smaller weight)</Subheading>
        </div>
      </section>

      <Divider soft />

      <section className="space-y-2">
        <Subheading>Text + TextLink</Subheading>
        <Text className="text-xs">src/components/playground/text.tsx — body copy with muted Zinc styling.</Text>
        <Text>Regular body text using the Text component. Designed for prose-length content inside cards and panels.</Text>
        <Text>
          Use <TextLink href="#">TextLink</TextLink> for inline anchor elements that inherit the surrounding text style.
        </Text>
      </section>
    </div>
  ),
};

// ─── Avatar ────────────────────────────────────────────────────────────────────

export const Avatars: Story = {
  name: 'Avatar',
  render: () => (
    <Section
      title="Avatar"
      description="src/components/playground/avatar.tsx — user avatar with image or initials fallback. Supports round and square variants."
    >
      <Avatar initials="AB" className="size-10 bg-zinc-200 dark:bg-zinc-700" />
      <Avatar initials="WW" className="size-10 bg-blue-500 text-white" />
      <Avatar square initials="JD" className="size-10 bg-green-500 text-white" />
      <Avatar
        src="https://api.dicebear.com/7.x/thumbs/svg?seed=wod"
        className="size-10"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/thumbs/svg?seed=wod"
        square
        className="size-10"
      />
    </Section>
  ),
};

// ─── Badge ─────────────────────────────────────────────────────────────────────

export const Badges: Story = {
  name: 'Badge',
  render: () => (
    <Section
      title="Badge"
      description="src/components/playground/badge.tsx — colored status/category badge with 12 color variants."
    >
      <Badge color="zinc">zinc</Badge>
      <Badge color="red">red</Badge>
      <Badge color="orange">orange</Badge>
      <Badge color="amber">amber</Badge>
      <Badge color="yellow">yellow</Badge>
      <Badge color="lime">lime</Badge>
      <Badge color="green">green</Badge>
      <Badge color="emerald">emerald</Badge>
      <Badge color="teal">teal</Badge>
      <Badge color="cyan">cyan</Badge>
      <Badge color="sky">sky</Badge>
      <Badge color="blue">blue</Badge>
      <Badge color="indigo">indigo</Badge>
      <Badge color="violet">violet</Badge>
      <Badge color="purple">purple</Badge>
      <Badge color="fuchsia">fuchsia</Badge>
      <Badge color="pink">pink</Badge>
      <Badge color="rose">rose</Badge>
    </Section>
  ),
};

// ─── Button ────────────────────────────────────────────────────────────────────

export const Buttons: Story = {
  name: 'Button (Catalyst)',
  render: () => (
    <Section
      title="Button (Catalyst)"
      description="src/components/playground/button.tsx — Catalyst-styled button. Distinct from the shadcn Button in src/components/ui/button.tsx."
    >
      <Button>Default</Button>
      <Button outline>Outline</Button>
      <Button plain>Plain</Button>
      <Button disabled>Disabled</Button>
      <Button color="dark">Dark</Button>
      <Button color="light">Light</Button>
    </Section>
  ),
};

// ─── Divider ───────────────────────────────────────────────────────────────────

export const Dividers: Story = {
  name: 'Divider',
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Text className="text-xs">src/components/playground/divider.tsx — horizontal rule with hard and soft variants.</Text>
      <Divider />
      <Text className="text-xs text-muted-foreground">Hard divider (default)</Text>
      <Divider soft />
      <Text className="text-xs text-muted-foreground">Soft divider (reduced opacity)</Text>
    </div>
  ),
};

// ─── Link ──────────────────────────────────────────────────────────────────────

export const Links: Story = {
  name: 'Link',
  render: () => (
    <Section
      title="Link"
      description="src/components/playground/link.tsx — styled anchor using React Router <Link> with Headless UI data-hover/active states."
    >
      <Link href="#">Internal link</Link>
      <Link href="https://example.com">External link</Link>
    </Section>
  ),
};

// ─── Form: Input ───────────────────────────────────────────────────────────────

export const Inputs: Story = {
  name: 'Input',
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Text className="text-xs">src/components/playground/input.tsx — Headless UI-based text input with Zinc border styling.</Text>
      <Field>
        <Label>Username</Label>
        <Input name="username" placeholder="Enter username" />
      </Field>
      <Field>
        <Label>Disabled field</Label>
        <Input name="disabled" placeholder="Disabled" disabled />
      </Field>
    </div>
  ),
};

// ─── Form: Textarea ────────────────────────────────────────────────────────────

export const Textareas: Story = {
  name: 'Textarea',
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Text className="text-xs">src/components/playground/textarea.tsx — multi-line text area with matching Input styling.</Text>
      <Field>
        <Label>Notes</Label>
        <Textarea name="notes" placeholder="Write your notes here…" rows={3} />
      </Field>
    </div>
  ),
};

// ─── Form: Select ──────────────────────────────────────────────────────────────

export const Selects: Story = {
  name: 'Select',
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Text className="text-xs">src/components/playground/select.tsx — native select styled to match Input.</Text>
      <Field>
        <Label>Category</Label>
        <Select name="category">
          <option value="">Choose a category…</option>
          <option value="strength">Strength</option>
          <option value="cardio">Cardio</option>
          <option value="mobility">Mobility</option>
        </Select>
      </Field>
    </div>
  ),
};

// ─── Form: Checkbox ────────────────────────────────────────────────────────────

export const Checkboxes: Story = {
  name: 'Checkbox',
  render: () => (
    <div className="space-y-4">
      <Text className="text-xs">src/components/playground/checkbox.tsx — Headless UI Checkbox with CheckboxGroup and CheckboxField helpers.</Text>
      <CheckboxGroup>
        <CheckboxField>
          <Checkbox name="opt1" defaultChecked />
          <Label>Option A (pre-checked)</Label>
        </CheckboxField>
        <CheckboxField>
          <Checkbox name="opt2" />
          <Label>Option B</Label>
        </CheckboxField>
        <CheckboxField>
          <Checkbox name="opt3" disabled />
          <Label>Option C (disabled)</Label>
        </CheckboxField>
      </CheckboxGroup>
    </div>
  ),
};

// ─── Form: Switch ──────────────────────────────────────────────────────────────

export const Switches: Story = {
  name: 'Switch',
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <div className="space-y-4">
        <Text className="text-xs">src/components/playground/switch.tsx — Headless UI toggle with SwitchField and SwitchGroup helpers.</Text>
        <SwitchField>
          <Label>Enable notifications</Label>
          <Switch checked={on} onChange={setOn} name="notifications" />
        </SwitchField>
        <Text className="text-xs text-muted-foreground">State: {on ? 'on' : 'off'}</Text>
      </div>
    );
  },
};

// ─── Form: Radio ───────────────────────────────────────────────────────────────

export const Radios: Story = {
  name: 'Radio',
  render: () => (
    <div className="space-y-4">
      <Text className="text-xs">src/components/playground/radio.tsx — Headless UI RadioGroup with RadioField helpers.</Text>
      <RadioGroup name="intensity" defaultValue="moderate">
        <RadioField>
          <Radio value="light" />
          <Label>Light</Label>
        </RadioField>
        <RadioField>
          <Radio value="moderate" />
          <Label>Moderate</Label>
        </RadioField>
        <RadioField>
          <Radio value="intense" />
          <Label>Intense</Label>
        </RadioField>
      </RadioGroup>
    </div>
  ),
};

// ─── Fieldset ──────────────────────────────────────────────────────────────────

export const Fieldsets: Story = {
  name: 'Fieldset',
  render: () => (
    <div className="space-y-2 w-full max-w-sm">
      <Text className="text-xs">src/components/playground/fieldset.tsx — Headless UI Fieldset with Legend, Field, Label, Description, and ErrorMessage helpers.</Text>
      <Fieldset>
        <Legend>Workout settings</Legend>
        <FieldGroup>
          <Field>
            <Label>Duration</Label>
            <Input name="duration" placeholder="e.g. 20:00" />
          </Field>
          <Field>
            <Label>Target rounds</Label>
            <Input name="rounds" type="number" placeholder="5" />
          </Field>
        </FieldGroup>
      </Fieldset>
    </div>
  ),
};

// ─── DescriptionList ───────────────────────────────────────────────────────────

export const DescriptionLists: Story = {
  name: 'DescriptionList',
  render: () => (
    <div className="space-y-2 w-full max-w-sm">
      <Text className="text-xs">src/components/playground/description-list.tsx — styled dl/dt/dd for key-value metadata display.</Text>
      <DescriptionList>
        <DescriptionTerm>Type</DescriptionTerm>
        <DescriptionDetails>AMRAP</DescriptionDetails>
        <DescriptionTerm>Duration</DescriptionTerm>
        <DescriptionDetails>20 minutes</DescriptionDetails>
        <DescriptionTerm>Movements</DescriptionTerm>
        <DescriptionDetails>Pull-ups, Push-ups, Air Squats</DescriptionDetails>
      </DescriptionList>
    </div>
  ),
};

// ─── Table ─────────────────────────────────────────────────────────────────────

export const Tables: Story = {
  name: 'Table',
  render: () => (
    <div className="space-y-2 w-full">
      <Text className="text-xs">src/components/playground/table.tsx — styled table with TableHead, TableBody, TableRow, TableHeader, TableCell.</Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Movement</TableHeader>
            <TableHeader>Reps</TableHeader>
            <TableHeader>Weight</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Back Squat</TableCell>
            <TableCell>5</TableCell>
            <TableCell>135 lb</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Deadlift</TableCell>
            <TableCell>3</TableCell>
            <TableCell>225 lb</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Bench Press</TableCell>
            <TableCell>5</TableCell>
            <TableCell>185 lb</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

// ─── Pagination ────────────────────────────────────────────────────────────────

export const Paginations: Story = {
  name: 'Pagination',
  render: () => (
    <div className="space-y-2">
      <Text className="text-xs">src/components/playground/pagination.tsx — page navigation with Previous, Next, Page, and Gap helpers.</Text>
      <Pagination>
        <PaginationPrevious href="?page=1" />
        <PaginationList>
          <PaginationPage href="?page=1">1</PaginationPage>
          <PaginationPage href="?page=2" current>2</PaginationPage>
          <PaginationPage href="?page=3">3</PaginationPage>
          <PaginationGap />
          <PaginationPage href="?page=10">10</PaginationPage>
        </PaginationList>
        <PaginationNext href="?page=3" />
      </Pagination>
    </div>
  ),
};

// ─── Complex primitives (usage notes only) ─────────────────────────────────────

export const ComplexPrimitives: Story = {
  name: 'Complex Primitives (reference)',
  render: () => (
    <div className="space-y-6">
      <Heading level={3} className="text-base font-semibold">Complex Primitives</Heading>
      <Text>
        The following primitives require a Headless UI provider context or router and are not rendered inline here.
        See their source files for usage patterns.
      </Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Component</TableHeader>
            <TableHeader>File</TableHeader>
            <TableHeader>Notes</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {[
            ['Alert', 'alert.tsx', 'Headless Dialog — modal alert with backdrop. Use for destructive confirmations.'],
            ['Dialog', 'dialog.tsx', 'Headless Dialog — full dialog with close button, title, body, actions.'],
            ['Dropdown', 'dropdown.tsx', 'Headless Menu — contextual dropdown with items and dividers.'],
            ['Combobox', 'combobox.tsx', 'Headless Combobox — filterable autocomplete list.'],
            ['Listbox', 'listbox.tsx', 'Headless Listbox — styled single/multi-select dropdown.'],
            ['AuthLayout', 'auth-layout.tsx', 'Two-column auth shell with image panel.'],
            ['StackedLayout', 'stacked-layout.tsx', 'Top-nav + content shell (alternative to SidebarLayout).'],
          ].map(([name, file, notes]) => (
            <TableRow key={name}>
              <TableCell className="font-mono text-xs">{name}</TableCell>
              <TableCell className="font-mono text-xs text-zinc-500">src/components/playground/{file}</TableCell>
              <TableCell className="text-xs">{notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
