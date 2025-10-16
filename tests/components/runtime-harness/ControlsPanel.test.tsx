import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlsPanel } from '../../../src/runtime-test-bench/components/ControlsPanel';
import { ExecutionStatus } from '../../../src/runtime-test-bench/types/interfaces';

describe('ControlsPanel', () => {
  const defaultProps = {
    status: 'idle' as ExecutionStatus,
    enabled: true,
    speed: 1.0,
    onPlayPause: vi.fn(),
    onStop: vi.fn(),
    onReset: vi.fn(),
    onSpeedChange: vi.fn(),
    onStep: vi.fn(),
    stepMode: false,
    onStepModeToggle: vi.fn(),
  };

  it('renders with idle status', () => {
    render(<ControlsPanel {...defaultProps} />);
    expect(screen.getByText('Execution Controls')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('shows play button when idle', () => {
    render(<ControlsPanel {...defaultProps} />);
    const playButton = screen.getByTitle('Start execution');
    expect(playButton).toBeInTheDocument();
    expect(playButton).toHaveTextContent('▶️ Play');
  });

  it('shows pause button when executing', () => {
    render(<ControlsPanel {...defaultProps} status="executing" />);
    const pauseButton = screen.getByTitle('Pause execution');
    expect(pauseButton).toBeInTheDocument();
    expect(pauseButton).toHaveTextContent('⏸️ Pause');
  });

  it('calls onPlayPause when play button is clicked', () => {
    const mockOnPlayPause = vi.fn();
    render(<ControlsPanel {...defaultProps} onPlayPause={mockOnPlayPause} />);
    const playButton = screen.getByTitle('Start execution');
    fireEvent.click(playButton);
    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when stop button is clicked', () => {
    const mockOnStop = vi.fn();
    render(<ControlsPanel {...defaultProps} status="executing" onStop={mockOnStop} />);
    const stopButton = screen.getByTitle('Stop execution');
    fireEvent.click(stopButton);
    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when reset button is clicked', () => {
    const mockOnReset = vi.fn();
    render(<ControlsPanel {...defaultProps} status="completed" onReset={mockOnReset} />);
    const resetButton = screen.getByTitle('Reset execution');
    fireEvent.click(resetButton);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('calls onSpeedChange when speed slider changes', () => {
    const mockOnSpeedChange = vi.fn();
    render(<ControlsPanel {...defaultProps} onSpeedChange={mockOnSpeedChange} />);
    const speedSlider = screen.getByTitle('Execution speed: 1x');
    fireEvent.change(speedSlider, { target: { value: '2.0' } });
    expect(mockOnSpeedChange).toHaveBeenCalledWith(2.0);
  });

  it('disables controls when not enabled', () => {
    render(<ControlsPanel {...defaultProps} enabled={false} />);
    const playButton = screen.getByTitle('Start execution');
    expect(playButton).toBeDisabled();
  });

  it('shows step mode toggle', () => {
    render(<ControlsPanel {...defaultProps} />);
    expect(screen.getByTitle('Toggle step-by-step execution')).toBeInTheDocument();
  });

  it('enables step button when step mode is active', () => {
    render(<ControlsPanel {...defaultProps} stepMode={true} />);
    const stepButton = screen.getByTitle('Execute next step');
    expect(stepButton).not.toBeDisabled();
  });
});