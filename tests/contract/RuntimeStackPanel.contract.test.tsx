import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RuntimeStackPanel } from '../../src/runtime-test-bench';
import type { RuntimeStackBlock } from '../../src/runtime-test-bench/types/interfaces';

describe('RuntimeStackPanel Contract Tests', () => {
  test('renders empty state', () => {
    render(<RuntimeStackPanel blocks={[]} />);

    expect(screen.getByText(/no runtime stack/i)).toBeInTheDocument();
  });

  test('displays single block', () => {
    const blocks: RuntimeStackBlock[] = [{
      key: 'workout-1',
      blockType: 'workout',
      label: 'Workout',
      color: '#3b82f6',
      isActive: true,
      isComplete: false,
      status: 'active',
      children: [],
      depth: 0,
      sourceIds: [1]
    }];

    render(<RuntimeStackPanel blocks={blocks} />);

    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toHaveClass('bg-blue-500'); // or similar
  });

  test('shows hierarchical structure', () => {
    const blocks: RuntimeStackBlock[] = [
      {
        key: 'workout-1',
        blockType: 'workout',
        label: 'Workout',
        color: '#3b82f6',
        isActive: true,
        isComplete: false,
        status: 'active',
        children: ['rounds-1'],
        depth: 0,
        sourceIds: [1]
      },
      {
        key: 'rounds-1',
        blockType: 'rounds',
        label: 'Rounds x 3',
        color: '#10b981',
        isActive: false,
        isComplete: false,
        status: 'pending',
        children: ['exercise-1'],
        depth: 1,
        sourceIds: [2]
      },
      {
        key: 'exercise-1',
        blockType: 'exercise',
        label: 'Pull-ups x 10',
        color: '#f59e0b',
        isActive: false,
        isComplete: false,
        status: 'pending',
        children: [],
        depth: 2,
        sourceIds: [3]
      }
    ];

    render(<RuntimeStackPanel blocks={blocks} />);

    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Rounds x 3')).toBeInTheDocument();
    expect(screen.getByText('Pull-ups x 10')).toBeInTheDocument();
  });

  test('highlights active block', () => {
    const blocks: RuntimeStackBlock[] = [
      { key: '1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] },
      { key: '2', blockType: 'rounds', label: 'Rounds', color: '#10b981', isActive: true, isComplete: false, status: 'active', children: [], depth: 1, sourceIds: [2] }
    ];

    render(<RuntimeStackPanel blocks={blocks} activeBlockIndex={1} />);

    const activeBlock = screen.getByText('Rounds');
    expect(activeBlock).toHaveClass('ring-2'); // or similar active styling
  });

  test('shows highlighted block', () => {
    const blocks: RuntimeStackBlock[] = [
      { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] },
      { key: 'rounds-1', blockType: 'rounds', label: 'Rounds', color: '#10b981', isActive: false, isComplete: false, status: 'pending', children: [], depth: 1, sourceIds: [2] }
    ];

    render(<RuntimeStackPanel blocks={blocks} highlightedBlockKey="rounds-1" />);

    const highlightedBlock = screen.getByText('Rounds');
    expect(highlightedBlock).toHaveClass('bg-primary/20'); // or similar highlight
  });

  test('calls onBlockHover on hover', () => {
    const handleHover = vi.fn();
    const blocks: RuntimeStackBlock[] = [
      { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1], lineNumber: 5 }
    ];

    render(<RuntimeStackPanel blocks={blocks} onBlockHover={handleHover} />);

    fireEvent.mouseEnter(screen.getByText('Workout'));

    expect(handleHover).toHaveBeenCalledWith('workout-1', 5);
  });

  test('calls onBlockClick on click', () => {
    const handleClick = vi.fn();
    const blocks: RuntimeStackBlock[] = [
      { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] }
    ];

    render(<RuntimeStackPanel blocks={blocks} onBlockClick={handleClick} />);

    fireEvent.click(screen.getByText('Workout'));

    expect(handleClick).toHaveBeenCalledWith('workout-1');
  });

  test('shows metrics when enabled', () => {
    const blocks: RuntimeStackBlock[] = [
      {
        key: 'workout-1',
        blockType: 'workout',
        label: 'Workout',
        color: '#3b82f6',
        isActive: false,
        isComplete: false,
        status: 'pending',
        children: [],
        depth: 0,
        sourceIds: [1],
        metrics: {
          duration: { value: 300, unit: 'seconds', formatted: '5:00' },
          calories: { value: 250, unit: 'kcal', formatted: '250 kcal' }
        }
      }
    ];

    render(<RuntimeStackPanel blocks={blocks} showMetrics={true} />);

    expect(screen.getByText('5:00')).toBeInTheDocument();
    expect(screen.getByText('250 kcal')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <RuntimeStackPanel
        blocks={[]}
        className="custom-class"
      />
    );

    const root = container.firstChild;
    expect(root).toHaveClass('custom-class');
  });
});