import AnalyticsIndexPanel from '@/components/layout/AnalyticsIndexPanel';
import type { Meta, StoryObj } from '@storybook/react';

// Define Segment interface locally for stories
// Define Segment interface locally for stories
interface Segment {
  id: number;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  parentId: number | null;
  depth: number;
  metrics: Record<string, number>;
  lane: number;
}

const meta: Meta<typeof AnalyticsIndexPanel> = {
  title: 'Components/ResultsView',
  component: AnalyticsIndexPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectSegment: { action: 'selected' },
  },
};

export default meta;
type Story = StoryObj<typeof AnalyticsIndexPanel>;

// --- Mock Data Generators ---

const generateSegments = (count: number, complexity: 'simple' | 'complex'): Segment[] => {
  const segments: Segment[] = [];
  let currentTime = 0;
  
  // Root
  segments.push({
    id: 1,
    name: 'Full Workout',
    type: 'root',
    startTime: 0,
    endTime: count * 60,
    duration: count * 60,
    parentId: null,
    depth: 0,
    metrics: { power: 150, heart_rate: 130 },
    lane: 0
  });

  if (complexity === 'simple') {
    for (let i = 0; i < count; i++) {
      segments.push({
        id: i + 2,
        name: `Interval ${i + 1}`,
        type: i % 2 === 0 ? 'work' : 'rest',
        startTime: currentTime,
        endTime: currentTime + 60,
        duration: 60,
        parentId: 1,
        depth: 1,
        metrics: { 
          power: i % 2 === 0 ? 200 : 50,
          heart_rate: i % 2 === 0 ? 160 : 110
        },
        lane: 1
      });
      currentTime += 60;
    }
  } else {
    // Complex nested structure
    let idCounter = 2;
    
    // Warmup
    segments.push({
      id: idCounter++,
      name: 'Warmup',
      type: 'warmup',
      startTime: 0,
      endTime: 300,
      duration: 300,
      parentId: 1,
      depth: 1,
      metrics: { power: 100, heart_rate: 110 },
      lane: 1
    });
    
    // Main Set
    const mainSetId = idCounter++;
    segments.push({
      id: mainSetId,
      name: 'Main Set',
      type: 'work',
      startTime: 300,
      endTime: 900,
      duration: 600,
      parentId: 1,
      depth: 1,
      metrics: { power: 180, heart_rate: 150 },
      lane: 1
    });

    // Rounds inside Main Set
    for (let r = 0; r < 3; r++) {
      const roundId = idCounter++;
      const roundStart = 300 + (r * 200);
      segments.push({
        id: roundId,
        name: `Round ${r + 1}`,
        type: 'rounds',
        startTime: roundStart,
        endTime: roundStart + 200,
        duration: 200,
        parentId: mainSetId,
        depth: 2,
        metrics: { power: 180, heart_rate: 150 },
        lane: 2
      });

      // Movements inside Round
      segments.push({
        id: idCounter++,
        name: 'Run 400m',
        type: 'run',
        startTime: roundStart,
        endTime: roundStart + 120,
        duration: 120,
        parentId: roundId,
        depth: 3,
        metrics: { power: 200, heart_rate: 160, cadence: 180 },
        lane: 3
      });
      
      segments.push({
        id: idCounter++,
        name: '15 Burpees',
        type: 'burpees',
        startTime: roundStart + 120,
        endTime: roundStart + 200,
        duration: 80,
        parentId: roundId,
        depth: 3,
        metrics: { heart_rate: 170 }, // No power for burpees
        lane: 3
      });
    }

    // Cooldown
    segments.push({
      id: idCounter++,
      name: 'Cooldown',
      type: 'cooldown',
      startTime: 900,
      endTime: 1200,
      duration: 300,
      parentId: 1,
      depth: 1,
      metrics: { power: 80, heart_rate: 100 },
      lane: 1
    });
  }

  return segments;
};

