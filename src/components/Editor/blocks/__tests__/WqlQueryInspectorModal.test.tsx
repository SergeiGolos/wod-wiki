import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { WqlQueryInspectorModal } from '../WqlQueryInspectorModal';

afterEach(() => {
  cleanup();
});

describe('WqlQueryInspectorModal', () => {
  it('renders modal when isOpen is true with initial query composed into clauses', () => {
    render(
      <WqlQueryInspectorModal
        isOpen={true}
        onClose={() => {}}
        initialQuery="sum:totalVolume{discipline:strength}"
        onApply={() => {}}
      />,
    );

    expect(screen.getByTestId('query-inspector-modal')).toBeDefined();
    expect(screen.getByTestId('wql-composer')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(
      <WqlQueryInspectorModal
        isOpen={false}
        onClose={() => {}}
        initialQuery="sum:totalVolume{}"
        onApply={() => {}}
      />,
    );

    expect(screen.queryByTestId('query-inspector-modal')).toBeNull();
  });

  it('compiles clauses and calls onApply with updated query string when Apply is clicked', async () => {
    const onApply = mock((_query: string) => {});
    const onClose = mock(() => {});

    render(
      <WqlQueryInspectorModal
        isOpen={true}
        onClose={onClose}
        initialQuery="sum:totalVolume{discipline:strength}"
        onApply={onApply}
      />,
    );

    const applyButton = screen.getByTestId('apply-query-inspector');
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('sum:totalVolume{discipline:strength}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Apply button when composer query is invalid', async () => {
    render(
      <WqlQueryInspectorModal
        isOpen={true}
        onClose={() => {}}
        initialQuery="sum:totalVolume{}"
        onApply={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId('token-slot-remove-metric'));

    await waitFor(() => {
      const badge = screen.getByTestId('wql-validity-badge');
      expect(badge.getAttribute('data-valid')).toBe('false');
    });

    const applyButton = screen.getByTestId('apply-query-inspector');
    expect(applyButton.getAttribute('disabled')).not.toBeNull();
  });
});
