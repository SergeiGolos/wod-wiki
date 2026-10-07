import { afterEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';

function renderNested() {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>Parent trigger</DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Non-item region hosting a nested menu — the L3 ⋯ pattern
            (WqlWindowPicker inside the stream-controls row). */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger>Nested trigger</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Nested item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenuItem>Parent item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe('DropdownMenu nested portals', () => {
  afterEach(() => {
    cleanup();
  });

  // The outside-click listener attaches on a macrotask after opening —
  // yield before firing mousedown so it is actually registered.
  const flushListener = () =>
    act(() => {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 10);
      return promise;
    });

  it('keeps the parent menu open when the user clicks inside a nested menu portal', async () => {
    renderNested();
    act(() => {
      screen.getByText('Parent trigger').click();
    });
    act(() => {
      screen.getByText('Nested trigger').click();
    });
    await flushListener();

    // The nested content is portaled to <body>, outside the parent's
    // content node — mousedown there must not read as an outside click.
    fireEvent.mouseDown(screen.getByText('Nested item'));
    expect(screen.getByText('Parent item')).toBeDefined();

    act(() => {
      screen.getByText('Nested item').click();
    });
    // The nested action still runs and the parent survives its close.
    expect(screen.getByText('Parent item')).toBeDefined();
  });

  it('still closes the parent on a genuine outside click', async () => {
    renderNested();
    act(() => {
      screen.getByText('Parent trigger').click();
    });
    await flushListener();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Parent item')).toBeNull();
  });

  it('closes the nested menu when the user clicks back into the parent menu', async () => {
    renderNested();
    act(() => {
      screen.getByText('Parent trigger').click();
    });
    act(() => {
      screen.getByText('Nested trigger').click();
    });
    await flushListener();
    expect(screen.getByText('Nested item')).toBeDefined();

    // Clicking the parent menu region (not the nested portal) is an
    // outside click for the NESTED menu — the ancestor's portal chain does
    // not contain the nested menu's id.
    fireEvent.mouseDown(screen.getByText('Parent item'));
    expect(screen.queryByText('Nested item')).toBeNull();
    // The parent menu itself survives.
    expect(screen.getByText('Parent item')).toBeDefined();
  });
});