const generateWorkoutData = (type: 'amrap' | 'emom' | 'rounds'): Segment[] => {
  const segments: Segment[] = [];
  let idCounter = 1;

  if (type === 'amrap') {
    // Cindy: 20 min AMRAP of 5 Pull-ups, 10 Push-ups, 15 Squats
    const duration = 20 * 60;
    const rootId = idCounter++;
    
    segments.push({
      id: rootId,
      name: 'AMRAP 20: Cindy',
      type: 'root',
      startTime: 0,
      endTime: duration,
      duration: duration,
      parentId: null,
      depth: 0,
      metrics: { power: 140, heart_rate: 155 },
      lane: 0
    });

    let currentTime = 0;
    let round = 1;
    // Simulate rounds until time is up
    while (currentTime < duration) {
       // Variation in round times
       const pullupTime = 10 + Math.random() * 5;
       const pushupTime = 15 + Math.random() * 5;
       const squatTime = 20 + Math.random() * 5;
       const transitionTime = 5 + Math.random() * 5;
       
       const roundDuration = pullupTime + pushupTime + squatTime + transitionTime;
       
       // Don't add partial round if it exceeds time significantly (simplified logic)
       if (currentTime + roundDuration > duration + 30) break;

       const roundId = idCounter++;
       const roundEnd = Math.min(currentTime + roundDuration, duration);
       
       segments.push({
         id: roundId,
         name: `Round ${round}`,
         type: 'round',
         startTime: currentTime,
         endTime: roundEnd,
         duration: roundEnd - currentTime,
         parentId: rootId,
         depth: 1,
         metrics: { 
           power: 150 - (round * 0.5),
           heart_rate: 140 + (round * 0.5)
         },
         lane: 1
       });

       // Movements
       let moveStart = currentTime;
       
       // Pullups
       segments.push({
         id: idCounter++,
         name: '5 Pull-ups',
         type: 'work',
         startTime: moveStart,
         endTime: moveStart + pullupTime,
         duration: pullupTime,
         parentId: roundId,
         depth: 2,
         metrics: { power: 160, heart_rate: 145 },
         lane: 2
       });
       moveStart += pullupTime;

       // Pushups
       segments.push({
         id: idCounter++,
         name: '10 Push-ups',
         type: 'work',
         startTime: moveStart,
         endTime: moveStart + pushupTime,
         duration: pushupTime,
         parentId: roundId,
         depth: 2,
         metrics: { power: 140, heart_rate: 150 },
         lane: 2
       });
       moveStart += pushupTime;

       // Squats
       segments.push({
         id: idCounter++,
         name: '15 Squats',
         type: 'work',
         startTime: moveStart,
         endTime: moveStart + squatTime,
         duration: squatTime,
         parentId: roundId,
         depth: 2,
         metrics: { power: 130, heart_rate: 155 },
         lane: 2
       });

       currentTime = roundEnd;
       round++;
    }
  } else if (type === 'emom') {
    // EMOM 10: 15 Wall Balls
    const minutes = 10;
    const duration = minutes * 60;
    const rootId = idCounter++;

    segments.push({
      id: rootId,
      name: 'EMOM 10: Wall Balls',
      type: 'root',
      startTime: 0,
      endTime: duration,
      duration: duration,
      parentId: null,
      depth: 0,
      metrics: { power: 160, heart_rate: 150 },
      lane: 0
    });

    for (let i = 0; i < minutes; i++) {
      const intervalStart = i * 60;
      const intervalId = idCounter++;
      
      segments.push({
        id: intervalId,
        name: `Minute ${i + 1}`,
        type: 'interval',
        startTime: intervalStart,
        endTime: intervalStart + 60,
        duration: 60,
        parentId: rootId,
        depth: 1,
        metrics: { power: 160, heart_rate: 150 },
        lane: 1
      });

      // Work portion (e.g., 35-45 seconds)
      const workDuration = 35 + Math.random() * 10;
      const restDuration = 60 - workDuration;

      segments.push({
        id: idCounter++,
        name: '15 Wall Balls',
        type: 'work',
        startTime: intervalStart,
        endTime: intervalStart + workDuration,
        duration: workDuration,
        parentId: intervalId,
        depth: 2,
        metrics: { power: 200, heart_rate: 165 },
        lane: 2
      });

      segments.push({
        id: idCounter++,
        name: 'Rest',
        type: 'rest',
        startTime: intervalStart + workDuration,
        endTime: intervalStart + 60,
        duration: restDuration,
        parentId: intervalId,
        depth: 2,
        metrics: { power: 0, heart_rate: 140 },
        lane: 2
      });
    }
  } else if (type === 'rounds') {
    // Helen: 3 Rounds for Time
    // Run 400m, 21 KB Swings, 12 Pull-ups
    const rootId = idCounter++;
    let currentTime = 0;

    segments.push({
      id: rootId,
      name: 'Helen: 3 RFT',
      type: 'root',
      startTime: 0,
      endTime: 0, // Will update at end
      duration: 0,
      parentId: null,
      depth: 0,
      metrics: { power: 180, heart_rate: 170 },
      lane: 0
    });

    for (let r = 1; r <= 3; r++) {
      const roundStart = currentTime;
      const roundId = idCounter++;
      
      // Run 400m (~2 mins)
      const runTime = 110 + Math.random() * 20;
      // KBS (~1 min)
      const kbsTime = 50 + Math.random() * 10;
      // Pullups (~40s)
      const pullupTime = 30 + Math.random() * 15;
      
      const roundDuration = runTime + kbsTime + pullupTime;

      segments.push({
        id: roundId,
        name: `Round ${r}`,
        type: 'round',
        startTime: roundStart,
        endTime: roundStart + roundDuration,
        duration: roundDuration,
        parentId: rootId,
        depth: 1,
        metrics: { power: 180, heart_rate: 170 },
        lane: 1
      });

      let moveStart = roundStart;

      segments.push({
        id: idCounter++,
        name: 'Run 400m',
        type: 'run',
        startTime: moveStart,
        endTime: moveStart + runTime,
        duration: runTime,
        parentId: roundId,
        depth: 2,
        metrics: { power: 190, heart_rate: 175, cadence: 180 },
        lane: 2
      });
      moveStart += runTime;

      segments.push({
        id: idCounter++,
        name: '21 KB Swings',
        type: 'kbs',
        startTime: moveStart,
        endTime: moveStart + kbsTime,
        duration: kbsTime,
        parentId: roundId,
        depth: 2,
        metrics: { power: 170, heart_rate: 170 },
        lane: 2
      });
      moveStart += kbsTime;

      segments.push({
        id: idCounter++,
        name: '12 Pull-ups',
        type: 'pullups',
        startTime: moveStart,
        endTime: moveStart + pullupTime,
        duration: pullupTime,
        parentId: roundId,
        depth: 2,
        metrics: { power: 160, heart_rate: 165 },
        lane: 2
      });
      
      currentTime += roundDuration;
    }

    // Update root duration
    segments[0].endTime = currentTime;
    segments[0].duration = currentTime;
  }

  return segments;
};

