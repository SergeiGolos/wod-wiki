import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WqlQueryInspectorModal } from '../src/blocks/WqlQueryInspectorModal';

afterEach(cleanup);

it('a rejected block write keeps the edited draft open and leaves persisted source intact', async () => {
  const original = 'find:segment{effort:snatch} by {effort} in lb | limit 5';
  let persisted = original;
  const close = vi.fn();
  const save = vi.fn(async (query: string) => {
    if (save.mock.calls.length === 1) throw new Error('Storage refused write');
    persisted = query;
  });
  render(<WqlQueryInspectorModal isOpen onClose={close} initialQuery={original} onApply={save} />);
  fireEvent.change(screen.getByLabelText('Search text or WQL'), { target: { value: 'last 2w' } });
  const draft = screen.getByTestId('wql-inspector-draft').textContent;
  fireEvent.click(screen.getByTestId('wql-inspector-apply'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Storage refused write'));
  expect(persisted).toBe(original);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByTestId('wql-inspector-draft').textContent).toBe(draft);
  fireEvent.click(screen.getByTestId('wql-inspector-apply'));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(persisted).toBe('find:segment{effort:snatch} by {effort} in lb last 2w | limit 5');
});
