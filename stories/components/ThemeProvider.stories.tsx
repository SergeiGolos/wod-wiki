import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, useTheme } from '../../src/components/theme/ThemeProvider';
import { ThemeToggle } from '../../src/components/theme/ThemeToggle';
import React from 'react';

// Demo component to show theme state
const ThemeDisplay: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="p-6 bg-background text-foreground rounded-lg border border-border space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Current Theme:</span>
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-mono">
          {theme}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 rounded text-sm ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 rounded text-sm ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`px-3 py-1.5 rounded text-sm ${theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >
          System
        </button>
      </div>
    </div>
  );
};

const meta: Meta<typeof ThemeProvider> = {
  title: 'Components/Theme/ThemeProvider',
  component: ThemeProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeProvider>;

/**
 * ThemeProvider with dark theme as default
 */
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider defaultTheme="dark" storageKey="storybook-theme-dark">
      <ThemeDisplay />
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ThemeProvider initialized with dark theme. The document root will have the "dark" class.',
      },
    },
  },
};

/**
 * ThemeProvider with light theme as default
 */
export const LightTheme: Story = {
  render: () => (
    <ThemeProvider defaultTheme="light" storageKey="storybook-theme-light">
      <ThemeDisplay />
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ThemeProvider initialized with light theme. The document root will have the "light" class.',
      },
    },
  },
};

/**
 * ThemeProvider following system preference
 */
export const SystemTheme: Story = {
  render: () => (
    <ThemeProvider defaultTheme="system" storageKey="storybook-theme-system">
      <ThemeDisplay />
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ThemeProvider following system color scheme preference.',
      },
    },
  },
};

/**
 * Demonstrates localStorage persistence
 */
export const PersistsToStorage: Story = {
  render: () => (
    <ThemeProvider defaultTheme="light" storageKey="storybook-theme-persist">
      <div className="space-y-4">
        <ThemeDisplay />
        <p className="text-xs text-muted-foreground text-center">
          Theme changes are saved to localStorage under the key "storybook-theme-persist"
        </p>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Theme selection persists to localStorage and survives page refreshes.',
      },
    },
  },
};

/**
 * ThemeProvider with custom storage key
 */
export const CustomStorageKey: Story = {
  render: () => (
    <ThemeProvider defaultTheme="light" storageKey="my-custom-theme-key">
      <div className="space-y-4">
        <ThemeDisplay />
        <p className="text-xs text-muted-foreground text-center font-mono">
          storageKey: "my-custom-theme-key"
        </p>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ThemeProvider using a custom localStorage key for theme persistence.',
      },
    },
  },
};

/**
 * Complete theme setup with ThemeToggle
 */
export const WithThemeToggle: Story = {
  render: () => (
    <ThemeProvider defaultTheme="light" storageKey="storybook-theme-complete">
      <div className="p-6 bg-background text-foreground rounded-lg border border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Theme Control</span>
          <ThemeToggle />
        </div>
        <p className="text-sm text-muted-foreground">
          Click the toggle button to switch between light and dark themes.
        </p>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete theme setup showing ThemeProvider with the ThemeToggle component.',
      },
    },
  },
};