export const Default: Story = {
  args: {
    segments: generateSegments(5, 'simple'),
    className: 'w-[350px] border-r h-[600px]',
  },
};

export const ComplexHierarchy: Story = {
  args: {
    segments: generateSegments(1, 'complex'),
    className: 'w-[400px] border-r h-[800px]',
  },
};

export const AMRAP_Cindy: Story = {
  args: {
    segments: generateWorkoutData('amrap'),
    className: 'w-[400px] border-r h-[800px]',
  },
};

export const EMOM_WallBalls: Story = {
  args: {
    segments: generateWorkoutData('emom'),
    className: 'w-[400px] border-r h-[800px]',
  },
};

export const Rounds_Helen: Story = {
  args: {
    segments: generateWorkoutData('rounds'),
    className: 'w-[400px] border-r h-[800px]',
  },
};

export const WithSelection: Story = {
  args: {
    segments: generateSegments(5, 'simple'),
    selectedSegmentIds: new Set([2, 4]),
    className: 'w-[350px] border-r h-[600px]',
  },
};

export const Empty: Story = {
  args: {
    segments: [],
    className: 'w-[350px] border-r h-[600px]',
  },
};

export const MobileView: Story = {
  args: {
    segments: generateSegments(5, 'simple'),
    mobile: true,
    className: 'w-full h-[600px]',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const ReadOnly: Story = {
  args: {
    segments: generateSegments(5, 'simple'),
    className: 'w-[350px] border-r h-[600px]',
    onSelectSegment: undefined, // Explicitly undefined to trigger read-only mode
  },
};
