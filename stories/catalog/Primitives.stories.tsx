/**
 * Catalog / Primitives
 *
 * All design-system building blocks in one place.
 *
 * ── shadcn/ui (`src/components/ui/`)  ──────────────────────────────────────
 * Radix UI primitives styled with Tailwind. Used throughout the main app.
 *
 * ── Catalyst (`src/components/playground/`)  ───────────────────────────────
 * Headless UI primitives used in the playground section.
 *
 * Stories are grouped by function, not by library.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// ── shadcn/ui ─────────────────────────────────────────────────────────────────
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Catalyst / Headless UI ────────────────────────────────────────────────────
import { Avatar } from '@/components/playground/avatar';
import { Badge as CatalystBadge } from '@/components/playground/badge';
import { Button as CatalystButton } from '@/components/playground/button';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/playground/checkbox';
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/playground/description-list';
import { Divider } from '@/components/playground/divider';
import { Field, Fieldset, Label as CatalystLabel, FieldGroup, Legend } from '@/components/playground/fieldset';
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

// ─── Sentinel ─────────────────────────────────────────────────────────────────

function PrimitivesIndex() { return <div />; }

const meta: Meta<typeof PrimitivesIndex> = {
  title: 'catalog/Primitives',
  component: PrimitivesIndex,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-10 max-w-3xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Section helpers ───────────────────────────────────────────────────────────

function Section({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{source}</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// shadcn/ui
// ══════════════════════════════════════════════════════════════════════════════

export const Badges: Story = {
  name: 'Badge (shadcn)',
  render: () => (
    <div className="space-y-6">
      <Section title="Badge" source="src/components/ui/badge.tsx">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </Section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">workout contexts</p>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="default">AMRAP</Badge>
          <Badge variant="secondary">For Time</Badge>
          <Badge variant="secondary">EMOM</Badge>
          <Badge variant="outline">Benchmark</Badge>
          <Badge variant="destructive">Max Effort</Badge>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">inline with text</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Fran</span>
            <Badge variant="secondary">21-15-9</Badge>
            <Badge variant="outline">Benchmark</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Murph</span>
            <Badge variant="default">Hero WOD</Badge>
            <Badge variant="outline">For Time</Badge>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const Buttons: Story = {
  name: 'Button (shadcn)',
  render: () => (
    <div className="space-y-6">
      <Section title="Button" source="src/components/ui/button.tsx">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </Section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">size</p>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🏋️</Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">disabled states</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>Disabled outline</Button>
          <Button variant="secondary" disabled>Disabled secondary</Button>
        </div>
      </section>
    </div>
  ),
};

export const Cards: Story = {
  name: 'Card',
  render: () => (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground font-mono">src/components/ui/card.tsx</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fran</CardTitle>
            <CardDescription>Classic CrossFit benchmark — 21-15-9</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thrusters @95 lb + Pull-ups. A true test of cardiovascular fitness.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Start Workout</Button>
            <Button size="sm" variant="outline">View Details</Button>
          </CardFooter>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Today's Plan</CardTitle>
            <CardDescription>3 workouts scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Warm-up — 10:00</li>
              <li>• Fran — 21-15-9</li>
              <li>• Cool-down — 5:00</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};

export const Labels: Story = {
  name: 'Label',
  render: () => (
    <div className="space-y-6 max-w-sm">
      <p className="text-xs text-muted-foreground font-mono">src/components/ui/label.tsx — Radix accessible form label</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="wod-name">Workout name</Label>
          <input id="wod-name" type="text" placeholder="e.g. Fran"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <input id="duration" type="number" placeholder="600"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-mono">peer-disabled</p>
          <Label htmlFor="locked">Locked field</Label>
          <input id="locked" type="text" disabled value="Read-only value"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm opacity-50 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  ),
};

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">src/components/ui/dialog.tsx — Radix portal modal</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              Dialogs use a Radix portal so they render above all other content.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dialog body content goes here. Add forms, text, or anything else.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Dialogs: Story = {
  name: 'Dialog',
  render: () => <DialogDemo />,
};

export const DropdownMenus: Story = {
  name: 'DropdownMenu',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">src/components/ui/dropdown-menu.tsx — Radix contextual menu</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open Dropdown</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View details</DropdownMenuItem>
          <DropdownMenuItem>Edit entry</DropdownMenuItem>
          <DropdownMenuItem>Clone to today</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// ══════════════════════════════════════════════════════════════════════════════
// Catalyst / Headless UI  (src/components/playground/)
// ══════════════════════════════════════════════════════════════════════════════

export const Typography: Story = {
  name: 'Typography (Catalyst)',
  render: () => (
    <div className="space-y-6 dark:bg-zinc-900 dark:text-white p-4 rounded">
      <section className="space-y-2">
        <Subheading>Heading levels</Subheading>
        <Text className="text-xs">src/components/playground/heading.tsx</Text>
        <div className="space-y-1">
          <Heading level={1}>Heading 1</Heading>
          <Heading level={2}>Heading 2</Heading>
          <Heading level={3}>Heading 3</Heading>
          <Subheading>Subheading</Subheading>
        </div>
      </section>
      <Divider soft />
      <section className="space-y-2">
        <Subheading>Text + TextLink</Subheading>
        <Text className="text-xs">src/components/playground/text.tsx</Text>
        <Text>Regular body text using the Text component.</Text>
        <Text>Use <TextLink href="#">TextLink</TextLink> for inline anchors.</Text>
      </section>
    </div>
  ),
};

export const Avatars: Story = {
  name: 'Avatar (Catalyst)',
  render: () => (
    <Section title="Avatar" source="src/components/playground/avatar.tsx">
      <Avatar initials="AB" className="size-10 bg-zinc-200 dark:bg-zinc-700" />
      <Avatar initials="WW" className="size-10 bg-blue-500 text-white" />
      <Avatar square initials="JD" className="size-10 bg-green-500 text-white" />
      <Avatar src="https://api.dicebear.com/7.x/thumbs/svg?seed=wod" className="size-10" />
      <Avatar src="https://api.dicebear.com/7.x/thumbs/svg?seed=wod" square className="size-10" />
    </Section>
  ),
};

export const CatalystBadges: Story = {
  name: 'Badge (Catalyst)',
  render: () => (
    <Section title="Badge (Catalyst)" source="src/components/playground/badge.tsx — 18 color variants">
      {(['zinc','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'] as const).map(color => (
        <CatalystBadge key={color} color={color}>{color}</CatalystBadge>
      ))}
    </Section>
  ),
};

export const CatalystButtons: Story = {
  name: 'Button (Catalyst)',
  render: () => (
    <Section title="Button (Catalyst)" source="src/components/playground/button.tsx — distinct from shadcn Button">
      <CatalystButton>Default</CatalystButton>
      <CatalystButton outline>Outline</CatalystButton>
      <CatalystButton plain>Plain</CatalystButton>
      <CatalystButton disabled>Disabled</CatalystButton>
      <CatalystButton color="dark">Dark</CatalystButton>
      <CatalystButton color="light">Light</CatalystButton>
    </Section>
  ),
};

export const Dividers: Story = {
  name: 'Divider (Catalyst)',
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Text className="text-xs">src/components/playground/divider.tsx</Text>
      <Divider />
      <Text className="text-xs text-muted-foreground">Hard divider (default)</Text>
      <Divider soft />
      <Text className="text-xs text-muted-foreground">Soft divider (reduced opacity)</Text>
    </div>
  ),
};

export const Links: Story = {
  name: 'Link (Catalyst)',
  render: () => (
    <Section title="Link" source="src/components/playground/link.tsx">
      <Link href="#">Internal link</Link>
      <Link href="https://example.com">External link</Link>
    </Section>
  ),
};

export const Inputs: Story = {
  name: 'Input (Catalyst)',
  render: () => (
    <div className="space-y-4 w-full max-w-sm dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/input.tsx</Text>
      <Field>
        <CatalystLabel>Username</CatalystLabel>
        <Input name="username" placeholder="Enter username" />
      </Field>
      <Field>
        <CatalystLabel>Disabled field</CatalystLabel>
        <Input name="disabled" placeholder="Disabled" disabled />
      </Field>
    </div>
  ),
};

export const Textareas: Story = {
  name: 'Textarea (Catalyst)',
  render: () => (
    <div className="space-y-4 w-full max-w-sm dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/textarea.tsx</Text>
      <Field>
        <CatalystLabel>Notes</CatalystLabel>
        <Textarea name="notes" placeholder="Write your notes here…" rows={3} />
      </Field>
    </div>
  ),
};

export const Selects: Story = {
  name: 'Select (Catalyst)',
  render: () => (
    <div className="space-y-4 w-full max-w-sm dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/select.tsx</Text>
      <Field>
        <CatalystLabel>Category</CatalystLabel>
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

export const Checkboxes: Story = {
  name: 'Checkbox (Catalyst)',
  render: () => (
    <div className="space-y-4 dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/checkbox.tsx</Text>
      <CheckboxGroup>
        <CheckboxField>
          <Checkbox name="opt1" defaultChecked />
          <CatalystLabel>Option A (pre-checked)</CatalystLabel>
        </CheckboxField>
        <CheckboxField>
          <Checkbox name="opt2" />
          <CatalystLabel>Option B</CatalystLabel>
        </CheckboxField>
        <CheckboxField>
          <Checkbox name="opt3" disabled />
          <CatalystLabel>Option C (disabled)</CatalystLabel>
        </CheckboxField>
      </CheckboxGroup>
    </div>
  ),
};

export const Switches: Story = {
  name: 'Switch (Catalyst)',
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <div className="space-y-4 dark:bg-zinc-900 dark:text-white p-4 rounded">
        <Text className="text-xs">src/components/playground/switch.tsx</Text>
        <SwitchField>
          <CatalystLabel>Enable notifications</CatalystLabel>
          <Switch checked={on} onChange={setOn} name="notifications" />
        </SwitchField>
        <Text className="text-xs text-muted-foreground">State: {on ? 'on' : 'off'}</Text>
      </div>
    );
  },
};

export const Radios: Story = {
  name: 'Radio (Catalyst)',
  render: () => (
    <div className="space-y-4 dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/radio.tsx</Text>
      <RadioGroup name="intensity" defaultValue="moderate">
        <RadioField>
          <Radio value="light" />
          <CatalystLabel>Light</CatalystLabel>
        </RadioField>
        <RadioField>
          <Radio value="moderate" />
          <CatalystLabel>Moderate</CatalystLabel>
        </RadioField>
        <RadioField>
          <Radio value="intense" />
          <CatalystLabel>Intense</CatalystLabel>
        </RadioField>
      </RadioGroup>
    </div>
  ),
};

export const Fieldsets: Story = {
  name: 'Fieldset (Catalyst)',
  render: () => (
    <div className="space-y-2 w-full max-w-sm dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/fieldset.tsx</Text>
      <Fieldset>
        <Legend>Workout settings</Legend>
        <FieldGroup>
          <Field>
            <CatalystLabel>Duration</CatalystLabel>
            <Input name="duration" placeholder="e.g. 20:00" />
          </Field>
          <Field>
            <CatalystLabel>Target rounds</CatalystLabel>
            <Input name="rounds" type="number" placeholder="5" />
          </Field>
        </FieldGroup>
      </Fieldset>
    </div>
  ),
};

export const DescriptionLists: Story = {
  name: 'DescriptionList (Catalyst)',
  render: () => (
    <div className="space-y-2 w-full max-w-sm dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/description-list.tsx</Text>
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

export const Tables: Story = {
  name: 'Table (Catalyst)',
  render: () => (
    <div className="space-y-2 w-full dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/table.tsx</Text>
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
        </TableBody>
      </Table>
    </div>
  ),
};

export const Paginations: Story = {
  name: 'Pagination (Catalyst)',
  render: () => (
    <div className="space-y-2 dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Text className="text-xs">src/components/playground/pagination.tsx</Text>
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

export const ComplexPrimitives: Story = {
  name: 'Complex Primitives (reference)',
  render: () => (
    <div className="space-y-6 dark:bg-zinc-900 dark:text-white p-4 rounded">
      <Heading level={3} className="text-base font-semibold">Complex Primitives</Heading>
      <Text>
        The following require a Headless UI provider context or router and are not rendered inline.
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
            ['Alert', 'alert.tsx', 'Headless Dialog — modal alert with backdrop.'],
            ['Dialog', 'dialog.tsx', 'Headless Dialog — full dialog with close, title, body, actions.'],
            ['Dropdown', 'dropdown.tsx', 'Headless Menu — contextual dropdown with items and dividers.'],
            ['Combobox', 'combobox.tsx', 'Headless Combobox — filterable autocomplete list.'],
            ['Listbox', 'listbox.tsx', 'Headless Listbox — styled single/multi-select dropdown.'],
            ['AuthLayout', 'auth-layout.tsx', 'Two-column auth shell with image panel.'],
            ['StackedLayout', 'stacked-layout.tsx', 'Top-nav + content shell.'],
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
