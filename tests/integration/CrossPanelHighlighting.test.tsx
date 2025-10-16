import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RuntimeTestBench } from '../../../src/runtime-test-bench/RuntimeTestBench';

// Mock dependencies
vi.mock('../../../src/runtime/ScriptRuntime');
vi.mock('../../../src/editor/WodWiki', () => ({
  WodWiki: ({ code, onValueChange, highlightedLine }: any) => (
    <div data-testid="wodwiki-editor" data-highlighted-line={highlightedLine}>
      <textarea
        value={code}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {highlightedLine && <div data-testid="line-highlight" data-line={highlightedLine} />}
    </div>
  )
}));

describe('CrossPanelHighlighting Integration Tests', () => {
  describe('User Story 2: Hover block highlights editor line and memory entries', () => {
    test('should highlight editor line when hovering over stack block', async () => {
      const script = `workout "Test" {
  rounds 3 {        // line 2
    pullups 10      // line 3
    squats 20       // line 4
  }
}`;

      // Mock runtime with stack blocks
      const mockBlocks = [
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
          children: ['exercise-1', 'exercise-2'],
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

      const mockScriptRuntime = {
        compile: vi.fn().mockResolvedValue({ success: true }),
        execute: vi.fn().mockResolvedValue({ success: true }),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        step: vi.fn(),
        getStack: vi.fn().mockReturnValue(mockBlocks),
        getMemory: vi.fn().mockReturnValue([]),
        getStatus: vi.fn().mockReturnValue('idle'),
        getMetrics: vi.fn().mockReturnValue({}),
        subscribe: vi.fn().mockReturnValue(() => {})
      };

      vi.mocked(ScriptRuntime).mockImplementation(() => mockScriptRuntime);

      render(<RuntimeTestBench initialCode={script} />);

      // Execute to populate stack
      const executeButton = screen.getByRole('button', { name: /execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('Pull-ups x 10')).toBeInTheDocument();
      });

      // Hover over the pull-ups block
      const pullupsBlock = screen.getByText('Pull-ups x 10');
      fireEvent.mouseEnter(pullupsBlock);

      // Check that editor highlights line 3
      await waitFor(() => {
        const editor = screen.getByTestId('wodwiki-editor');
        expect(editor).toHaveAttribute('data-highlighted-line', '3');
      });

      // Check for line highlight indicator
      expect(screen.getByTestId('line-highlight')).toHaveAttribute('data-line', '3');

      // Mouse leave should clear highlight
      fireEvent.mouseLeave(pullupsBlock);

      await waitFor(() => {
        const editor = screen.getByTestId('wodwiki-editor');
        expect(editor).not.toHaveAttribute('data-highlighted-line');
      });
    });

    test('should highlight memory entries when hovering over stack block', async () => {
      const script = `workout "Test" {
  rounds 3 {
    pullups 10
  }
}`;

      // Mock memory entries owned by the pull-ups block
      const mockMemory = [
        {
          id: 'reps-1',
          ownerId: 'exercise-1',
          ownerLabel: 'Pull-ups x 10',
          type: 'metric',
          value: 10,
          valueFormatted: '10 reps',
          label: 'Current Reps',
          isValid: true,
          isHighlighted: false
        },
        {
          id: 'time-1',
          ownerId: 'exercise-1',
          ownerLabel: 'Pull-ups x 10',
          type: 'timer-state',
          value: 300,
          valueFormatted: '5:00',
          label: 'Elapsed Time',
          isValid: true,
          isHighlighted: false
        },
        {
          id: 'other-1',
          ownerId: 'workout-1',
          ownerLabel: 'Workout',
          type: 'metric',
          value: 1,
          valueFormatted: '1 round',
          label: 'Current Round',
          isValid: true,
          isHighlighted: false
        }
      ];

      const mockBlocks = [
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
          key: 'exercise-1',
          blockType: 'exercise',
          label: 'Pull-ups x 10',
          color: '#f59e0b',
          isActive: false,
          isComplete: false,
          status: 'pending',
          children: [],
          depth: 1,
          sourceIds: [3]
        }
      ];

      const mockScriptRuntime = {
        compile: vi.fn().mockResolvedValue({ success: true }),
        execute: vi.fn().mockResolvedValue({ success: true }),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        step: vi.fn(),
        getStack: vi.fn().mockReturnValue(mockBlocks),
        getMemory: vi.fn().mockReturnValue(mockMemory),
        getStatus: vi.fn().mockReturnValue('idle'),
        getMetrics: vi.fn().mockReturnValue({}),
        subscribe: vi.fn().mockReturnValue(() => {})
      };

      vi.mocked(ScriptRuntime).mockImplementation(() => mockScriptRuntime);

      render(<RuntimeTestBench initialCode={script} />);

      // Execute to populate data
      const executeButton = screen.getByRole('button', { name: /execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('Current Reps')).toBeInTheDocument();
      });

      // Hover over the pull-ups block
      const pullupsBlock = screen.getByText('Pull-ups x 10');
      fireEvent.mouseEnter(pullupsBlock);

      // Check that memory entries owned by exercise-1 are highlighted
      await waitFor(() => {
        const repsEntry = screen.getByText('Current Reps').closest('[data-highlighted]');
        const timeEntry = screen.getByText('Elapsed Time').closest('[data-highlighted]');
        const otherEntry = screen.getByText('Current Round').closest('[data-highlighted]');

        expect(repsEntry).toBeInTheDocument();
        expect(timeEntry).toBeInTheDocument();
        expect(otherEntry).toBeNull(); // Should not be highlighted
      });

      // Mouse leave should clear highlights
      fireEvent.mouseLeave(pullupsBlock);

      await waitFor(() => {
        const highlightedEntries = screen.queryAllByTestId('highlighted-memory-entry');
        expect(highlightedEntries).toHaveLength(0);
      });
    });

    test('should highlight stack block when hovering over memory entry', async () => {
      const script = `workout "Test" {
  pullups 10
}`;

      const mockMemory = [
        {
          id: 'reps-1',
          ownerId: 'exercise-1',
          ownerLabel: 'Pull-ups x 10',
          type: 'metric',
          value: 10,
          valueFormatted: '10 reps',
          label: 'Current Reps',
          isValid: true,
          isHighlighted: false
        }
      ];

      const mockBlocks = [
        {
          key: 'exercise-1',
          blockType: 'exercise',
          label: 'Pull-ups x 10',
          color: '#f59e0b',
          isActive: false,
          isComplete: false,
          status: 'pending',
          children: [],
          depth: 0,
          sourceIds: [2]
        }
      ];

      const mockScriptRuntime = {
        compile: vi.fn().mockResolvedValue({ success: true }),
        execute: vi.fn().mockResolvedValue({ success: true }),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        step: vi.fn(),
        getStack: vi.fn().mockReturnValue(mockBlocks),
        getMemory: vi.fn().mockReturnValue(mockMemory),
        getStatus: vi.fn().mockReturnValue('idle'),
        getMetrics: vi.fn().mockReturnValue({}),
        subscribe: vi.fn().mockReturnValue(() => {})
      };

      vi.mocked(ScriptRuntime).mockImplementation(() => mockScriptRuntime);

      render(<RuntimeTestBench initialCode={script} />);

      // Execute to populate data
      const executeButton = screen.getByRole('button', { name: /execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('Current Reps')).toBeInTheDocument();
      });

      // Hover over the memory entry
      const memoryEntry = screen.getByText('Current Reps');
      fireEvent.mouseEnter(memoryEntry);

      // Check that the corresponding stack block is highlighted
      await waitFor(() => {
        const highlightedBlock = screen.getByTestId('highlighted-stack-block');
        expect(highlightedBlock).toHaveTextContent('Pull-ups x 10');
      });

      // Mouse leave should clear highlight
      fireEvent.mouseLeave(memoryEntry);

      await waitFor(() => {
        expect(screen.queryByTestId('highlighted-stack-block')).not.toBeInTheDocument();
      });
    });
  });
});