import { useState, useCallback, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { registerDefaultCards, StackedClockDisplay, IDisplayStackState, createDefaultDisplayState, ITimerDisplayEntry, IDisplayCardEntry } from '@/clock';
import { ScriptRuntime, WodScript, JitCompiler, TimeSpan, TypedMemoryReference } from '@/core-entry';
import { RuntimeProvider } from '@/runtime/context/RuntimeContext';
import { MemoryTypeEnum } from '@/runtime/MemoryTypeEnum';


// Register default cards
registerDefaultCards();

const meta: Meta<typeof StackedClockDisplay> = {
  title: 'Clock/StackedClockDisplay',
  component: StackedClockDisplay,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StackedClockDisplay>;

/**
 * Helper to create a runtime with display stack state
 */
function createTestRuntime(): ScriptRuntime {
  const emptyScript = new WodScript('', []);
  const jitCompiler = new JitCompiler([]);
  const runtime = new ScriptRuntime(emptyScript, jitCompiler);
  
  // Initialize the display stack state
  runtime.memory.allocate<IDisplayStackState>(
    MemoryTypeEnum.DISPLAY_STACK_STATE,
    'runtime',
    createDefaultDisplayState(),
    'public'
  );
  
  return runtime;
}

/**
 * Interactive demo showing how blocks can push/pop timer displays
 */
export const Interactive: Story = {
  render: () => {
    const [runtime] = useState(() => createTestRuntime());
    const [timerEntries, setTimerEntries] = useState<ITimerDisplayEntry[]>([]);
    const [cardEntries, setCardEntries] = useState<IDisplayCardEntry[]>([]);
    const [timerId, setTimerId] = useState(1);
    const [cardId, setCardId] = useState(1);

    // Create a timer memory reference
    const [timerRef] = useState(() => 
      runtime.memory.allocate<TimeSpan[]>(
        'timer-time-spans',
        'demo-timer',
        [{ start: new Date(), stop: undefined }],
        'public'
      )
    );

    // Helper to update display state in memory
    const updateDisplayState = useCallback((
      newTimers: ITimerDisplayEntry[],
      newCards: IDisplayCardEntry[]
    ) => {
      const stateRefs = runtime.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          timerStack: newTimers,
          cardStack: newCards,
          workoutState: newTimers.length > 0 ? 'running' : 'idle',
        });
      }
      
      setTimerEntries(newTimers);
      setCardEntries(newCards);
    }, [runtime]);

    // Push a new timer
    const pushTimer = useCallback(() => {
      const labels = ['AMRAP 20', 'EMOM 12', 'Tabata', 'Rest Period', 'For Time'];
      const formats: ('countdown' | 'countup')[] = ['countdown', 'countup', 'countdown', 'countdown', 'countup'];
      const idx = timerId % labels.length;
      
      const newEntry: ITimerDisplayEntry = {
        id: `timer-${timerId}`,
        ownerId: `block-${timerId}`,
        timerMemoryId: timerRef.id,
        label: labels[idx],
        format: formats[idx],
        durationMs: formats[idx] === 'countdown' ? (Math.random() * 10 + 5) * 60 * 1000 : undefined,
        buttons: [
          { id: 'skip', label: 'Skip', eventName: 'timer:skip', variant: 'ghost' }
        ]
      };
      
      const newTimers = [...timerEntries, newEntry];
      updateDisplayState(newTimers, cardEntries);
      setTimerId(id => id + 1);
    }, [timerEntries, cardEntries, timerId, timerRef.id, updateDisplayState]);

    // Pop the top timer
    const popTimer = useCallback(() => {
      if (timerEntries.length === 0) return;
      const newTimers = timerEntries.slice(0, -1);
      updateDisplayState(newTimers, cardEntries);
    }, [timerEntries, cardEntries, updateDisplayState]);

    // Push a new card
    const pushCard = useCallback(() => {
      const types: IDisplayCardEntry['type'][] = ['active-block', 'rest-period', 'active-block'];
      const titles = ['10 Burpees', 'Rest', '15 Box Jumps'];
      const idx = cardId % types.length;
      
      const newEntry: IDisplayCardEntry = {
        id: `card-${cardId}`,
        ownerId: `block-${cardId}`,
        type: types[idx],
        title: titles[idx],
        subtitle: types[idx] === 'rest-period' ? '1:00 rest between rounds' : 'Round ' + Math.ceil(cardId / 2),
        metrics: types[idx] === 'active-block' ? [
          { type: 'reps', value: idx === 0 ? 10 : 15, image: idx === 0 ? '10' : '15' },
          { type: 'effort', value: titles[idx].split(' ')[1], image: titles[idx].split(' ')[1] }
        ] : undefined,
        buttons: types[idx] === 'rest-period' ? [
          { id: 'skip-rest', label: 'Skip Rest', eventName: 'rest:skip', variant: 'ghost' }
        ] : [
          { id: 'complete', label: 'Done', eventName: 'effort:complete', variant: 'secondary' }
        ]
      };
      
      const newCards = [...cardEntries, newEntry];
      updateDisplayState(timerEntries, newCards);
      setCardId(id => id + 1);
    }, [timerEntries, cardEntries, cardId, updateDisplayState]);

    // Pop the top card
    const popCard = useCallback(() => {
      if (cardEntries.length === 0) return;
      const newCards = cardEntries.slice(0, -1);
      updateDisplayState(timerEntries, newCards);
    }, [timerEntries, cardEntries, updateDisplayState]);

    // Handle button clicks from the display
    const handleButtonClick = useCallback((eventName: string, payload?: Record<string, unknown>) => {
      console.log('Button clicked:', eventName, payload);
      alert(`Event: ${eventName}\nPayload: ${JSON.stringify(payload || {})}`);
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <div className="space-y-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Stack Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Timer Stack Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Timer Stack</span>
                    <Badge variant="outline">{timerEntries.length}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={pushTimer} size="sm">Push Timer</Button>
                    <Button onClick={popTimer} size="sm" variant="outline" disabled={timerEntries.length === 0}>
                      Pop Timer
                    </Button>
                  </div>
                </div>
                
                {/* Card Stack Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Card Stack</span>
                    <Badge variant="outline">{cardEntries.length}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={pushCard} size="sm">Push Card</Button>
                    <Button onClick={popCard} size="sm" variant="outline" disabled={cardEntries.length === 0}>
                      Pop Card
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The actual display */}
          <StackedClockDisplay 
            showStackDebug={true}
            onButtonClick={handleButtonClick}
          />
        </div>
      </RuntimeProvider>
    );
  },
};

