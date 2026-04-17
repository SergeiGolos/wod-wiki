/**
 * Catalog / Atoms / Card
 *
 * Card component with header, content, and footer compositions.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const meta: Meta<typeof Card> = {
  title: 'catalog/atoms/Card',
  component: Card,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  name: 'Standard Card',
  render: () => (
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
  ),
};

export const Highlighted: Story = {
  name: 'Highlighted Card',
  render: () => (
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
  ),
};

export const SideBySide: Story = {
  name: 'Side-by-Side',
  render: () => (
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
  ),
};
