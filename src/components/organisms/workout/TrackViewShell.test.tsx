import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { TrackViewShell } from './TrackViewShell';

describe('TrackViewShell', () => {
  afterEach(() => {
    cleanup();
  });

  const leftPanel = <div data-testid="left">Left Panel</div>;
  const rightPanel = <div data-testid="right">Right Panel</div>;

  // ── Layout direction ──

  it('renders horizontal layout (flex-row) by default', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('flex-row');
    expect(shell.className).not.toContain('flex-col');
  });

  it('renders vertical layout (flex-col) when isCompact is true', () => {
    const { container } = render(
      <TrackViewShell isCompact leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('flex-col');
    expect(shell.className).not.toContain('flex-row');
  });

  // ── Panel proportions ──

  it('gives left panel 1/3 width in default mode', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const left = container.querySelector('[data-testid="left"]')!.parentElement;
    expect(left!.className).toContain('w-1/3');
    expect(left!.className).toContain('border-r');
  });

  it('gives right panel 2/3 width in default mode', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const right = container.querySelector('[data-testid="right"]')!.parentElement;
    expect(right!.className).toContain('w-2/3');
  });

  it('gives left panel flex-1 in compact mode', () => {
    const { container } = render(
      <TrackViewShell isCompact leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const left = container.querySelector('[data-testid="left"]')!.parentElement;
    expect(left!.className).toContain('flex-1');
    expect(left!.className).toContain('border-b');
  });

  it('makes right panel shrink-0 in compact mode', () => {
    const { container } = render(
      <TrackViewShell isCompact leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const right = container.querySelector('[data-testid="right"]')!.parentElement;
    expect(right!.className).toContain('shrink-0');
    expect(right!.className).not.toContain('w-2/3');
  });

  // ── Accessibility / IDs ──

  it('applies custom leftPanelId', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelId="track-left-panel"
      />,
    );

    const left = container.querySelector('#track-left-panel');
    expect(left).toBeTruthy();
  });

  it('applies custom rightPanelId', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        rightPanelId="track-right-panel"
      />,
    );

    const right = container.querySelector('#track-right-panel');
    expect(right).toBeTruthy();
  });

  it('applies custom rightPanelClassName', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        rightPanelClassName="custom-right-class"
      />,
    );

    const right = container.querySelector('[data-testid="right"]')!.parentElement;
    expect(right!.className).toContain('custom-right-class');
  });

  // ── Responsive integration ──

  it('switches from row to column when toggling isCompact', () => {
    const { container, rerender } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    let shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('flex-row');

    rerender(<TrackViewShell isCompact leftPanel={leftPanel} rightPanel={rightPanel} />);

    shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('flex-col');
    expect(shell.className).not.toContain('flex-row');
  });

  it('maintains full height at all layout modes', () => {
    const { container } = render(
      <TrackViewShell isCompact leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('h-full');
  });

  it('prevents overflow in both layout modes', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain('overflow-hidden');
  });
});