/**
 * Idle Start State - No timers or cards, workout not started
 */
export const IdleStart: Story = {
  render: () => {
    const runtime = useMemo(() => {
      const rt = createTestRuntime();
      // Set workout state to idle
      const stateRefs = rt.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          ...createDefaultDisplayState(),
          workoutState: 'idle'
        });
      }
      return rt;
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <StackedClockDisplay />
      </RuntimeProvider>
    );
  },
};

/**
 * Workout Complete State - Shows analytics card
 */
export const WorkoutComplete: Story = {
  render: () => {
    const runtime = useMemo(() => {
      const rt = createTestRuntime();
      const stateRefs = rt.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          ...createDefaultDisplayState(),
          workoutState: 'complete'
        });
      }
      return rt;
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <StackedClockDisplay />
      </RuntimeProvider>
    );
  },
};

/**
 * Active Workout - Timer with active block card
 */
export const ActiveWorkout: Story = {
  render: () => {
    const runtime = useMemo(() => {
      const rt = createTestRuntime();
      
      // Create a timer memory
      const timerRef = rt.memory.allocate<TimeSpan[]>(
        'timer-time-spans',
        'amrap-block',
        [{ start: new Date(Date.now() - 5 * 60 * 1000), stop: undefined }],
        'public'
      );
      
      // Set up display state with active timer and card
      const stateRefs = rt.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          timerStack: [{
            id: 'timer-amrap',
            ownerId: 'amrap-block',
            timerMemoryId: timerRef.id,
            label: 'AMRAP 20',
            format: 'countdown',
            durationMs: 20 * 60 * 1000,
          }],
          cardStack: [{
            id: 'card-effort',
            ownerId: 'effort-block',
            type: 'active-block',
            title: '10 Pull-ups',
            subtitle: 'Round 3',
            metrics: [
              { type: 'reps', value: 10, image: '10' },
              { type: 'effort', value: 'Pull-ups', image: 'Pull-ups' }
            ],
            buttons: [
              { id: 'done', label: 'Done', eventName: 'effort:complete', variant: 'primary' }
            ]
          }],
          workoutState: 'running',
          currentRound: 3,
          totalRounds: undefined,
        });
      }
      
      return rt;
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <StackedClockDisplay />
      </RuntimeProvider>
    );
  },
};

