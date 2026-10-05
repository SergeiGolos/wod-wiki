import { describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { NavigationDrawerProvider, useCloseNavigationDrawer } from '../NavigationDrawerContext';

function Probe({ onClose }: { onClose?: (close: () => void) => void }) {
  const close = useCloseNavigationDrawer();
  onClose?.(close);
  return null;
}

describe('NavigationDrawerContext', () => {
  it('defaults to a no-op outside the provider (desktop)', () => {
    let captured: (() => void) | undefined;
    render(<Probe onClose={(close) => (captured = close)} />);
    expect(typeof captured).toBe('function');
    expect(() => captured?.()).not.toThrow();
    cleanup();
  });

  it('supplies the drawer close inside NavigationDrawerProvider', () => {
    let captured: (() => void) | undefined;
    const close = () => {};
    render(
      <NavigationDrawerProvider close={close}>
        <Probe onClose={(c) => (captured = c)} />
      </NavigationDrawerProvider>,
    );
    expect(captured).toBe(close);
    cleanup();
  });
});
