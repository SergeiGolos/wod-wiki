/**
 * StickyNavPanel.test.tsx — Unit tests for StickyNavPanel component.
 *
 * Tests cover:
 * - Rendering navigation buttons with correct labels
 * - Active section highlighting
 * - Visual variants (hero-follow, top-fixed)
 * - User interactions (click events, nav action dispatching)
 * - Accessibility attributes (ARIA roles, button states)
 * - Edge cases (empty activations, null activeSection)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { StickyNavPanel } from '../StickyNavPanel';
import type { INavActivation } from '@/nav/navTypes';

describe('StickyNavPanel', () => {
  const mockDeps = {
    scrollToSection: vi.fn(),
    navigate: vi.fn(),
  };

  const mockActivations: INavActivation[] = [
    { id: 'overview', label: 'Overview', action: { type: 'scroll', target: 'overview' } },
    { id: 'details', label: 'Details', action: { type: 'scroll', target: 'details' } },
    { id: 'examples', label: 'Examples', action: { type: 'scroll', target: 'examples' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render all navigation buttons', () => {
      render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Examples' })).toBeTruthy();
    });

    it('should render navigation with nav element', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const nav = container.querySelector('nav');
      expect(nav).toBeTruthy();
      expect(nav?.className).toContain('lg:sticky');
      expect(nav?.className).toContain('z-20');
    });

    it('should handle empty activations array', () => {
      const { container } = render(
        <StickyNavPanel
          activations={[]}
          activeSection=""
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('Active Section Highlighting', () => {
    it('should apply active styles to the currently active section', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="details"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const activeButton = screen.getByRole('button', { name: 'Details' });
      expect(activeButton.className).toContain('bg-primary');
      expect(activeButton.className).toContain('text-primary-foreground');
      expect(activeButton.className).toContain('ring-primary/30');
    });

    it('should apply inactive styles to non-active sections', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const inactiveButton = screen.getByRole('button', { name: 'Details' });
      expect(inactiveButton.className).toContain('bg-muted/50');
      expect(inactiveButton.className).toContain('text-muted-foreground');
      expect(inactiveButton.className).toContain('ring-transparent');
    });

    it('should handle undefined activeSection gracefully', () => {
      render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection=""
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      // All buttons should be inactive
      mockActivations.forEach((activation) => {
        const button = screen.getByRole('button', { name: activation.label });
        expect(button.className).toContain('text-muted-foreground');
      });
    });
  });

  describe('Visual Variants', () => {
    it('should apply top-fixed variant styles', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('lg:top-0');
      expect(nav?.className).toContain('lg:sticky');
    });

    it('should apply hero-follow variant styles', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="hero-follow"
          deps={mockDeps}
        />
      );

      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('lg:top-[104px]');
      expect(nav?.className).toContain('lg:sticky');
    });
  });

  describe('User Interactions', () => {
    it('should dispatch nav action when button is clicked', () => {
      const mockScrollToSection = vi.fn();
      const deps = { ...mockDeps, scrollToSection: mockScrollToSection };

      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={deps}
        />
      );

      const button = screen.getByRole('button', { name: 'Details' });
      button.click();

      // The executeNavAction should be called with the action from the activation
      expect(mockScrollToSection).toHaveBeenCalled();
    });

    it('should handle multiple clicks without errors', () => {
      render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const button = screen.getByRole('button', { name: 'Details' });

      // Click multiple times
      button.click();
      button.click();
      button.click();

      expect(mockDeps.scrollToSection).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should render buttons with proper button role', () => {
      render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      mockActivations.forEach((activation) => {
        const button = screen.getByRole('button', { name: activation.label });
        expect(button).toBeTruthy();
      });
    });

    it('should preserve button labels exactly as provided', () => {
      render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Examples' })).toBeTruthy();
    });

    it('should apply whitespace-nowrap class to prevent text wrapping', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button.className).toContain('whitespace-nowrap');
      });
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
          className="custom-class"
        />
      );

      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('custom-class');
    });

    it('should apply base styling classes to nav element', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('flex');
      expect(nav?.className).toContain('items-center');
      expect(nav?.className).toContain('gap-1');
      expect(nav?.className).toContain('px-4');
      expect(nav?.className).toContain('py-2');
      expect(nav?.className).toContain('overflow-x-auto');
    });

    it('should apply button base styles', () => {
      const { container } = render(
        <StickyNavPanel
          activations={mockActivations}
          activeSection="overview"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('px-3');
      expect(button?.className).toContain('py-1.5');
      expect(button?.className).toContain('rounded-full');
      expect(button?.className).toContain('font-black');
      expect(button?.className).toContain('uppercase');
      expect(button?.className).toContain('tracking-[0.12em]');
      expect(button?.className).toContain('transition-all');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single activation', () => {
      const singleActivation: INavActivation[] = [
        { id: 'only', label: 'Only Section', action: { type: 'scroll', target: 'only' } },
      ];

      render(
        <StickyNavPanel
          activations={singleActivation}
          activeSection="only"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      expect(screen.getByRole('button', { name: 'Only Section' })).toBeTruthy();
      const { container } = render(
        <StickyNavPanel
          activations={singleActivation}
          activeSection="only"
          variant="top-fixed"
          deps={mockDeps}
        />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);
    });

    it('should handle special characters in labels', () => {
      const specialActivations: INavActivation[] = [
        { id: 'test', label: 'Test & Demo', action: { type: 'scroll', target: 'test' } },
        { id: 'test2', label: 'Café & Restaurant', action: { type: 'scroll', target: 'test2' } },
      ];

      render(
        <StickyNavPanel
          activations={specialActivations}
          activeSection="test"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      expect(screen.getByRole('button', { name: 'Test & Demo' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Café & Restaurant' })).toBeTruthy();
    });

    it('should handle very long labels with whitespace-nowrap', () => {
      const longActivations: INavActivation[] = [
        {
          id: 'long',
          label: 'This Is A Very Long Section Label That Should Not Wrap',
          action: { type: 'scroll', target: 'long' },
        },
      ];

      const { container } = render(
        <StickyNavPanel
          activations={longActivations}
          activeSection="long"
          variant="top-fixed"
          deps={mockDeps}
        />
      );

      const button = screen.getByRole('button', { name: /This Is A Very Long Section Label/ });
      expect(button).toBeTruthy();
      expect(button.className).toContain('whitespace-nowrap');
    });
  });
});
