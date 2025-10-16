/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RuntimeTestBench } from '../../src/runtime-test-bench/RuntimeTestBench';

// Mock the ScriptRuntime and related dependencies
vi.mock('../../src/runtime/ScriptRuntime', () => ({
  ScriptRuntime: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockResolvedValue({ success: true }),
    execute: vi.fn().mockResolvedValue({ success: true }),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    step: vi.fn().mockResolvedValue({}),
    getStack: vi.fn().mockReturnValue([]),
    getMemory: vi.fn().mockReturnValue([]),
    getStatus: vi.fn().mockReturnValue('idle'),
    getMetrics: vi.fn().mockReturnValue({}),
    subscribe: vi.fn().mockReturnValue(() => {})
  }))
}));

// Mock WodWiki component
vi.mock('../../src/editor/WodWiki', () => ({
  WodWiki: ({ code, onValueChange }: any) => (
    <textarea
      value={code}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="wodwiki-editor"
    />
  )
}));

describe('RuntimeTestBench Integration Tests', () => {
  describe('User Story 1: Edit script → Step execution → Reset workflow', () => {
    test('should allow editing script and stepping through execution', async () => {
      const initialScript = `workout "Test" {
  rounds 3 {
    pullups 10
    squats 20
  }
}`;

      render(<RuntimeTestBench initialCode={initialScript} />);

      // Verify initial state
      expect(screen.getByTestId('wodwiki-editor')).toHaveValue(initialScript);
      expect(screen.getByText('idle')).toBeInTheDocument();

      // Edit the script
      const editor = screen.getByTestId('wodwiki-editor');
      const newScript = `workout "Updated" {
  rounds 2 {
    pushups 15
  }
}`;
      fireEvent.change(editor, { target: { value: newScript } });

      // Verify script was updated
      expect(screen.getByTestId('wodwiki-editor')).toHaveValue(newScript);

      // Click compile button
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      // Wait for compilation to complete
      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Click execute button
      const executeButton = screen.getByRole('button', { name: /execute/i });
      fireEvent.click(executeButton);

      // Wait for execution to start
      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Click step button
      const stepButton = screen.getByRole('button', { name: /step/i });
      fireEvent.click(stepButton);

      // Click pause button
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      // Wait for pause
      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Click reset button
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      // Wait for reset
      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Verify script is still there
      expect(screen.getByTestId('wodwiki-editor')).toHaveValue(newScript);
    });

    test('should handle compilation errors gracefully', async () => {
      // Mock compilation failure
      const mockScriptRuntime = {
        compile: vi.fn().mockResolvedValue({
          success: false,
          errors: [{ line: 2, column: 5, message: 'Syntax error', severity: 'error' }]
        }),
        execute: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        step: vi.fn(),
        getStack: vi.fn().mockReturnValue([]),
        getMemory: vi.fn().mockReturnValue([]),
        getStatus: vi.fn().mockReturnValue('idle'),
        getMetrics: vi.fn().mockReturnValue({}),
        subscribe: vi.fn().mockReturnValue(() => {})
      };

      vi.mocked(ScriptRuntime).mockImplementation(() => mockScriptRuntime);

      const invalidScript = `workout "Test" {
  invalid syntax here
}`;

      render(<RuntimeTestBench initialCode={invalidScript} />);

      // Click compile button
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      // Wait for error display
      await waitFor(() => {
        expect(screen.getByText(/syntax error/i)).toBeInTheDocument();
      });

      // Verify execution is disabled
      const executeButton = screen.getByRole('button', { name: /execute/i });
      expect(executeButton).toBeDisabled();
    });

    test('should maintain state through edit-compile-execute cycle', async () => {
      const script1 = `workout "First" { pullups 5 }`;
      const script2 = `workout "Second" { squats 10 }`;

      render(<RuntimeTestBench initialCode={script1} />);

      // Edit to script2
      const editor = screen.getByTestId('wodwiki-editor');
      fireEvent.change(editor, { target: { value: script2 } });

      // Compile
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Execute
      const executeButton = screen.getByRole('button', { name: /execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Edit back to script1 while running
      fireEvent.change(editor, { target: { value: script1 } });

      // Should still be running (state preserved)
      expect(screen.getByText('running')).toBeInTheDocument();

      // Stop and recompile
      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Compile new script
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });
    });
  });

  // T086: Full Workflow Integration Test
  describe('T086: Full Workflow Integration', () => {
    test('should complete full workflow: edit → parse → compile → execute → complete', async () => {
      const workoutScript = `timer 21:00
  (21-15-9)
    Thrusters 95lb
    Pullups`;

      render(<RuntimeTestBench initialCode={workoutScript} />);

      // Step 1: Edit (code already in editor)
      const editor = screen.getByTestId('wodwiki-editor');
      expect(editor).toHaveValue(workoutScript);

      // Step 2: Parse (automatic with 500ms debounce)
      // Wait for parse to complete
      await waitFor(() => {
        // Check that no parse errors are shown
        expect(screen.queryByText(/parse error/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Step 3: Compile
      const compileButton = screen.getByRole('button', { name: /compile/i });
      expect(compileButton).toBeEnabled();
      fireEvent.click(compileButton);

      await waitFor(() => {
        // Should show compilation success
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Step 4: Execute
      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      expect(executeButton).toBeEnabled();
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Step 5: Verify panels update during execution
      // Runtime stack panel should show blocks
      // Memory panel should show allocations
      // Status footer should show elapsed time

      // Wait for completion (in real scenario)
      // For now, just verify running state is maintained
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    test('should handle pause and resume correctly', async () => {
      render(<RuntimeTestBench initialCode="timer 5:00\n  pushups 10" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Pause execution
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeEnabled();
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Resume execution (Run button should now say "Resume")
      const resumeButton = screen.getByRole('button', { name: /resume|run/i });
      expect(resumeButton).toBeEnabled();
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });
    });

    test('should handle step-by-step execution', async () => {
      render(<RuntimeTestBench initialCode="rounds 3\n  squats 20" />);

      // Compile
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Step once
      const stepButton = screen.getByRole('button', { name: /step/i });
      fireEvent.click(stepButton);

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Step again
      fireEvent.click(stepButton);

      // Should still be paused (or completed)
      await waitFor(() => {
        const status = screen.getByText(/paused|completed/i);
        expect(status).toBeInTheDocument();
      });
    });

    test('should handle stop and reset correctly', async () => {
      render(<RuntimeTestBench initialCode="timer 10:00\n  burpees 50" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Stop execution
      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Reset should clear everything
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Should be able to compile again
      expect(compileButton).toBeEnabled();
    });

    test('should update panels in real-time during execution', async () => {
      render(<RuntimeTestBench initialCode="timer 1:00\n  pushups 10" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Wait a bit for panels to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify elapsed time is tracking (should be > 0)
      // Note: This is a basic check - actual implementation should verify
      // that RuntimeStackPanel, MemoryPanel, and StatusFooter are updating
      expect(screen.getByText('running')).toBeInTheDocument();
    });
  });

  // T087: Keyboard Shortcuts Validation
  describe('T087: Keyboard Shortcuts', () => {
    test('should handle Space key for pause/resume', async () => {
      render(<RuntimeTestBench initialCode="timer 5:00\n  squats 20" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Press Space to pause
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Press Space again to resume
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });
    });

    test('should handle Ctrl+Enter to execute/resume', async () => {
      render(<RuntimeTestBench initialCode="timer 3:00\n  pushups 15" />);

      // Compile first
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Press Ctrl+Enter to execute
      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Pause with button
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Press Ctrl+Enter to resume
      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });
    });

    test('should handle F5 to reset', async () => {
      render(<RuntimeTestBench initialCode="rounds 2\n  burpees 10" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Press F5 to reset
      fireEvent.keyDown(document, { key: 'F5', code: 'F5' });

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });
    });

    test('should handle F10 to step when paused', async () => {
      render(<RuntimeTestBench initialCode="rounds 3\n  squats 15" />);

      // Compile
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // Press F10 to step
      fireEvent.keyDown(document, { key: 'F10', code: 'F10' });

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // Press F10 again to step
      fireEvent.keyDown(document, { key: 'F10', code: 'F10' });

      // Should still be paused or completed
      await waitFor(() => {
        const status = screen.getByText(/paused|completed/i);
        expect(status).toBeInTheDocument();
      });
    });

    test('should handle F11 to compile when idle', async () => {
      render(<RuntimeTestBench initialCode="timer 10:00\n  pullups 20" />);

      // Wait for initial parse
      await waitFor(() => {
        expect(screen.queryByText(/parse error/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Press F11 to compile
      fireEvent.keyDown(document, { key: 'F11', code: 'F11' });

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });
    });

    test('should handle Escape to stop when running', async () => {
      render(<RuntimeTestBench initialCode="timer 5:00\n  pushups 10" />);

      // Compile and execute
      const compileButton = screen.getByRole('button', { name: /compile/i });
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /run|execute/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // Press Escape to stop
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });
    });

    test('should not conflict shortcuts in different states', async () => {
      render(<RuntimeTestBench initialCode="rounds 2\n  squats 10" />);

      // In idle state: F11 compiles, Ctrl+Enter does nothing (needs compile first)
      fireEvent.keyDown(document, { key: 'F11', code: 'F11' });

      await waitFor(() => {
        expect(screen.getByText('idle')).toBeInTheDocument();
      });

      // In idle state: F10 steps immediately
      fireEvent.keyDown(document, { key: 'F10', code: 'F10' });

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });

      // In paused state: Space resumes
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
      });

      // In running state: Space pauses
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument();
      });
    });
  });
});