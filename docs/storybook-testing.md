# Storybook Integration Testing Guide

This guide establishes patterns for Storybook integration testing in WOD Wiki. Storybook stories serve as both documentation and integration tests.

## Table of Contents

1. [Storybook Testing Philosophy](#storybook-testing-philosophy)
2. [Story Structure](#story-structure)
3. [Interaction Testing Patterns](#interaction-testing-patterns)
4. [Common Testing Scenarios](#common-testing-scenarios)
5. [Accessibility Testing](#accessibility-testing)
6. [Visual Regression Testing](#visual-regression-testing)
7. [Best Practices](#best-practices)

## Storybook Testing Philosophy

### Stories as Tests

Every Storybook story should serve two purposes:

1. **Documentation**: Show what the component looks like and how it works
2. **Integration Test**: Verify the component works correctly in isolation

### Test Pyramid

Storybook tests sit between unit tests and E2E tests:

```
         E2E Tests (few, slow)
        /                   \
   Integration Tests (Storybook)
  /                            \
Unit Tests (many, fast)
```

**Storybook responsibilities**:
- Component interaction flows
- User behavior validation
- Visual appearance verification
- Accessibility compliance
- Edge case demonstrations

**NOT Storybook responsibilities**:
- Cross-page workflows (use E2E tests)
- Performance benchmarks (use perf tests)
- Network integration (use integration tests)

## Story Structure

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from '../YourComponent';

const meta = {
  title: 'Category/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered', // or 'fullscreen', 'padded'
  },
  tags: ['autodocs'], // Enable automatic docs generation
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof YourComponent>;

// Default story
export const Default: Story = {
  args: {
    // Component props
  },
};
```

### Story with Controls

```typescript
export const WithControls: Story = {
  args: {
    title: 'Controlled Component',
    value: 42,
    isActive: true,
  },

  // Enable controls for this story
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};
```

### Story with Loading States

```typescript
export const Loading: Story = {
  args: {
    isLoading: true,
  },

  render: (args) => (
    <YourComponent {...args} />
  ),
};
```

### Story with Error States

```typescript
export const ErrorState: Story = {
  args: {
    error: 'Something went wrong',
    hasError: true,
  },
};
```

## Interaction Testing Patterns

### Pattern 1: Button Click Flow

```typescript
export const ButtonClickFlow: Story = {
  args: {
    initialValue: 0,
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Verify initial state
    await step('Verify initial counter value', () => {
      expect(canvas.getByText('Count: 0')).toBeTruthy();
    });

    // Step 2: Click increment button
    await step('Click increment button', async () => {
      const button = canvas.getByRole('button', { name: /increment/i });
      await userEvent.click(button);
    });

    // Step 3: Verify updated state
    await step('Verify counter incremented', () => {
      expect(canvas.getByText('Count: 1')).toBeTruthy();
    });

    // Step 4: Multiple clicks
    await step('Click 5 more times', async () => {
      const button = canvas.getByRole('button', { name: /increment/i });
      for (let i = 0; i < 5; i++) {
        await userEvent.click(button);
      }
    });

    // Step 5: Verify final state
    await step('Verify final counter value', () => {
      expect(canvas.getByText('Count: 6')).toBeTruthy();
    });
  },
};
```

### Pattern 2: Form Validation

```typescript
export const FormValidation: Story = {
  args: {
    onSubmit: (data: any) => console.log('Form submitted:', data),
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Submit empty form (should show validation errors)
    await step('Submit empty form', async () => {
      const submitButton = canvas.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);
    });

    await step('Verify validation errors appear', () => {
      expect(canvas.getByText(/name is required/i)).toBeTruthy();
      expect(canvas.getByText(/email is required/i)).toBeTruthy();
    });

    // Step 2: Fill in invalid email
    await step('Enter invalid email', async () => {
      const emailInput = canvas.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
    });

    await step('Verify email error', async () => {
      expect(canvas.getByText(/invalid email format/i)).toBeTruthy();
    });

    // Step 3: Fill in valid data
    await step('Fill in valid form data', async () => {
      const nameInput = canvas.getByLabelText(/name/i);
      const emailInput = canvas.getByLabelText(/email/i);

      await userEvent.clear(emailInput);
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.type(emailInput, 'john@example.com');
    });

    await step('Verify no errors', () => {
      expect(canvas.queryByText(/required/i)).toBeNull();
      expect(canvas.queryByText(/invalid/i)).toBeNull();
    });

    // Step 4: Submit valid form
    await step('Submit valid form', async () => {
      const submitButton = canvas.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);
    });
  },
};
```

### Pattern 3: Toggle/Checkbox Interaction

```typescript
export const ToggleInteraction: Story = {
  args: {
    isEnabled: false,
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Verify initial state
    await step('Verify initially disabled', () => {
      expect(canvas.getByText(/disabled/i)).toBeTruthy();
      const checkbox = canvas.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    // Step 2: Enable toggle
    await step('Click toggle to enable', async () => {
      const toggle = canvas.getByRole('checkbox');
      await userEvent.click(toggle);
    });

    await step('Verify enabled state', () => {
      expect(canvas.getByText(/enabled/i)).toBeTruthy();
      const checkbox = canvas.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    // Step 3: Disable toggle
    await step('Click toggle to disable', async () => {
      const toggle = canvas.getByRole('checkbox');
      await userEvent.click(toggle);
    });

    await step('Verify disabled state again', () => {
      expect(canvas.getByText(/disabled/i)).toBeTruthy();
    });
  },
};
```

### Pattern 4: Dropdown/Menu Selection

```typescript
export const DropdownSelection: Story = {
  args: {
    options: ['Option 1', 'Option 2', 'Option 3'],
    selectedOption: null,
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Open dropdown
    await step('Open dropdown menu', async () => {
      const trigger = canvas.getByRole('button');
      await userEvent.click(trigger);
    });

    await step('Verify menu items are visible', () => {
      expect(canvas.getByText('Option 1')).toBeTruthy();
      expect(canvas.getByText('Option 2')).toBeTruthy();
      expect(canvas.getByText('Option 3')).toBeTruthy();
    });

    // Step 2: Select option
    await step('Select Option 2', async () => {
      const option = canvas.getByText('Option 2');
      await userEvent.click(option);
    });

    await step('Verify selection', () => {
      expect(canvas.getByText('Option 2')).toBeTruthy();
      expect(canvas.queryByText('Option 1')).toBeNull();
    });
  },
};
```

### Pattern 5: Modal/Dialog Interaction

```typescript
export const ModalInteraction: Story = {
  args: {
    isOpen: false,
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Open modal
    await step('Open modal dialog', async () => {
      const openButton = canvas.getByRole('button', { name: /open/i });
      await userEvent.click(openButton);
    });

    await step('Verify modal is visible', () => {
      expect(canvas.getByRole('dialog')).toBeTruthy();
      expect(canvas.getByText(/modal title/i)).toBeTruthy();
    });

    // Step 2: Close modal with close button
    await step('Close modal with close button', async () => {
      const closeButton = canvas.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);
    });

    await step('Verify modal is closed', () => {
      expect(canvas.queryByRole('dialog')).toBeNull();
    });

    // Step 3: Open and close with backdrop click
    await step('Open modal again', async () => {
      const openButton = canvas.getByRole('button', { name: /open/i });
      await userEvent.click(openButton);
    });

    await step('Close modal by clicking backdrop', async () => {
      const dialog = canvas.getByRole('dialog');
      // Click outside the dialog content
      await userEvent.click(dialog.parentElement!);
    });

    await step('Verify modal is closed again', () => {
      expect(canvas.queryByRole('dialog')).toBeNull();
    });
  },
};
```

### Pattern 6: Keyboard Navigation

```typescript
export const KeyboardNavigation: Story = {
  args: {
    items: ['Item 1', 'Item 2', 'Item 3'],
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Focus first item with Tab
    await step('Focus first item with Tab key', async () => {
      await userEvent.tab();
      const firstItem = canvas.getByText('Item 1');
      expect(firstItem).toHaveFocus();
    });

    // Step 2: Navigate with arrow keys
    await step('Navigate to second item with ArrowDown', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const secondItem = canvas.getByText('Item 2');
      expect(secondItem).toHaveFocus();
    });

    await step('Navigate to third item with ArrowDown', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const thirdItem = canvas.getByText('Item 3');
      expect(thirdItem).toHaveFocus();
    });

    // Step 3: Navigate back with ArrowUp
    await step('Navigate back with ArrowUp', async () => {
      await userEvent.keyboard('{ArrowUp}');
      const secondItem = canvas.getByText('Item 2');
      expect(secondItem).toHaveFocus();
    });

    // Step 4: Activate with Enter
    await step('Activate item with Enter key', async () => {
      await userEvent.keyboard('{Enter}');
      // Verify activation (e.g., item selected)
    });
  },
};
```

## Common Testing Scenarios

### Scenario 1: Timer Component

```typescript
export const TimerCountdown: Story = {
  args: {
    durationMs: 60000, // 1 minute
    direction: 'down',
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Verify initial display
    await step('Verify initial time display', () => {
      expect(canvas.getByText('1:00')).toBeTruthy();
      expect(canvas.getByText(/start/i)).toBeTruthy();
    });

    // Step 2: Start timer
    await step('Start the timer', async () => {
      const startButton = canvas.getByRole('button', { name: /start/i });
      await userEvent.click(startButton);
    });

    // Step 3: Verify timer is running
    await step('Verify timer is running', async () => {
      // Timer should show decreasing time
      await waitFor(() => {
        expect(canvas.getByText('0:59')).toBeTruthy();
      });
    });

    // Step 4: Pause timer
    await step('Pause the timer', async () => {
      const pauseButton = canvas.getByRole('button', { name: /pause/i });
      await userEvent.click(pauseButton);
    });

    // Step 5: Resume timer
    await step('Resume the timer', async () => {
      const resumeButton = canvas.getByRole('button', { name: /resume/i });
      await userEvent.click(resumeButton);
    });

    // Step 6: Reset timer
    await step('Reset the timer', async () => {
      const resetButton = canvas.getByRole('button', { name: /reset/i });
      await userEvent.click(resetButton);

      expect(canvas.getByText('1:00')).toBeTruthy();
    });
  },
};
```

### Scenario 2: List with Items

```typescript
export const ListInteraction: Story = {
  args: {
    items: [
      { id: 1, name: 'Item 1', completed: false },
      { id: 2, name: 'Item 2', completed: false },
      { id: 3, name: 'Item 3', completed: false },
    ],
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Verify all items rendered
    await step('Verify all items are rendered', () => {
      expect(canvas.getByText('Item 1')).toBeTruthy();
      expect(canvas.getByText('Item 2')).toBeTruthy();
      expect(canvas.getByText('Item 3')).toBeTruthy();
    });

    // Step 2: Mark item as complete
    await step('Mark first item as complete', async () => {
      const checkbox = canvas.getAllByRole('checkbox')[0];
      await userEvent.click(checkbox);
    });

    await step('Verify item is marked complete', () => {
      expect(canvas.getByText('Item 1')).toHaveClass('completed');
    });

    // Step 3: Delete item
    await step('Delete second item', async () => {
      const deleteButtons = canvas.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[1]);
    });

    await step('Verify item is removed', () => {
      expect(canvas.queryByText('Item 2')).toBeNull();
      expect(canvas.getByText('Item 1')).toBeTruthy();
      expect(canvas.getByText('Item 3')).toBeTruthy();
    });

    // Step 4: Add new item
    await step('Add new item', async () => {
      const input = canvas.getByRole('textbox');
      const addButton = canvas.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'Item 4');
      await userEvent.click(addButton);
    });

    await step('Verify new item added', () => {
      expect(canvas.getByText('Item 4')).toBeTruthy();
    });
  },
};
```

### Scenario 3: Search/Filter

```typescript
export const SearchFiltering: Story = {
  args: {
    items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Verify all items visible
    await step('Verify all items are visible initially', () => {
      expect(canvas.getByText('Apple')).toBeTruthy();
      expect(canvas.getByText('Banana')).toBeTruthy();
      expect(canvas.getByText('Cherry')).toBeTruthy();
    });

    // Step 2: Search for specific item
    await step('Search for "an"', async () => {
      const searchInput = canvas.getByRole('textbox');
      await userEvent.type(searchInput, 'an');
    });

    await step('Verify filtered results', () => {
      expect(canvas.getByText('Banana')).toBeTruthy();
      expect(canvas.queryByText('Apple')).toBeNull();
      expect(canvas.queryByText('Cherry')).toBeNull();
    });

    // Step 3: Clear search
    await step('Clear search', async () => {
      const searchInput = canvas.getByRole('textbox');
      await userEvent.clear(searchInput);
    });

    await step('Verify all items visible again', () => {
      expect(canvas.getByText('Apple')).toBeTruthy();
      expect(canvas.getByText('Banana')).toBeTruthy();
      expect(canvas.getByText('Cherry')).toBeTruthy();
    });

    // Step 4: Search with no results
    await step('Search for non-existent item', async () => {
      const searchInput = canvas.getByRole('textbox');
      await userEvent.type(searchInput, 'Zucchini');
    });

    await step('Verify no results message', () => {
      expect(canvas.getByText(/no results/i)).toBeTruthy();
    });
  },
};
```

## Accessibility Testing

### ARIA Attributes

```typescript
export const AccessibilityAttributes: Story = {
  args: {
    label: 'Accessible Button',
    description: 'This button follows ARIA guidelines',
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Verify ARIA attributes
    await step('Verify ARIA label', () => {
      const button = canvas.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Accessible Button');
    });

    await step('Verify ARIA description', () => {
      const button = canvas.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby');
    });

    await step('Verify button is keyboard accessible', async () => {
      const button = canvas.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      // Verify button activated
    });
  },
};
```

### Screen Reader Support

```typescript
export const ScreenReaderSupport: Story = {
  args: {
    status: 'loading',
    message: 'Loading data...',
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Verify live region for screen readers
    await step('Verify aria-live region', () => {
      const status = canvas.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    await step('Verify status message is announced', () => {
      expect(canvas.getByText('Loading data...')).toBeTruthy();
    });
  },
};
```

### Focus Management

```typescript
export const FocusManagement: Story = {
  args: {
    showModal: false,
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Open modal
    await step('Open modal', async () => {
      const openButton = canvas.getByRole('button', { name: /open/i });
      await userEvent.click(openButton);
    });

    // Step 2: Verify focus is trapped in modal
    await step('Verify focus moves to modal', () => {
      const modal = canvas.getByRole('dialog');
      expect(modal).toHaveFocus();
    });

    // Step 3: Verify focus cycles through modal elements
    await step('Tab through modal elements', async () => {
      await userEvent.tab();
      const firstFocusable = canvas.getAllByRole('button')[0];
      expect(firstFocusable).toHaveFocus();

      await userEvent.tab();
      const secondFocusable = canvas.getAllByRole('button')[1];
      expect(secondFocusable).toHaveFocus();
    });

    // Step 4: Close modal and verify focus returns
    await step('Close modal and verify focus restoration', async () => {
      const closeButton = canvas.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      const openButton = canvas.getByRole('button', { name: /open/i });
      expect(openButton).toHaveFocus();
    });
  },
};
```

## Visual Regression Testing

### Responsive Layouts

```typescript
export const ResponsiveLayouts: Story = {
  args: {
    // Component props
  },

  parameters: {
    viewport: {
      viewports: {
      mobile: {
        name: 'Mobile',
        styles: {
          width: '375px',
          height: '812px',
        },
      },
      tablet: {
        name: 'Tablet',
        styles: {
          width: '768px',
          height: '1024px',
        },
      },
      desktop: {
        name: 'Desktop',
        styles: {
          width: '1920px',
          height: '1080px',
        },
      },
    },
  },
};

// Test mobile layout specifically
export const MobileLayout: Story = {
  ...ResponsiveLayouts,
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Verify mobile-specific layout
    await step('Verify mobile navigation is hamburger menu', () => {
      expect(canvas.getByRole('button', { name: /menu/i })).toBeTruthy();
    });

    await step('Verify content stacks vertically', () => {
      const mainContent = canvas.getByTestId('main-content');
      const sidebar = canvas.getByTestId('sidebar');

      expect(mainContent).toBeInTheDocument();
      expect(sidebar).toBeInTheDocument();
      // Verify stacking order
    });
  },
};
```

### Dark Mode

```typescript
export const DarkMode: Story = {
  args: {
    // Component props
  },

  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify dark mode styles are applied
    expect(canvas.getByTestId('container')).toHaveClass('dark');

    // Verify text contrast is sufficient
    const heading = canvas.getByRole('heading');
    expect(heading).toHaveStyle({ color: '#ffffff' });
  },
};
```

## Best Practices

### 1. Use `step()` for Complex Interactions

Break down complex interactions into labeled steps:

```typescript
play: async ({ canvasElement, step }) => {
  const canvas = within(canvasElement);

  await step('Describe what this step does', async () => {
    // Test code here
  });

  await step('Next step description', async () => {
    // More test code
  });
},
```

### 2. Use Descriptive Story Names

Story names should describe what's being tested:

```typescript
// Good
export const FormWithValidationErrors: Story = {};
export const SuccessfulFormSubmission: Story = {};

// Bad
export const Test1: Story = {};
export const Test2: Story = {};
```

### 3. Test Happy Paths and Edge Cases

Cover both normal operation and edge cases:

```typescript
export const HappyPath: Story = {};  // Normal operation
export const EmptyState: Story = {};  // No data
export const ErrorState: Story = {};  // Error condition
export const MaximumItems: Story = {}; // Edge case
```

### 4. Use waitFor for Async Operations

Wait for async operations to complete:

```typescript
import { waitFor } from '@storybook/test';

play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // Trigger async operation
  const button = canvas.getByRole('button');
  await userEvent.click(button);

  // Wait for result
  await waitFor(() => {
    expect(canvas.getByText(/loaded/i)).toBeTruthy();
  });
},
```

### 5. Avoid Testing Implementation Details

Test user-facing behavior, not implementation:

```typescript
// Bad - Tests implementation
expect(component.state.isLoading).toBe(false);

// Good - Tests behavior
expect(canvas.queryByText(/loading/i)).toBeNull();
```

### 6. Keep Tests Independent

Each story should work independently:

```typescript
// Each story should set up its own state
export const Scenario1: Story = {
  args: {
    // All required props
  },
};

export const Scenario2: Story = {
  args: {
    // All required props (don't depend on Scenario1)
  },
};
```

## Running Storybook Tests

### Run Storybook

```bash
bun run storybook
```

### Run Storybook Tests

```bash
bun run test:storybook
```

### Run Specific Story Tests

```bash
bun run test:storybook -- stories/components/YourComponent.stories.tsx
```

## Resources

- [Component Testing Guidelines](/docs/component-testing-guidelines.md)
- [Test Templates](/docs/test-templates.md)
- [PR Testing Checklist](/docs/pr-testing-checklist.md)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Storybook Testing Library](https://storybook.js.org/docs/writing-tests/testing-library)
