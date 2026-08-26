import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ResultListItem } from './ResultListItem';

describe('ResultListItem', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const defaultProps = {
    timeLabel: '10:30 AM',
    title: 'Morning Workout',
    subtitle: '45 minutes',
  };

  describe('Basic rendering', () => {
    it('renders time label', () => {
      render(<ResultListItem {...defaultProps} />);

      expect(screen.getByText('10:30 AM')).toBeDefined();
    });

    it('renders title', () => {
      render(<ResultListItem {...defaultProps} />);

      expect(screen.getByText('Morning Workout')).toBeDefined();
    });

    it('renders subtitle when provided', () => {
      render(<ResultListItem {...defaultProps} />);

      expect(screen.getByText('45 minutes')).toBeDefined();
    });

    it('does not render subtitle when not provided', () => {
      const propsWithoutSubtitle = {
        timeLabel: '10:30 AM',
        title: 'Morning Workout',
      };

      const { container } = render(<ResultListItem {...propsWithoutSubtitle} />);

      expect(screen.queryByText('45 minutes')).toBeNull();
    });
  });

  describe('Icons', () => {
    it('renders ClockIcon', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const clockIcon = container.querySelector('.lucide-clock');
      expect(clockIcon).toBeTruthy();
    });

    it('renders CheckCircleIcon', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const checkIcon = container.querySelector('.lucide-circle-check-big');
      expect(checkIcon).toBeTruthy();
    });

    it('applies correct styling to ClockIcon', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const clockIcon = container.querySelector('.lucide-clock');
      const clockClasses = clockIcon?.getAttribute('class') || '';
      expect(clockClasses).toContain('size-2.5');
      expect(clockClasses).toContain('text-muted-foreground/40');
    });

    it('applies correct styling to CheckCircleIcon', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const checkIcon = container.querySelector('.lucide-circle-check-big');
      const checkClasses = checkIcon?.getAttribute('class') || '';
      expect(checkClasses).toContain('size-3.5');
      expect(checkClasses).toContain('text-emerald-500');
    });
  });

  describe('Click handling', () => {
    it('calls onClick when clicked', () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };

      const { container } = render(
        <ResultListItem {...defaultProps} onClick={handleClick} />
      );

      const button = container.querySelector('button');
      fireEvent.click(button!);

      expect(clicked).toBe(true);
    });

    it('does not throw error when clicked without onClick', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');

      expect(() => {
        fireEvent.click(button!);
      }).not.toThrow();
    });
  });

  describe('Layout and structure', () => {
    it('renders as button element', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('applies flex layout', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('flex');
    });

    it('applies items-center for vertical alignment', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('items-center');
    });

    it('sets width to full', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('w-full');
    });

    it('aligns text to the left', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('text-left');
    });
  });

  describe('Time section', () => {
    it('applies fixed width to time container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const timeContainer = container.querySelector('.w-14');
      expect(timeContainer).toBeTruthy();
    });

    it('aligns time text to the right', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const timeContainer = container.querySelector('.text-right');
      expect(timeContainer).toBeTruthy();
    });

    it('applies tabular nums to time label', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const timeLabel = container.querySelector('.tabular-nums');
      expect(timeLabel).toBeTruthy();
    });

    it('applies correct font styling to time label', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const timeLabel = container.querySelector('.tabular-nums');
      expect(timeLabel?.className).toContain('text-[10px]');
      expect(timeLabel?.className).toContain('font-black');
    });
  });

  describe('Status icon section', () => {
    it('renders status icon in a rounded container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const statusContainer = container.querySelector('.rounded-lg');
      expect(statusContainer).toBeTruthy();
    });

    it('applies muted background to status container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const statusContainer = container.querySelector('.bg-muted');
      expect(statusContainer).toBeTruthy();
    });

    it('applies fixed size to status container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const statusContainer = container.querySelector('.size-8');
      expect(statusContainer).toBeTruthy();
    });

    it('centers icon in status container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const statusContainer = container.querySelector('.rounded-lg');
      expect(statusContainer?.className).toContain('flex');
      expect(statusContainer?.className).toContain('items-center');
      expect(statusContainer?.className).toContain('justify-center');
    });
  });

  describe('Text section', () => {
    it('applies flex-1 to take remaining space', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const textSection = container.querySelector('.flex-1');
      expect(textSection).toBeTruthy();
    });

    it('applies min-w-0 to allow text truncation', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const textSection = container.querySelector('.min-w-0');
      expect(textSection).toBeTruthy();
    });

    it('renders title in heading element', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const heading = container.querySelector('h3');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Morning Workout');
    });

    it('truncates title text', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const heading = container.querySelector('h3');
      expect(heading?.className).toContain('truncate');
    });

    it('renders subtitle in paragraph element', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeTruthy();
      expect(paragraph?.textContent).toBe('45 minutes');
    });

    it('truncates subtitle text', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const paragraph = container.querySelector('p');
      expect(paragraph?.className).toContain('truncate');
    });
  });

  describe('Styling and interactions', () => {
    it('applies hover effect', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:bg-muted/40');
    });

    it('applies transition classes', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('transition-colors');
    });

    it('applies group class for child hover effects', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('group');
    });

    it('applies group-hover effect to status container', () => {
      const { container } = render(<ResultListItem {...defaultProps} />);

      const statusContainer = container.querySelector('.rounded-lg');
      expect(statusContainer?.className).toContain('group-hover:bg-background');
    });
  });

  describe('Edge cases', () => {
    it('handles empty time label', () => {
      const propsWithEmptyTime = {
        ...defaultProps,
        timeLabel: '',
      };

      const { container } = render(<ResultListItem {...propsWithEmptyTime} />);

      // Should still render without error
      const timeSpan = container.querySelector('.tabular-nums');
      expect(timeSpan).toBeTruthy();
      expect(timeSpan?.textContent).toBe('');
    });

    it('handles very long title', () => {
      const longTitle = 'A'.repeat(200);
      const propsWithLongTitle = {
        ...defaultProps,
        title: longTitle,
      };

      render(<ResultListItem {...propsWithLongTitle} />);

      // Should truncate the title
      const heading = screen.getByText(longTitle);
      expect(heading).toBeDefined();
    });

    it('handles very long subtitle', () => {
      const longSubtitle = 'B'.repeat(200);
      const propsWithLongSubtitle = {
        ...defaultProps,
        subtitle: longSubtitle,
      };

      render(<ResultListItem {...propsWithLongSubtitle} />);

      // Should truncate the subtitle
      const paragraph = screen.getByText(longSubtitle);
      expect(paragraph).toBeDefined();
    });

    it('handles special characters in text', () => {
      const propsWithSpecialChars = {
        ...defaultProps,
        title: 'Workout: "High Intensity" & More!',
        subtitle: '45 min • 300 kcal',
      };

      render(<ResultListItem {...propsWithSpecialChars} />);

      expect(screen.getByText('Workout: "High Intensity" & More!')).toBeDefined();
      expect(screen.getByText('45 min • 300 kcal')).toBeDefined();
    });
  });
});
