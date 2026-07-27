/**
 * Catalog / Atoms / Primitives / Card
 *
 * Stories:
 *  1. Default — complete card example
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/atoms/primitives/card';
import { Button } from '@/components/atoms/primitives/button';

const meta: Meta<typeof Card> = {
  title: 'catalog/atoms/primitives/Card',
  component: Card,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description text goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with detailed information.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};
