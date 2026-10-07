import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResponsiveActions, ResponsiveActionsProvider, NavbarActions } from '../ResponsiveActions';

let isMobile = true;
mock.module('../../hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <ResponsiveActionsProvider onSearch={() => {}}>
        {/* NavbarActions mirrors its real mount point beside the cast button. */}
        <div data-testid="app-navbar">
          <NavbarActions />
        </div>
        {children}
      </ResponsiveActionsProvider>
    </MemoryRouter>
  );
}

describe('ResponsiveActions navbar slot', () => {
  afterEach(() => {
    cleanup();
    isMobile = true;
  });

  it('pins the navbar action beside the cast button on mobile instead of the dock', () => {
    render(
      <Shell>
        <ResponsiveActions navbar={<button>Edit</button>} />
      </Shell>,
    );

    const navbar = screen.getByTestId('app-navbar');
    expect(navbar.querySelector('button')?.textContent).toBe('Edit');
    // The dock never receives it: no other Edit button mounts anywhere else.
    expect(screen.getAllByText('Edit')).toHaveLength(1);
  });

  it('renders the navbar action inline in the page header on desktop', () => {
    isMobile = false;
    render(
      <Shell>
        <ResponsiveActions navbar={<button>Edit</button>} />
      </Shell>,
    );

    // Desktop navbar target renders nothing (registrations are mobile-only);
    // the action shows inline in the page's own actions row instead.
    expect(screen.getByTestId('app-navbar').querySelector('button')).toBeNull();
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('surfaces the most recent page registration when several are mounted', () => {
    render(
      <Shell>
        <ResponsiveActions navbar={<button>First</button>} />
        <ResponsiveActions navbar={<button>Second</button>} />
      </Shell>,
    );

    const navbar = screen.getByTestId('app-navbar');
    expect(navbar.textContent).toBe('Second');
  });

  it('renders nothing when the active page pins no navbar action', () => {
    render(
      <Shell>
        <ResponsiveActions navbar={<button>Edit</button>} />
        <ResponsiveActions />
      </Shell>,
    );

    expect(screen.getByTestId('app-navbar').textContent).toBe('');
  });
});

describe('ResponsiveActions dock trigger', () => {
  afterEach(() => {
    cleanup();
  });

  it('hides the ⋮ when the sheet has no rows; when rows exist, ⋮ sits last with the sheet above it', () => {
    const { rerender } = render(
      <Shell>
        {/* Children that render nothing (e.g. mobile-suppressed page bars):
            the sheet would be empty, so the ⋮ must not appear at all —
            matching the sticky header's ⋮. */}
        <ResponsiveActions>{false}</ResponsiveActions>
        <ResponsiveActions fallback label="Page options" />
      </Shell>,
    );
    expect(screen.queryByTestId('actions-overflow')).toBeNull();

    rerender(
      <Shell>
        <ResponsiveActions fallback label="Page options">
          <button>Download</button>
        </ResponsiveActions>
      </Shell>,
    );

    const trigger = screen.getByTestId('actions-overflow');
    const dock = trigger.closest('.fixed.z-40')!;
    // Stack top→bottom: buttons (primary + search), sheet, ⋮ at the corner.
    expect(dock.lastElementChild).toBe(trigger);
    const sheet = dock.querySelector('[role="dialog"]')!;
    expect(sheet).not.toBeNull();
    expect(sheet.hidden).toBe(true);
    expect([...dock.children].indexOf(sheet)).toBeLessThan([...dock.children].indexOf(trigger));
  });
});

describe('ResponsiveActions dock scroll auto-hide', () => {
  const scrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
  const visualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');

  // jsdom never fires layout scroll events; dispatch manually. The dock
  // reads window.scrollY, so no layout engine is needed.
  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: y });
    act(() => {
      window.dispatchEvent(new window.Event('scroll'));
    });
  }

  const dockIsHidden = () => screen.getByTestId('actions-dock').className.includes('invisible');

  afterEach(() => {
    cleanup();
    isMobile = true;
    if (scrollYDescriptor) Object.defineProperty(window, 'scrollY', scrollYDescriptor);
    else Reflect.deleteProperty(window, 'scrollY');
    if (visualViewportDescriptor) Object.defineProperty(window, 'visualViewport', visualViewportDescriptor);
    else Reflect.deleteProperty(window, 'visualViewport');
  });

  it('hides on scroll down, reveals on scroll up or at the top, ignores jitter under 8px', () => {
    scrollTo(0);
    render(
      <Shell>
        <ResponsiveActions fallback label="Page options">
          <button>Download</button>
        </ResponsiveActions>
      </Shell>,
    );
    expect(dockIsHidden()).toBe(false);

    scrollTo(5); // below the 8px threshold: no state change
    expect(dockIsHidden()).toBe(false);

    scrollTo(100); // well past the threshold, heading down
    expect(dockIsHidden()).toBe(true);

    scrollTo(92); // heading back up
    expect(dockIsHidden()).toBe(false);

    scrollTo(300); // down again…
    expect(dockIsHidden()).toBe(true);
    scrollTo(0); // …and home: top of page always shows the dock
    expect(dockIsHidden()).toBe(false);
  });

  it('stays visible while the overflow sheet is open', () => {
    scrollTo(0);
    render(
      <Shell>
        <ResponsiveActions fallback label="Page options">
          <button>Download</button>
        </ResponsiveActions>
      </Shell>,
    );

    // Open the sheet, then scroll down: the sheet must stay reachable.
    fireEvent.click(screen.getByTestId('actions-overflow'));
    scrollTo(100);
    expect(dockIsHidden()).toBe(false);
  });

  it('stays visible while the on-screen keyboard lifts the viewport', () => {
    // Stub a visualViewport shrunk by the keyboard (jsdom has none).
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { height: 300, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
    });
    scrollTo(0);
    render(
      <Shell>
        <ResponsiveActions fallback label="Page options">
          <button>Download</button>
        </ResponsiveActions>
      </Shell>,
    );

    scrollTo(100); // keyboard up: keyboard lift wins over scroll direction
    expect(dockIsHidden()).toBe(false);
  });
});
