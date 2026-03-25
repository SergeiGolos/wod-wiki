/**
 * DesignSystem / Molecules / CastCallout
 *
 * Floating callout that prompts the user to try Chromecast (big-screen mode).
 * Hides itself when a cast session is active or before a 1.5 s delay.
 *
 * The Chromecast SDK is unavailable in Storybook, so the component is wrapped
 * in an error boundary and renders after the 1.5 s visibility delay.
 */

import { Component, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CastCallout } from '@/components/cast/CastCallout';

// Simple error boundary so a missing SDK doesn't crash the story canvas
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e };
  }
  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <p className="text-xs text-muted-foreground italic p-4">
            CastCallout could not render (Chromecast SDK unavailable in this environment).
          </p>
        )
      );
    }
    return this.props.children;
  }
}

const meta: Meta<typeof CastCallout> = {
  title: 'DesignSystem/Molecules/CastCallout',
  component: CastCallout,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div
        className="relative bg-muted/30 rounded-lg border border-border"
        style={{ minHeight: '300px', minWidth: '500px' }}
      >
        <ErrorBoundary>
          <Story />
        </ErrorBoundary>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default (appears after 1.5 s, hides if casting)',
  render: () => <CastCallout />,
};
