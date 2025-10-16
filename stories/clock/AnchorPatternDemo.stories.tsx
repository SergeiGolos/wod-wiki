import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect, useMemo } from 'react';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { BlockContext } from '../../src/runtime/BlockContext';
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { useAnchorSubscription } from '../../src/runtime/hooks/useAnchorSubscription';
import { MemoryTypeEnum } from '../../src/runtime/MemoryTypeEnum';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Demonstration of the Anchor-Based Subscription Model
 * 
 * This story shows how UI components can subscribe to stable anchor IDs
 * while the data source dynamically changes at runtime.
 */

interface TimeSpan {
  start?: Date;
  stop?: Date;
}

/**
 * Simple clock component that displays time from an anchor
 */
function AnchorClock({ anchorId, title }: { anchorId: string; title: string }) {
  const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
  
  const elapsed = useMemo(() => {
    if (!timeSpans || timeSpans.length === 0) return 0;
    
    let total = 0;
    const now = new Date();
    
    for (const span of timeSpans) {
      if (span.start) {
        const end = span.stop || now;
        total += end.getTime() - span.start.getTime();
      }
    }
    
    return total;
  }, [timeSpans]);
  
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Anchor ID: <code className="text-xs">{anchorId}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-mono font-bold text-center">
          {timeSpans ? formatTime(elapsed) : '--:--'}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Demo component showing multiple timers with anchor switching
 */
function AnchorPatternDemo() {
  const [runtime] = useState(() => new ScriptRuntime());
  const [currentSection, setCurrentSection] = useState<'warmup' | 'workout' | 'cooldown'>('warmup');
  
  // Create contexts for each workout section
  const contexts = useMemo(() => ({
    warmup: new BlockContext(runtime, 'warmup-block', 'warmup'),
    workout: new BlockContext(runtime, 'workout-block', 'workout'),
    cooldown: new BlockContext(runtime, 'cooldown-block', 'cooldown'),
  }), [runtime]);
  
  // Initialize timers and anchors
  useEffect(() => {
    // Create time span data for each section
    const warmupTime = contexts.warmup.allocate<TimeSpan[]>(
      MemoryTypeEnum.TIMER_TIME_SPANS,
      [{ start: new Date(Date.now() - 120000), stop: new Date() }], // 2 min completed
      'public'
    );
    
    const workoutTime = contexts.workout.allocate<TimeSpan[]>(
      MemoryTypeEnum.TIMER_TIME_SPANS,
      [{ start: new Date(Date.now() - 300000) }], // 5 min running
      'public'
    );
    
    const cooldownTime = contexts.cooldown.allocate<TimeSpan[]>(
      MemoryTypeEnum.TIMER_TIME_SPANS,
      [{ start: new Date(), stop: undefined }], // Not started yet
      'public'
    );
    
    // Set initial anchor to point to warmup
    const anchor = contexts.warmup.getOrCreateAnchor('anchor-main-workout-clock');
    anchor.set({
      searchCriteria: {
        ownerId: 'warmup-block',
        type: MemoryTypeEnum.TIMER_TIME_SPANS,
        id: null,
        visibility: null
      }
    });
  }, [contexts, runtime]);
  
  // Update anchor when section changes
  useEffect(() => {
    let blockId: string;
    let context: BlockContext;
    
    switch (currentSection) {
      case 'warmup':
        blockId = 'warmup-block';
        context = contexts.warmup;
        break;
      case 'workout':
        blockId = 'workout-block';
        context = contexts.workout;
        break;
      case 'cooldown':
        blockId = 'cooldown-block';
        context = contexts.cooldown;
        break;
    }
    
    // Update the anchor to point to the current section's timer
    const anchor = context.getOrCreateAnchor('anchor-main-workout-clock');
    anchor.set({
      searchCriteria: {
        ownerId: blockId,
        type: MemoryTypeEnum.TIMER_TIME_SPANS,
        id: null,
        visibility: null
      }
    });
  }, [currentSection, contexts]);
  
  return (
    <RuntimeProvider runtime={runtime}>
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Anchor Pattern Demo</h1>
          <p className="text-muted-foreground">
            The clock below subscribes to a single anchor ID. Click the buttons to switch
            between different workout sections. Notice how the clock automatically updates
            to display the correct timer without any props changing!
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setCurrentSection('warmup')}
            variant={currentSection === 'warmup' ? 'default' : 'outline'}
          >
            Warm-up
          </Button>
          <Button
            onClick={() => setCurrentSection('workout')}
            variant={currentSection === 'workout' ? 'default' : 'outline'}
          >
            Main Workout
          </Button>
          <Button
            onClick={() => setCurrentSection('cooldown')}
            variant={currentSection === 'cooldown' ? 'default' : 'outline'}
          >
            Cool-down
          </Button>
        </div>
        
        <div className="flex gap-4 items-center">
          <Badge variant="secondary">Current Section:</Badge>
          <Badge variant="default" className="text-lg">
            {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
          </Badge>
        </div>
        
        {/* This component's props never change, but it displays different data! */}
        <AnchorClock 
          anchorId="anchor-main-workout-clock"
          title="Main Workout Clock"
        />
        
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>The clock component subscribes to anchor ID: <code>anchor-main-workout-clock</code></li>
            <li>The anchor's value contains search criteria pointing to the current section's timer</li>
            <li>When you click a button, the anchor's value is updated to point to a different timer</li>
            <li>The clock automatically detects the change and displays the new timer</li>
            <li>No props were changed on the clock component - it's fully decoupled!</li>
          </ol>
        </div>
      </div>
    </RuntimeProvider>
  );
}

const meta: Meta<typeof AnchorPatternDemo> = {
  title: 'Clock/Anchor Pattern Demo',
  component: AnchorPatternDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Demonstration of the Anchor-Based Subscription Model.

This pattern enables UI components to subscribe to stable "anchor" IDs while
the underlying data source changes dynamically. Perfect for workout apps where
different sections may provide similar data types (timers, metrics, etc.).

## Key Benefits

1. **Decoupling**: UI components don't know about block IDs or data ownership
2. **Flexibility**: Data sources can change without modifying component code
3. **Simplicity**: Components only need a stable anchor ID
4. **Maintainability**: Data-to-UI mapping is centralized in behaviors

## Try It

Click the buttons to switch between workout sections and watch the clock
automatically update to display the correct timer!
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AnchorPatternDemo>;

export const Default: Story = {
  render: () => <AnchorPatternDemo />,
};

export const WithDescription: Story = {
  render: () => <AnchorPatternDemo />,
  parameters: {
    docs: {
      description: {
        story: `
This story demonstrates the full workflow of the anchor pattern:

1. Multiple timer blocks are created (warmup, workout, cooldown)
2. A single anchor \`anchor-main-workout-clock\` is shared
3. The UI component subscribes to this anchor
4. When sections change, the anchor is updated to point to a different timer
5. The UI automatically updates without any prop changes

This is especially powerful for complex workout flows with multiple sections,
parallel timers, or dynamic transitions.
        `,
      },
    },
  },
};
