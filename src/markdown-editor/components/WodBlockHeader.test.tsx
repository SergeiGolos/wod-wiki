/**
 * Tests for WodBlockHeader component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WodBlockHeader } from './WodBlockHeader';

describe('WodBlockHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('displays custom label when provided', () => {
    render(<WodBlockHeader label="Fran" index={1} />);
    expect(screen.getByText('Fran')).toBeTruthy();
  });

  it('displays workout index when no label provided', () => {
    render(<WodBlockHeader index={2} />);
    expect(screen.getByText('Workout 2')).toBeTruthy();
  });

  it('renders Record and Track buttons', () => {
    render(<WodBlockHeader index={1} />);
    expect(screen.getByTitle('Record workout results')).toBeTruthy();
    expect(screen.getByTitle('Track workout progress')).toBeTruthy();
  });

  it('calls onRecord callback when Record button clicked', () => {
    const onRecord = vi.fn();
    render(<WodBlockHeader index={1} onRecord={onRecord} />);
    
    fireEvent.click(screen.getByTitle('Record workout results'));
    expect(onRecord).toHaveBeenCalledTimes(1);
  });

  it('calls onTrack callback when Track button clicked', () => {
    const onTrack = vi.fn();
    render(<WodBlockHeader index={1} onTrack={onTrack} />);
    
    fireEvent.click(screen.getByTitle('Track workout progress'));
    expect(onTrack).toHaveBeenCalledTimes(1);
  });

  it('applies active styling when isActive is true', () => {
    const { container } = render(<WodBlockHeader index={1} isActive={true} />);
    const header = container.querySelector('.wod-block-header');
    expect(header?.className).toContain('bg-blue-50');
    expect(header?.className).toContain('border-blue-300');
  });

  it('applies inactive styling when isActive is false', () => {
    const { container } = render(<WodBlockHeader index={1} isActive={false} />);
    const header = container.querySelector('.wod-block-header');
    expect(header?.className).toContain('bg-gray-50');
    expect(header?.className).toContain('border-gray-300');
  });
});
