import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { FocusedDialog } from './FocusedDialog';

describe('FocusedDialog', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('keeps the minimal variant theme-aware instead of forcing light mode', () => {
    const { container } = render(
      <FocusedDialog title="Workout Review" onClose={() => {}} variant="minimal">
        <div>Review content</div>
      </FocusedDialog>,
    );

    expect(screen.getByText('Workout Review')).toBeDefined();

    const portalRoot = container.ownerDocument.body.querySelector('.fixed.inset-0');
    expect(portalRoot).toBeTruthy();
    expect(portalRoot?.className).toContain('bg-background');
    expect(portalRoot?.className).toContain('text-foreground');
    expect(portalRoot?.className).not.toContain('bg-white');
    expect(portalRoot?.className).not.toContain('text-zinc-950');

    const header = screen.getByText('Workout Review').closest('div');
    expect(header?.className).toContain('bg-muted/10');
    expect(header?.className).not.toContain('bg-zinc-50/50');
  });
});