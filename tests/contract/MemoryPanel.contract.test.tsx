import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryPanel } from '../../../src/runtime-test-bench/components/MemoryPanel';
import type { MemoryEntry } from '../../../src/runtime-test-bench/types/interfaces';

describe('MemoryPanel Contract Tests', () => {
  test('renders empty state', () => {
    render(<MemoryPanel entries={[]} groupBy="none" />);

    expect(screen.getByText(/no memory entries/i)).toBeInTheDocument();
  });

  test('displays single memory entry', () => {
    const entries: MemoryEntry[] = [{
      id: 'metric-1',
      ownerId: 'workout-1',
      ownerLabel: 'Workout',
      type: 'metric',
      value: 150,
      valueFormatted: '150 reps',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    }];

    render(<MemoryPanel entries={entries} groupBy="none" />);

    expect(screen.getByText('Total Reps')).toBeInTheDocument();
    expect(screen.getByText('150 reps')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
  });

  test('filters entries by text', () => {
    const entries: MemoryEntry[] = [
      {
        id: '1',
        ownerId: 'workout-1',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Pull-ups',
        isValid: true,
        isHighlighted: false
      },
      {
        id: '2',
        ownerId: 'workout-1',
        type: 'metric',
        value: 20,
        valueFormatted: '20',
        label: 'Push-ups',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="none" filterText="pull" />);

    expect(screen.getByText('Pull-ups')).toBeInTheDocument();
    expect(screen.queryByText('Push-ups')).not.toBeInTheDocument();
  });

  test('groups entries by owner', () => {
    const entries: MemoryEntry[] = [
      {
        id: '1',
        ownerId: 'workout-1',
        ownerLabel: 'Workout',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Total Reps',
        isValid: true,
        isHighlighted: false
      },
      {
        id: '2',
        ownerId: 'rounds-1',
        ownerLabel: 'Rounds x 3',
        type: 'loop-state',
        value: 2,
        valueFormatted: '2',
        label: 'Current Round',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="owner" />);

    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Rounds x 3')).toBeInTheDocument();
    expect(screen.getByText('Total Reps')).toBeInTheDocument();
    expect(screen.getByText('Current Round')).toBeInTheDocument();
  });

  test('groups entries by type', () => {
    const entries: MemoryEntry[] = [
      {
        id: '1',
        ownerId: 'workout-1',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Total Reps',
        isValid: true,
        isHighlighted: false
      },
      {
        id: '2',
        ownerId: 'workout-1',
        type: 'timer-state',
        value: 300,
        valueFormatted: '5:00',
        label: 'Timer',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="type" />);

    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Timer State')).toBeInTheDocument();
  });

  test('highlights entries', () => {
    const entries: MemoryEntry[] = [
      {
        id: 'metric-1',
        ownerId: 'workout-1',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Total Reps',
        isValid: true,
        isHighlighted: false
      },
      {
        id: 'metric-2',
        ownerId: 'workout-1',
        type: 'metric',
        value: 20,
        valueFormatted: '20',
        label: 'Push-ups',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="none" highlightedMemoryId="metric-1" />);

    const highlightedEntry = screen.getByText('Total Reps');
    expect(highlightedEntry.closest('[data-entry-id="metric-1"]')).toHaveClass('bg-primary/20');
  });

  test('calls onEntryHover on hover', () => {
    const handleHover = vi.fn();
    const entries: MemoryEntry[] = [
      {
        id: 'metric-1',
        ownerId: 'workout-1',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Total Reps',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="none" onEntryHover={handleHover} />);

    fireEvent.mouseEnter(screen.getByText('Total Reps'));

    expect(handleHover).toHaveBeenCalledWith('metric-1', 'workout-1');
  });

  test('calls onEntryClick on click', () => {
    const handleClick = vi.fn();
    const entries: MemoryEntry[] = [
      {
        id: 'metric-1',
        ownerId: 'workout-1',
        type: 'metric',
        value: 10,
        valueFormatted: '10',
        label: 'Total Reps',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="none" onEntryClick={handleClick} />);

    fireEvent.click(screen.getByText('Total Reps'));

    expect(handleClick).toHaveBeenCalledWith('metric-1');
  });

  test('shows value popover on expand', () => {
    const entries: MemoryEntry[] = [
      {
        id: 'metric-1',
        ownerId: 'workout-1',
        type: 'metric',
        value: { nested: { data: 'complex' } },
        valueFormatted: '{...}',
        label: 'Complex Metric',
        isValid: true,
        isHighlighted: false
      }
    ];

    render(<MemoryPanel entries={entries} groupBy="none" expandValues={true} />);

    expect(screen.getByText('nested')).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('complex')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <MemoryPanel
        entries={[]}
        groupBy="none"
        className="custom-class"
      />
    );

    const root = container.firstChild;
    expect(root).toHaveClass('custom-class');
  });
});