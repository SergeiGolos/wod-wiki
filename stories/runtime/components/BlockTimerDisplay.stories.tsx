import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BlockTimerDisplay } from '../../../src/runtime/components';
// Import MockBlock directly to avoid pulling in BehaviorTestHarness which uses bun:test
import { MockBlock } from '../../../src/testing/harness/MockBlock';
import { TimeSpan } from '../../../src/runtime/models/TimeSpan';
import type { TimerState, RoundState } from '../../../src/runtime/memory/MemoryTypes';

const meta: Meta<typeof BlockTimerDisplay> = {
    title: 'Runtime/Components/BlockTimerDisplay',
    component: BlockTimerDisplay,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
BlockTimerDisplay demonstrates the new behavior-based hooks pattern
for displaying timer state from IRuntimeBlock objects.

## Features
- Uses useTimerDisplay hook for reactive timer state
- Uses useRoundDisplay hook for round information
- 60fps animation for running timers
- Zero polling when timer is complete

## When to Use
Use this pattern when you have direct access to an IRuntimeBlock
from the runtime stack. For display stack integration (blockKey strings),
continue using DigitalClock or ClockAnchor components.
                `
            }
        }
    },
    argTypes: {
        showRounds: {
            control: 'boolean',
            description: 'Show round information if available'
        },
        compact: {
            control: 'boolean',
            description: 'Compact mode for smaller displays'
        }
    }
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Creates a mock block with timer state pre-configured
 */
function createTimerBlock(options: {
    elapsedMs?: number;
    durationMs?: number;
    isRunning?: boolean;
    currentRound?: number;
    totalRounds?: number;
}) {
    const block = new MockBlock('timer-demo', [], {
        blockType: 'Timer',
        label: 'Demo Timer'
    });

    // Create timer state with proper TimeSpan
    const now = Date.now();
    const timerState: TimerState = {
        spans: options.isRunning
            ? [new TimeSpan(now - (options.elapsedMs ?? 0))] // Running timer
            : [new TimeSpan(now - 1000, now - 1000 + (options.elapsedMs ?? 0))], // Completed span
        durationMs: options.durationMs,
        direction: options.durationMs ? 'down' : 'up',
        label: 'Demo Timer'
    };
    block.setMemoryValue('timer', timerState);

    // Set up round state if specified
    if (options.currentRound !== undefined) {
        const roundState: RoundState = {
            current: options.currentRound,
            total: options.totalRounds
        };
        block.setMemoryValue('round', roundState);
    }

    return block;
}

/**
 * Basic countdown timer at rest
 */
export const CountdownTimer: Story = {
    args: {
        showRounds: false,
        compact: false
    },
    render: (args) => {
        const block = createTimerBlock({
            elapsedMs: 0,
            durationMs: 60000,
            isRunning: false
        });
        return <BlockTimerDisplay {...args} block={block} />;
    }
};

/**
 * Timer with rounds information displayed
 */
export const WithRounds: Story = {
    args: {
        showRounds: true,
        compact: false
    },
    render: (args) => {
        const block = createTimerBlock({
            elapsedMs: 15000,
            durationMs: 60000,
            isRunning: false,
            currentRound: 2,
            totalRounds: 5
        });
        return <BlockTimerDisplay {...args} block={block} />;
    }
};

/**
 * Compact display for smaller spaces
 */
export const CompactMode: Story = {
    args: {
        showRounds: true,
        compact: true
    },
    render: (args) => {
        const block = createTimerBlock({
            elapsedMs: 30000,
            durationMs: 60000,
            isRunning: false,
            currentRound: 3,
            totalRounds: 5
        });
        return <BlockTimerDisplay {...args} block={block} />;
    }
};

/**
 * Empty state when no block is provided
 */
export const NoBlock: Story = {
    args: {
        showRounds: true,
        compact: false
    },
    render: (args) => {
        return <BlockTimerDisplay {...args} block={undefined} />;
    }
};

/**
 * Interactive running timer demonstration
 */
export const RunningTimer: Story = {
    args: {
        showRounds: true,
        compact: false
    },
    render: (args) => {
        const [block] = useState(() => createTimerBlock({
            elapsedMs: 0,
            durationMs: 60000,
            isRunning: true
        }));

        return (
            <div className="flex flex-col items-center gap-4">
                <BlockTimerDisplay {...args} block={block} />
                <div className="text-sm text-muted-foreground">
                    Timer is running (live animation)
                </div>
            </div>
        );
    }
};
