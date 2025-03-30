import React, { useState, useEffect } from 'react';
import UnifiedTimerDisplay from './UnifiedTimerDisplay';
import { TimerDisplay } from '../../core/timer.types';

/**
 * Timer demonstration component to showcase different timer states and displays
 */
export const TimerDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  
  // Sample timer displays for demonstration
  const demoDisplays: TimerDisplay[] = [
    // Basic mode - Idle state
    {
      displayMode: 'basic',
      elapsed: 0,
      state: 'idle',
      label: 'Workout Ready',
      round: 0,
      totalRounds: 5
    },
    
    // Basic mode - Running state
    {
      displayMode: 'basic',
      elapsed: 45000, // 45 seconds
      state: 'running',
      label: 'AMRAP 10',
      round: 1,
      totalRounds: 5
    },
    
    // Basic mode - Paused state
    {
      displayMode: 'basic',
      elapsed: 125000, // 2:05
      remaining: 475000, // 7:55
      state: 'paused',
      label: 'AMRAP 10',
      round: 2,
      totalRounds: 5
    },
    
    // Basic mode - Complete state
    {
      displayMode: 'basic',
      elapsed: 600000, // 10:00
      state: 'complete',
      label: 'AMRAP 10',
      round: 5,
      totalRounds: 5
    },
    
    // Enhanced mode - Idle state
    {
      displayMode: 'enhanced',
      elapsed: 0,
      state: 'idle',
      label: 'Workout Ready',
      round: 0,
      totalRounds: 5
    },
    
    // Enhanced mode - Running with movement
    {
      displayMode: 'enhanced',
      elapsed: 67000, // 1:07
      remaining: 533000, // 8:53
      state: 'running',
      label: 'CrossFit Open 23.1',
      round: 1,
      totalRounds: 5,
      currentMovement: 'Wall Balls',
      targetReps: 30,
      completedReps: 12,
      intensity: 'medium'
    },
    
    // Enhanced mode - Rest period
    {
      displayMode: 'enhanced',
      elapsed: 187000, // 3:07
      remaining: 30000, // 0:30 rest
      state: 'running',
      label: 'CrossFit Open 23.1',
      round: 2,
      totalRounds: 5,
      currentMovement: 'Rest',
      isRestPeriod: true,
      workInterval: 120,
      restInterval: 60
    },
    
    // Enhanced mode - With all metrics
    {
      displayMode: 'enhanced',
      elapsed: 358000, // 5:58
      remaining: 242000, // 4:02
      state: 'running',
      label: 'CrossFit Open 23.1',
      round: 3,
      totalRounds: 5,
      currentMovement: 'Burpees',
      targetReps: 15,
      completedReps: 9,
      intensity: 'high',
      workInterval: 120,
      restInterval: 60,
      caloriesBurned: 187,
      movementEfficiency: 92,
      heatNumber: 3,
      laneNumber: 2,
      athleteName: 'John Doe',
    },
    
    // Enhanced mode - Audio alert
    {
      displayMode: 'enhanced',
      elapsed: 580000, // 9:40
      remaining: 20000, // 0:20
      state: 'running',
      label: 'CrossFit Open 23.1',
      round: 4,
      totalRounds: 5,
      currentMovement: 'Pull-ups',
      targetReps: 20,
      completedReps: 18,
      intensity: 'high',
      audioAlert: 'timeWarning'
    },
    
    // Enhanced mode - Complete
    {
      displayMode: 'enhanced',
      elapsed: 600000, // 10:00
      state: 'complete',
      label: 'CrossFit Open 23.1',
      round: 5,
      totalRounds: 5,
      caloriesBurned: 321,
      movementEfficiency: 88,
      heatNumber: 3,
      laneNumber: 2,
      athleteName: 'John Doe'
    }
  ];
  
  // Auto-advance through demos
  useEffect(() => {
    // For running states, simulate the elapsed time increasing
    const updateTimer = setInterval(() => {
      const display = demoDisplays[currentDemo];
      if (display.state === 'running') {
        setElapsed(prev => prev + 1000); // Add 1 second
      }
    }, 1000);
    
    // Change demo every 5 seconds
    const changeDemoTimer = setTimeout(() => {
      setCurrentDemo(prev => (prev + 1) % demoDisplays.length);
      setElapsed(0); // Reset the elapsed time for the new demo
    }, 5000);
    
    return () => {
      clearInterval(updateTimer);
      clearTimeout(changeDemoTimer);
    };
  }, [currentDemo]);
  
  // Get the current display and add the simulated elapsed time if in running state
  const getCurrentDisplay = (): TimerDisplay => {
    const display = { ...demoDisplays[currentDemo] };
    
    if (display.state === 'running') {
      display.elapsed += elapsed;
      if (display.remaining !== undefined) {
        display.remaining = Math.max(0, display.remaining - elapsed);
      }
    }
    
    return display;
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Timer Demo - Mode: {getCurrentDisplay().displayMode}</h2>
      <div className="mb-4">
        <UnifiedTimerDisplay display={getCurrentDisplay()} />
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Manual Demo Selection</h3>
        <div className="flex flex-wrap gap-2">
          {demoDisplays.map((demo, index) => (
            <button
              key={index}
              className={`px-3 py-1 rounded ${currentDemo === index ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => {
                setCurrentDemo(index);
                setElapsed(0);
              }}
            >
              {demo.displayMode} - {demo.state}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimerDemo;
