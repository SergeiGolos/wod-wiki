/**
 * Catalog / Atoms / Primitives / Table
 *
 * Stories:
 *  1. Default — basic data table
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/atoms/primitives/table';

const meta: Meta<typeof Table> = {
  title: 'catalog/atoms/primitives/Table',
  component: Table,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Calories</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Morning Run</TableCell>
          <TableCell>Cardio</TableCell>
          <TableCell>30 min</TableCell>
          <TableCell>300</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Strength Training</TableCell>
          <TableCell>Strength</TableCell>
          <TableCell>45 min</TableCell>
          <TableCell>250</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Yoga Flow</TableCell>
          <TableCell>Flexibility</TableCell>
          <TableCell>60 min</TableCell>
          <TableCell>200</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
