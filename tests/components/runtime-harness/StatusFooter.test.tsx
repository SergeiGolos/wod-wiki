import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusFooter } from '../../../src/runtime-test-bench/components/StatusFooter';
import { ExecutionStatus } from '../../../src/runtime-test-bench/types/interfaces';

describe('StatusFooter', () => {
  const defaultProps = {
    status: 'idle' as ExecutionStatus,
  };

  it('renders with idle status', () => {
    render(<StatusFooter {...defaultProps} />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('displays status message when provided', () => {
    render(<StatusFooter {...defaultProps} statusMessage="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('shows cursor position when provided', () => {
    render(<StatusFooter {...defaultProps} lineNumber={5} columnNumber={10} />);
    expect(screen.getByText('6:11')).toBeInTheDocument();
  });

  it('shows block count when provided', () => {
    render(<StatusFooter {...defaultProps} blockCount={3} />);
    expect(screen.getByText('Blocks')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('formats elapsed time correctly', () => {
    render(<StatusFooter {...defaultProps} elapsedTime={65000} />); // 1m 5s
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('shows executing status with green color', () => {
    render(<StatusFooter {...defaultProps} status="executing" />);
    const statusElement = screen.getByText('Running');
    expect(statusElement).toHaveClass('text-green-400');
  });

  it('shows paused status with yellow color', () => {
    render(<StatusFooter {...defaultProps} status="paused" />);
    const statusElement = screen.getByText('Paused');
    expect(statusElement).toHaveClass('text-yellow-400');
  });

  it('shows completed status with blue color', () => {
    render(<StatusFooter {...defaultProps} status="completed" />);
    const statusElement = screen.getByText('Completed');
    expect(statusElement).toHaveClass('text-blue-400');
  });

  it('shows error status with red color', () => {
    render(<StatusFooter {...defaultProps} status="error" />);
    const statusElement = screen.getByText('Error');
    expect(statusElement).toHaveClass('text-red-400');
  });

  it('calls onStatusClick when status is clicked', () => {
    const mockOnStatusClick = vi.fn();
    render(<StatusFooter {...defaultProps} onStatusClick={mockOnStatusClick} />);
    const statusElement = screen.getByText('Idle');
    fireEvent.click(statusElement);
    expect(mockOnStatusClick).toHaveBeenCalledTimes(1);
  });

  it('shows fallback values when data is missing', () => {
    render(<StatusFooter {...defaultProps} />);
    expect(screen.getByText('--:--')).toBeInTheDocument(); // cursor and time
  });

  it('displays status indicator dot', () => {
    render(<StatusFooter {...defaultProps} status="executing" />);
    const indicator = document.querySelector('.w-2.h-2');
    expect(indicator).toHaveClass('bg-green-400');
  });
});