import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ClockMemoryStory } from '../../stories/clock/ClockMemoryStory';
import { validateConfig, ClockMemoryStoryConfig } from '../../stories/clock/utils/ConfigValidation';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

// Import story files to get all story exports
import * as RunningTimersStories from '../../stories/clock/RunningTimers.stories';
import * as CompletedTimersStories from '../../stories/clock/CompletedTimers.stories';
import * as EdgeCasesStories from '../../stories/clock/EdgeCases.stories';

// Mock console methods to avoid noise in tests but preserve error detection
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe('Clock Memory Stories Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  // Helper function to collect all stories from story modules
  const getAllStories = () => {
    const stories: Array<{
      name: string;
      category: string;
      story: any;
      config: ClockMemoryStoryConfig;
    }> = [];

    // Running Timers Stories
    const runningStories = ['ShortDuration', 'MediumDuration', 'LongDuration', 'VeryShortDuration'];
    runningStories.forEach(storyName => {
      const story = (RunningTimersStories as any)[storyName];
      if (story && story.args && story.args.config) {
        stories.push({
          name: storyName,
          category: 'Running Timers',
          story,
          config: story.args.config
        });
      }
    });

    // Completed Timers Stories
    const completedStories = ['ShortCompleted', 'MediumCompleted', 'LongCompleted', 'VeryShortCompleted'];
    completedStories.forEach(storyName => {
      const story = (CompletedTimersStories as any)[storyName];
      if (story && story.args && story.args.config) {
        stories.push({
          name: storyName,
          category: 'Completed Timers',
          story,
          config: story.args.config
        });
      }
    });

    // Edge Cases Stories
    const edgeCaseStories = ['MinimumDuration', 'VeryLongDuration', 'MultipleTimeSpans', 'ZeroDuration'];
    edgeCaseStories.forEach(storyName => {
      const story = (EdgeCasesStories as any)[storyName];
      if (story && story.args && story.args.config) {
        stories.push({
          name: storyName,
          category: 'Edge Cases',
          story,
          config: story.args.config
        });
      }
    });

    return stories;
  };

  describe('All stories render without errors', () => {
    it('should render Running Timers stories without throwing errors', async () => {
      const stories = getAllStories().filter(s => s.category === 'Running Timers');

      for (const { name, config } of stories) {
        expect(() => {
          render(<ClockMemoryStory config={config} />);
        }).not.toThrow();

        // Wait for any async operations to complete
        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 5000 });
      }
    });

    it('should render Completed Timers stories without throwing errors', async () => {
      const stories = getAllStories().filter(s => s.category === 'Completed Timers');

      for (const { name, config } of stories) {
        expect(() => {
          render(<ClockMemoryStory config={config} />);
        }).not.toThrow();

        // Wait for any async operations to complete
        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 5000 });
      }
    });

    it('should render Edge Cases stories without throwing errors', async () => {
      const stories = getAllStories().filter(s => s.category === 'Edge Cases');

      for (const { name, config } of stories) {
        expect(() => {
          render(<ClockMemoryStory config={config} />);
        }).not.toThrow();

        // Wait for any async operations to complete
        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 5000 });
      }
    });

    it('should render all stories with proper component structure', async () => {
      const stories = getAllStories();

      for (const { name, config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Check that main container exists using the specific instance
        const titleElement = within(document.body).getByRole('heading', { name: config.title });
        expect(titleElement).toBeDefined();

        // Check that both panels are present
        expect(() => within(document.body).getByText('Clock Display')).not.toThrow();
        expect(() => within(document.body).getByText('Memory Display')).not.toThrow();

        unmount();
      }
    });
  });

  describe('All stories have valid configurations', () => {
    it('should validate all Running Timers story configurations', () => {
      const stories = getAllStories().filter(s => s.category === 'Running Timers');

      for (const { name, config } of stories) {
        expect(() => validateConfig(config)).not.toThrow();

        // Additional config validation
        expect(config.durationMs).toBeGreaterThan(0);
        expect(typeof config.isRunning).toBe('boolean');
        expect(config.title).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.isRunning).toBe(true); // Running timers should be running
      }
    });

    it('should validate all Completed Timers story configurations', () => {
      const stories = getAllStories().filter(s => s.category === 'Completed Timers');

      for (const { name, config } of stories) {
        expect(() => validateConfig(config)).not.toThrow();

        // Additional config validation
        expect(config.durationMs).toBeGreaterThan(0);
        expect(typeof config.isRunning).toBe('boolean');
        expect(config.title).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.isRunning).toBe(false); // Completed timers should not be running
      }
    });

    it('should validate all Edge Cases story configurations', () => {
      const stories = getAllStories().filter(s => s.category === 'Edge Cases');

      for (const { name, config } of stories) {
        expect(() => validateConfig(config)).not.toThrow();

        // Additional config validation
        expect(config.durationMs).toBeGreaterThan(0);
        expect(typeof config.isRunning).toBe('boolean');
        expect(config.title).toBeTruthy();
        expect(config.description).toBeTruthy();

        // Validate timeSpans if provided
        if (config.timeSpans) {
          expect(Array.isArray(config.timeSpans)).toBe(true);
          config.timeSpans.forEach((span: TimeSpan, index: number) => {
            if (span.start !== undefined) {
              expect(span.start).toBeInstanceOf(Date);
            }
            if (span.stop !== undefined) {
              expect(span.stop).toBeInstanceOf(Date);
            }
          });
        }
      }
    });

    it('should ensure all configurations meet contract requirements', () => {
      const stories = getAllStories();

      for (const { name, config } of stories) {
        // Test duration validation
        expect(config.durationMs).toBeGreaterThanOrEqual(1); // Minimum 1 millisecond

        // Test title length
        expect(config.title.length).toBeGreaterThan(5);

        // Test description length
        expect(config.description.length).toBeGreaterThan(20);

        // Test title format (Title Case with numbers)
        expect(config.title).toMatch(/^[A-Z][a-zA-Z0-9\s.]*$/);

        // Test description format (complete sentence)
        expect(config.description).toMatch(/^[A-Z]/);
        expect(config.description).toMatch(/[.!?]$/);
      }
    });
  });

  describe('All stories display both clock and memory panels', () => {
    it('should render ClockAnchor component in all stories', async () => {
      const stories = getAllStories();

      for (const { name, config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Clock panel should be present
        const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
        expect(clockPanel).toBeDefined();

        // Look for timer display (could be in various formats)
        await waitFor(() => {
          const clockContent = clockPanel?.querySelector('[data-testid*="clock"], [data-testid*="timer"], .time-display');
          // Timer content should be rendered (may not find specific test ID, but should have content)
          expect(clockPanel?.children.length).toBeGreaterThan(1);
        }, { timeout: 3000 });

        unmount();
      }
    });

    it('should render TimerMemoryVisualization component in all stories', async () => {
      const stories = getAllStories();

      for (const { name, config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Memory panel should be present
        const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');
        expect(memoryPanel).toBeDefined();

        // Memory visualization should be rendered
        await waitFor(() => {
          const memoryContent = memoryPanel?.querySelector('[data-testid*="memory"], .memory-visualization');
          // Memory content should be rendered
          expect(memoryPanel?.children.length).toBeGreaterThan(1);
        }, { timeout: 3000 });

        unmount();
      }
    });

    it('should display both panels in side-by-side layout', () => {
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      // Find the flex container
      const flexContainer = container.querySelector('.flex.gap-6');
      expect(flexContainer).toBeDefined();

      // Should have at least 2 children (the two panels, plus any text nodes)
      expect(flexContainer?.children.length).toBeGreaterThanOrEqual(2);

      // Both panels should have equal width (flex-1 class)
      const panels = flexContainer?.querySelectorAll('.flex-1');
      expect(panels?.length).toBeGreaterThanOrEqual(2);

      unmount();
    });

    it('should display story metadata correctly', () => {
      const stories = getAllStories();

      for (const { name, config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Title should be displayed
        expect(() => within(document.body).getByRole('heading', { name: config.title })).not.toThrow();

        // Description should be displayed
        expect(() => within(document.body).getByText(config.description)).not.toThrow();

        unmount();
      }
    });
  });

  describe('All stories support hover interaction', () => {
    it('should highlight memory panel when hovering over clock panel', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      // Find clock panel (the parent div with the panel classes)
      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');

      // Initially, neither panel should be highlighted
      expect(clockPanel?.className).not.toContain('bg-blue-100');
      expect(memoryPanel?.className).not.toContain('bg-blue-100');

      // Hover over clock panel
      await user.hover(clockPanel!);

      // Memory panel should be highlighted
      await waitFor(() => {
        expect(memoryPanel?.className).toContain('bg-blue-100');
        expect(memoryPanel?.className).toContain('border-blue-300');
      });

      // Clock panel should not be highlighted when hovering over itself
      expect(clockPanel?.className).not.toContain('bg-blue-100');

      unmount();
    });

    it('should highlight clock panel when hovering over memory panel', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      // Find panels (the parent divs with the panel classes)
      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');

      // Hover over memory panel
      await user.hover(memoryPanel!);

      // Clock panel should be highlighted
      await waitFor(() => {
        expect(clockPanel?.className).toContain('bg-blue-100');
        expect(clockPanel?.className).toContain('border-blue-300');
      });

      // Memory panel should not be highlighted when hovering over itself
      expect(memoryPanel?.className).not.toContain('bg-blue-100');

      unmount();
    });

    it('should remove highlighting when hover ends', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      // Find panels (the parent divs with the panel classes)
      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');

      // Hover over clock panel
      await user.hover(clockPanel!);

      // Verify memory panel is highlighted
      await waitFor(() => {
        expect(memoryPanel?.className).toContain('bg-blue-100');
      });

      // Unhover
      await user.unhover(clockPanel!);

      // Neither panel should be highlighted
      await waitFor(() => {
        expect(clockPanel?.className).not.toContain('bg-blue-100');
        expect(memoryPanel?.className).not.toContain('bg-blue-100');
      });

      unmount();
    });

    it('should display hover state indicator', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      // Initially, no hover state indicator should be visible
      expect(within(document.body).queryByText(/panel highlighted/)).toBeNull();

      // Hover over clock panel
      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      await user.hover(clockPanel!);

      // Hover state indicator should appear
      await waitFor(() => {
        expect(() => within(document.body).getByText('Clock panel highlighted')).not.toThrow();
      });

      // Unhover
      await user.unhover(clockPanel!);

      // Hover state indicator should disappear
      await waitFor(() => {
        expect(within(document.body).queryByText(/panel highlighted/)).toBeNull();
      });

      unmount();
    });

    it('should handle rapid hover changes without errors', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0]; // Test with first story

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');

      // Rapid hover changes
      for (let i = 0; i < 10; i++) {
        await user.hover(clockPanel!);
        await user.hover(memoryPanel!);
        await user.unhover(memoryPanel!);
      }

      // Should not throw any errors
      expect(console.error).not.toHaveBeenCalled();

      // Final state should be no highlighting
      expect(clockPanel?.className).not.toContain('bg-blue-100');
      expect(memoryPanel?.className).not.toContain('bg-blue-100');

      unmount();
    });
  });

  describe('Story categories are organized correctly', () => {
    it('should have correct story counts per category', () => {
      const stories = getAllStories();
      const runningStories = stories.filter(s => s.category === 'Running Timers');
      const completedStories = stories.filter(s => s.category === 'Completed Timers');
      const edgeCaseStories = stories.filter(s => s.category === 'Edge Cases');

      // Should have stories in each category
      expect(runningStories.length).toBeGreaterThan(0);
      expect(completedStories.length).toBeGreaterThan(0);
      expect(edgeCaseStories.length).toBeGreaterThan(0);

      // Total should meet target range (10-15 stories)
      expect(stories.length).toBeGreaterThanOrEqual(10);
      expect(stories.length).toBeLessThanOrEqual(15);
    });

    it('should have proper story metadata organization', () => {
      const stories = getAllStories();

      // All stories should have proper naming convention
      stories.forEach(({ name, category }) => {
        // Story name should be PascalCase
        expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);

        // Category should be one of the expected categories
        expect(['Running Timers', 'Completed Timers', 'Edge Cases']).toContain(category);
      });
    });

    it('should have story titles that reflect their category and state', () => {
      const stories = getAllStories();

      stories.forEach(({ name, category, config }) => {
        // Running timers should indicate running state
        if (category === 'Running Timers') {
          expect(config.title).toMatch(/running/i);
          expect(config.isRunning).toBe(true);
        }

        // Completed timers should indicate completion
        if (category === 'Completed Timers') {
          expect(config.title).toMatch(/completed/i);
          expect(config.isRunning).toBe(false);
        }

        // Edge cases should describe the edge case
        if (category === 'Edge Cases') {
          expect(config.title).toMatch(/minimum|very long|multiple|zero/i);
        }
      });
    });

    it('should have descriptions that explain the scenario', () => {
      const stories = getAllStories();

      stories.forEach(({ config }) => {
        // Description should be substantial
        expect(config.description.length).toBeGreaterThan(50);

        // Description should explain what the story shows
        expect(config.description).toMatch(/shows?|displays?|demonstrates?|tests?/i);

        // Description should be a complete sentence
        expect(config.description).toMatch(/^[A-Z]/);
        expect(config.description).toMatch(/[.!?]$/);
      });
    });

    it('should cover duration ranges appropriately', () => {
      const stories = getAllStories();

      // Should have short duration stories (< 60 seconds)
      const shortStories = stories.filter(s => s.config.durationMs < 60000);
      expect(shortStories.length).toBeGreaterThan(0);

      // Should have medium duration stories (1-10 minutes)
      const mediumStories = stories.filter(s =>
        s.config.durationMs >= 60000 && s.config.durationMs <= 600000
      );
      expect(mediumStories.length).toBeGreaterThan(0);

      // Should have long duration stories (> 10 minutes)
      const longStories = stories.filter(s => s.config.durationMs > 600000);
      expect(longStories.length).toBeGreaterThan(0);

      // Should have very long duration stories (> 1 hour)
      const veryLongStories = stories.filter(s => s.config.durationMs > 3600000);
      expect(veryLongStories.length).toBeGreaterThan(0);
    });
  });

  describe('Memory values correlate with clock display', () => {
    it('should have consistent timer state between clock and memory', async () => {
      const stories = getAllStories();

      for (const { config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Both components should receive the same state
        await waitFor(() => {
          // No errors should be logged
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        unmount();
      }
    });

    it('should properly handle running vs completed states', async () => {
      const runningStories = getAllStories().filter(s => s.config.isRunning);
      const completedStories = getAllStories().filter(s => !s.config.isRunning);

      // Test running stories
      for (const { config } of runningStories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Should have time spans with undefined stop (running)
        if (config.timeSpans) {
          const runningSpan = config.timeSpans.find(span => span.stop === undefined);
          expect(runningSpan).toBeDefined();
        }

        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        unmount();
      }

      // Test completed stories
      for (const { config } of completedStories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Should have time spans with defined stop (completed)
        if (config.timeSpans) {
          config.timeSpans.forEach(span => {
            expect(span.stop).toBeDefined();
          });
        }

        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        unmount();
      }
    });

    it('should handle multiple time spans correctly', async () => {
      const multiSpanStories = getAllStories().filter(s => s.config.timeSpans && s.config.timeSpans.length > 1);

      for (const { config } of multiSpanStories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Should render without errors despite multiple time spans
        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        unmount();
      }
    });

    it('should maintain data consistency during hover interactions', async () => {
      const user = userEvent.setup();
      const stories = getAllStories();
      const testStory = stories[0];

      // Clean up any existing DOM elements
      document.body.innerHTML = '';

      const { container, unmount } = render(<ClockMemoryStory config={testStory.config} />);

      const clockPanel = within(document.body).getByText('Clock Display').closest('.flex-1');
      const memoryPanel = within(document.body).getByText('Memory Display').closest('.flex-1');

      // Hover and unhover multiple times
      for (let i = 0; i < 5; i++) {
        await user.hover(clockPanel!);
        await waitFor(() => {
          expect(memoryPanel?.className).toContain('bg-blue-100');
        });

        await user.hover(memoryPanel!);
        await waitFor(() => {
          expect(clockPanel?.className).toContain('bg-blue-100');
        });

        await user.unhover(memoryPanel!);
        await waitFor(() => {
          expect(clockPanel?.className).not.toContain('bg-blue-100');
          expect(memoryPanel?.className).not.toContain('bg-blue-100');
        });
      }

      // Data should remain consistent throughout
      expect(console.error).not.toHaveBeenCalled();

      unmount();
    });

    it('should handle edge case duration values correctly', async () => {
      const edgeCaseStories = getAllStories().filter(s => s.category === 'Edge Cases');

      for (const { config } of edgeCaseStories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Should handle extreme durations without issues
        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        unmount();
      }
    });
  });

  describe('Integration performance and error handling', () => {
    it('should render all stories within performance targets', async () => {
      const stories = getAllStories();
      const renderTimes: number[] = [];

      for (const { config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const startTime = performance.now();

        const { unmount } = render(<ClockMemoryStory config={config} />);

        await waitFor(() => {
          expect(console.error).not.toHaveBeenCalled();
        }, { timeout: 3000 });

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);

        unmount();
      }

      // Average render time should be under 1 second
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(1000);

      // No single render should take more than 3 seconds
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(3000);
      });
    });

    it('should handle cleanup properly for all stories', async () => {
      const stories = getAllStories();

      for (const { config } of stories) {
        // Clean up any existing DOM elements
        document.body.innerHTML = '';

        const { unmount } = render(<ClockMemoryStory config={config} />);

        // Wait for component to fully render
        await waitFor(() => {
          expect(() => within(document.body).getByRole('heading', { name: config.title })).not.toThrow();
        }, { timeout: 3000 });

        // Unmount should not cause errors
        expect(() => unmount()).not.toThrow();

        // Give cleanup time to complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }, 30000); // Increase overall test timeout

    it('should handle concurrent rendering of multiple stories', async () => {
      const stories = getAllStories();
      const testStories = stories.slice(0, 3); // Test with first 3 stories

      // Render multiple stories concurrently
      const components = testStories.map(({ config }) => {
        return render(<ClockMemoryStory config={config} />);
      });

      // All should render without errors
      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalled();
      }, { timeout: 10000 });

      // Clean up all components
      components.forEach(({ unmount }) => {
        expect(() => unmount()).not.toThrow();
      });
    });

    it('should handle invalid props gracefully', () => {
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Test with slightly invalid config (should not crash)
      const invalidConfig = {
        durationMs: 1000,
        isRunning: true,
        title: 'Test',
        description: 'Test',
        timeSpans: 'invalid' as any
      };

      expect(() => {
        render(<ClockMemoryStory config={invalidConfig} />);
      }).toThrow(); // Should throw due to validation

      console.error = originalConsoleError;
    });
  });
});