/**
 * Rest Period - Shows rest card between efforts
 */
export const RestPeriod: Story = {
  render: () => {
    const runtime = useMemo(() => {
      const rt = createTestRuntime();
      
      // Create a timer memory for rest
      const timerRef = rt.memory.allocate<TimeSpan[]>(
        'timer-time-spans',
        'rest-block',
        [{ start: new Date(Date.now() - 30 * 1000), stop: undefined }],
        'public'
      );
      
      const stateRefs = rt.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          timerStack: [{
            id: 'timer-rest',
            ownerId: 'rest-block',
            timerMemoryId: timerRef.id,
            label: 'Rest',
            format: 'countdown',
            durationMs: 60 * 1000,
          }],
          cardStack: [{
            id: 'card-rest',
            ownerId: 'rest-block',
            type: 'rest-period',
            title: 'Rest',
            subtitle: 'Get ready for Round 4',
            buttons: [
              { id: 'skip', label: 'Skip Rest', eventName: 'rest:skip', variant: 'ghost' }
            ]
          }],
          workoutState: 'running',
          currentRound: 3,
          totalRounds: 5,
        });
      }
      
      return rt;
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <StackedClockDisplay />
      </RuntimeProvider>
    );
  },
};

/**
 * Nested Timers - Multiple timers stacked (global + segment)
 */
export const NestedTimers: Story = {
  render: () => {
    const runtime = useMemo(() => {
      const rt = createTestRuntime();
      
      // Create global timer (total workout time)
      const globalTimerRef = rt.memory.allocate<TimeSpan[]>(
        'timer-time-spans',
        'global-timer',
        [{ start: new Date(Date.now() - 12 * 60 * 1000), stop: undefined }],
        'public'
      );
      
      // Create segment timer (current interval)
      const segmentTimerRef = rt.memory.allocate<TimeSpan[]>(
        'timer-time-spans',
        'segment-timer',
        [{ start: new Date(Date.now() - 45 * 1000), stop: undefined }],
        'public'
      );
      
      const stateRefs = rt.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });
      
      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        stateRef.set({
          timerStack: [
            // Global timer at bottom (priority 0 = shown in background/header)
            {
              id: 'timer-global',
              ownerId: 'global-timer',
              timerMemoryId: globalTimerRef.id,
              label: 'Total Time',
              format: 'countup',
              priority: 0,
            },
            // Segment timer on top (priority 100 = main display)
            {
              id: 'timer-segment',
              ownerId: 'segment-timer',
              timerMemoryId: segmentTimerRef.id,
              label: 'EMOM Minute 7',
              format: 'countdown',
              durationMs: 60 * 1000,
              priority: 100,
            }
          ],
          cardStack: [{
            id: 'card-effort',
            ownerId: 'effort-block',
            type: 'active-block',
            title: '12 Kettlebell Swings',
            subtitle: 'Minute 7 of 12',
            metrics: [
              { type: 'reps', value: 12, image: '12' },
              { type: 'effort', value: 'KB Swings', image: 'Kettlebell Swings' },
              { type: 'weight', value: '24kg', image: '24kg' }
            ]
          }],
          workoutState: 'running',
          currentRound: 7,
          totalRounds: 12,
        });
      }
      
      return rt;
    }, []);

    return (
      <RuntimeProvider runtime={runtime}>
        <StackedClockDisplay showStackDebug={true} />
      </RuntimeProvider>
    );
  },
};
