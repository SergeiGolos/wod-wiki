/**
 * JournalPageShell Stories
 *
 * Demonstrates the JournalPageShell with editor and dialog overlays.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { JournalPageShell } from '@/panels/page-shells/JournalPageShell';

const meta: Meta<typeof JournalPageShell> = {
  title: 'Pages/Note',
  component: JournalPageShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Layout shell for stored-note / journal pages. Renders a full-width editor with dialog-based timer and review overlays.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function MockEditor() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/10 border border-border/50 rounded-lg">
      <div className="text-center space-y-2">
        <p className="text-lg font-black text-foreground uppercase">
          Editor Panel
        </p>
        <p className="text-sm text-muted-foreground">
          Full-width stored note editor
        </p>
      </div>
    </div>
  );
}

function MockTimerOverlay() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-primary/5">
      <div className="text-center space-y-2">
        <p className="text-4xl font-black text-primary">03:42</p>
        <p className="text-sm text-muted-foreground">
          Fullscreen Timer Overlay
        </p>
      </div>
    </div>
  );
}

function MockReviewOverlay() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-emerald-500/5">
      <div className="text-center space-y-2">
        <p className="text-2xl font-black text-foreground uppercase">
          Workout Complete
        </p>
        <p className="text-sm text-muted-foreground">
          Fullscreen Review Overlay
        </p>
      </div>
    </div>
  );
}

/**
 * Empty note — editor only, no overlays active.
 */
export const EmptyNote: Story = {
  render: () => <JournalPageShell editor={<MockEditor />} />,
};

/**
 * Loaded workout — interactive demo with timer/review overlay toggles.
 */
export const LoadedWorkout: Story = {
  render: () => {
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    return (
      <div>
        <div className="fixed top-4 right-4 z-[100] flex gap-2">
          <button
            onClick={() => setIsTimerOpen(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md"
          >
            Open Timer
          </button>
          <button
            onClick={() => setIsReviewOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md"
          >
            Open Review
          </button>
        </div>
        <JournalPageShell
          editor={<MockEditor />}
          timerOverlay={<MockTimerOverlay />}
          reviewOverlay={<MockReviewOverlay />}
          isTimerOpen={isTimerOpen}
          isReviewOpen={isReviewOpen}
          onCloseTimer={() => setIsTimerOpen(false)}
          onCloseReview={() => setIsReviewOpen(false)}
        />
      </div>
    );
  },
};
