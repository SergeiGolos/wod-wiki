import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RuntimeTestBench } from '../../../src/runtime-test-bench/RuntimeTestBench';

// Mock the ScriptRuntime and related dependencies
vi.mock('../../../src/runtime/ScriptRuntime', () => ({
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
vi.mock('../../../src/editor/WodWiki', () => ({
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
});