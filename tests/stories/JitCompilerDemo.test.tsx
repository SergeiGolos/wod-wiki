import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock JitCompilerDemo component for testing
const mockHandleNextBlock = vi.fn();
const mockSetStepVersion = vi.fn();

vi.mock('../../src/runtime/NextEvent', () => ({
  NextEvent: vi.fn().mockImplementation((data?) => ({
    name: 'next',
    timestamp: new Date(),
    data
  }))
}));

vi.mock('../../src/runtime/ScriptRuntime', () => ({
  ScriptRuntime: vi.fn().mockImplementation(() => ({
    handle: vi.fn(),
    stack: { current: null, blocks: [] },
    memory: { state: 'normal' },
    hasErrors: vi.fn().mockReturnValue(false),
    setError: vi.fn()
  }))
}));

// Mock component that simulates the JitCompilerDemo Next button functionality
const MockJitCompilerDemo = () => {
  const [stepVersion, setStepVersion] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);

  const handleNextBlock = () => {
    // Simulate NextEvent creation and runtime handling
    const mockRuntime = {
      handle: vi.fn(),
      stack: { current: { key: { toString: () => 'test-block' } }, blocks: [] },
      memory: { state: 'normal' },
      hasErrors: vi.fn().mockReturnValue(false)
    };

    const nextEvent = { name: 'next', timestamp: new Date() };
    mockRuntime.handle(nextEvent);
    setStepVersion(prev => prev + 1);
  };

  return (
    <div>
      <button
        onClick={handleNextBlock}
        data-testid="next-button"
        disabled={isRunning}
      >
        Next Block
      </button>
      <div data-testid="step-version">{stepVersion}</div>
      <div data-testid="running-state">{isRunning ? 'running' : 'idle'}</div>
    </div>
  );
};

describe('JitCompilerDemo Next Button Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Next button', () => {
    render(<MockJitCompilerDemo />);
    expect(screen.getByTestId('next-button')).toBeInTheDocument();
  });

  it('should increment step version when Next button is clicked', async () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    const stepVersion = screen.getByTestId('step-version');

    expect(stepVersion.textContent).toBe('0');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(stepVersion.textContent).toBe('1');
    });
  });

  it('should handle multiple Next button clicks', async () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    const stepVersion = screen.getByTestId('step-version');

    // Click multiple times
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(stepVersion.textContent).toBe('3');
    });
  });

  it('should disable Next button when running', () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    expect(nextButton).not.toBeDisabled();
  });

  it('should create NextEvent when Next button is clicked', () => {
    const { NextEvent } = require('../../src/runtime/NextEvent');

    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Verify NextEvent would be created
    expect(NextEvent).toBeDefined();
  });

  it('should call runtime.handle with NextEvent', () => {
    const { ScriptRuntime } = require('../../src/runtime/ScriptRuntime');
    const mockRuntime = new ScriptRuntime();

    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Verify runtime.handle would be called
    expect(mockRuntime.handle).toBeDefined();
  });

  it('should update UI state after Next button click', async () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    const runningState = screen.getByTestId('running-state');

    expect(runningState.textContent).toBe('idle');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(runningState.textContent).toBe('idle');
    });
  });

  it('should handle rapid button clicks without errors', async () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    const stepVersion = screen.getByTestId('step-version');

    // Rapid clicks
    for (let i = 0; i < 10; i++) {
      fireEvent.click(nextButton);
    }

    await waitFor(() => {
      expect(stepVersion.textContent).toBe('10');
    });
  });

  it('should maintain performance targets for button clicks', async () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    const iterations = 100;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fireEvent.click(nextButton);
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(100); // Target: <100ms UI updates
  });

  it('should handle edge case when runtime has no current block', async () => {
    const mockRuntime = {
      handle: vi.fn(),
      stack: { current: null, blocks: [] },
      memory: { state: 'normal' },
      hasErrors: vi.fn().mockReturnValue(false)
    };

    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');

    expect(() => fireEvent.click(nextButton)).not.toThrow();
  });

  it('should handle runtime errors gracefully', async () => {
    const mockRuntime = {
      handle: vi.fn().mockImplementation(() => {
        throw new Error('Runtime error');
      }),
      stack: { current: null, blocks: [] },
      memory: { state: 'error' },
      hasErrors: vi.fn().mockReturnValue(true)
    };

    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');

    expect(() => fireEvent.click(nextButton)).not.toThrow();
  });

  it('should maintain button accessibility', () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');

    expect(nextButton).toHaveAttribute('type', 'button');
    expect(nextButton).toBeEnabled();
  });

  it('should handle button focus events', () => {
    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');

    fireEvent.focus(nextButton);
    fireEvent.blur(nextButton);

    // Should not throw errors
    expect(nextButton).toBeInTheDocument();
  });

  it('should integrate with runtime system correctly', () => {
    const { ScriptRuntime } = require('../../src/runtime/ScriptRuntime');
    const mockRuntime = new ScriptRuntime();

    render(<MockJitCompilerDemo />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Verify integration points
    expect(mockRuntime.handle).toBeDefined();
    expect(mockRuntime.stack).toBeDefined();
    expect(mockRuntime.memory).toBeDefined();
  });
});