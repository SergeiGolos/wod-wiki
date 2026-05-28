import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { TrackViewShell } from '../TrackViewShell';

describe('TrackViewShell — Accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  const leftPanel = <div data-testid="left">Left Panel</div>;
  const rightPanel = <div data-testid="right">Right Panel</div>;

  // ── Landmark regions ──

  it('uses semantic container elements for panels', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    const shell = container.firstChild as HTMLElement;
    expect(shell.tagName.toLowerCase()).toBe('div');
  });

  it('applies panel IDs for ARIA landmark targeting', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelId="track-visual-panel"
        rightPanelId="track-clock-panel"
      />,
    );

    expect(container.querySelector('#track-visual-panel')).toBeTruthy();
    expect(container.querySelector('#track-clock-panel')).toBeTruthy();
  });

  // ── Responsive focus management ──

  it('does not trap focus in either layout mode', () => {
    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={rightPanel} />,
    );

    // Shell is a passive layout container — it has no tabIndex, so it does
    // not participate in tab order or trap focus.
    const shell = container.firstChild as HTMLElement;
    expect(shell.tabIndex).toBe(-1);
  });

  it('left panel receives keyboard focus when its children are interactive', () => {
    const interactiveLeft = (
      <button data-testid="left-btn" type="button">Left Action</button>
    );

    const { container } = render(
      <TrackViewShell leftPanel={interactiveLeft} rightPanel={rightPanel} />,
    );

    const leftBtn = container.querySelector('[data-testid="left-btn"]') as HTMLButtonElement;
    expect(leftBtn.tabIndex).toBe(0);
  });

  it('right panel receives keyboard focus when its children are interactive', () => {
    const interactiveRight = (
      <button data-testid="right-btn" type="button">Right Action</button>
    );

    const { container } = render(
      <TrackViewShell leftPanel={leftPanel} rightPanel={interactiveRight} />,
    );

    const rightBtn = container.querySelector('[data-testid="right-btn"]') as HTMLButtonElement;
    expect(rightBtn.tabIndex).toBe(0);
  });

  // ── Failing tests: accessibility gaps to fix ──

  it('has aria-label on panel containers when IDs are provided (red phase)', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelId="track-visual-panel"
        rightPanelId="track-clock-panel"
      />,
    );

    const left = container.querySelector('#track-visual-panel');
    const right = container.querySelector('#track-clock-panel');

    expect(left?.getAttribute('aria-label')).toBeTruthy();
    expect(right?.getAttribute('aria-label')).toBeTruthy();
  });

  it('marks panel containers as regions when IDs are provided (red phase)', () => {
    const { container } = render(
      <TrackViewShell
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelId="track-visual-panel"
        rightPanelId="track-clock-panel"
      />,
    );

    const left = container.querySelector('#track-visual-panel');
    const right = container.querySelector('#track-clock-panel');

    expect(left?.getAttribute('role')).toBe('region');
    expect(right?.getAttribute('role')).toBe('region');
  });
});
