/**
 * DesignSystem / Atoms
 *
 * Single canvas that showcases every atom component in the design system.
 * All variants are displayed statically — no arg controls needed here.
 * Use the individual component stories for interactive controls.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// UI primitives
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { WodPlaygroundButton } from '@/components/Editor/md-components/WodPlaygroundButton';

import { FIXTURE_ENTRY_DATES } from '../_shared/fixtures';

// ── Section helper ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
      {title}
    </h2>
    {children}
  </section>
);

// ── Inline interactive wrappers ──────────────────────────────────────────────

const DialogDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>
            This is an example dialog. Dialogs use a Radix portal so they render
            above all other content.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dialog body content goes here. You can add forms, text, or anything else.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DropdownDemo: React.FC = () => (
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
);

const CalendarDemo: React.FC = () => {
  const [selected, setSelected] = useState<Date | null>(new Date());
  return (
    <div className="inline-block border border-border rounded-lg p-2 bg-card">
      <CalendarDatePicker
        selectedDate={selected}
        onDateSelect={setSelected}
        entryDates={FIXTURE_ENTRY_DATES}
      />
    </div>
  );
};

// ── All-atoms page ────────────────────────────────────────────────────────────

const AtomsPage: React.FC = () => (
  <div className="space-y-12 p-8 max-w-4xl mx-auto">
    {/* ── Button ── */}
    <Section title="Button">
      <div className="space-y-4">
        {/* Variants */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">variant</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
        {/* Sizes */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">size</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">🏋️</Button>
          </div>
        </div>
        {/* States */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">states</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled outline
            </Button>
          </div>
        </div>
      </div>
    </Section>

    {/* ── Card ── */}
    <Section title="Card">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fran</CardTitle>
            <CardDescription>Classic CrossFit benchmark — 21-15-9</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thrusters @95lb + Pull-ups. A true test of cardiovascular fitness and
              barbell cycling efficiency.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Start Workout</Button>
            <Button size="sm" variant="outline">
              View Details
            </Button>
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
    </Section>

    {/* ── Dialog ── */}
    <Section title="Dialog">
      <DialogDemo />
    </Section>

    {/* ── DropdownMenu ── */}
    <Section title="DropdownMenu">
      <DropdownDemo />
    </Section>

    {/* ── CalendarDatePicker ── */}
    <Section title="CalendarDatePicker">
      <div className="max-w-[280px]">
        <CalendarDemo />
        <p className="text-xs text-muted-foreground mt-2">
          Bold dates have entries (from fixtures). Selected date highlighted in primary.
        </p>
      </div>
    </Section>

    {/* ── WodPlaygroundButton ── */}
    <Section title="WodPlaygroundButton">
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">
            Simple workout — opens Playground with pre-loaded content
          </p>
          <WodPlaygroundButton wodContent="(21-15-9)\n  Thrusters @95lb\n  Pull-ups" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">AMRAP variant</p>
          <WodPlaygroundButton
            wodContent="20:00 AMRAP\n  5 Pull-ups\n  10 Push-ups\n  15 Air Squats"
          />
        </div>
      </div>
    </Section>
  </div>
);

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'atoms/Atoms',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Single-page showcase of every atom in the design system. ' +
          'All variants rendered statically — no interactive controls.',
      },
    },
  },
};

export default meta;

export const AllAtoms: StoryObj = {
  name: 'All Atoms',
  render: () => <AtomsPage />,
};
