/**
 * WorkoutTimerDialog - Dialog for executing workouts with timer controls
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/headless/Dialog';
import { Button } from '@/components/ui/button';
import { WodBlock } from '../types';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

export interface WorkoutTimerDialogProps {
  /** Whether dialog is open */
  open: boolean;
  
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  
  /** WOD block to execute */
  block: WodBlock;
}

/**
 * Dialog component for executing workouts with timer
 * 
 * This is a simplified version that displays a stopwatch timer.
 * Full runtime integration will be implemented in a future iteration.
 */
export const WorkoutTimerDialog: React.FC<WorkoutTimerDialogProps> = ({
  open,
  onOpenChange,
  block
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);

  // Reset timer when dialog opens
  useEffect(() => {
    if (open) {
      setIsRunning(false);
      setElapsedMs(0);
      setStartTime(null);
      setPausedTime(0);
    }
  }, [open]);

  // Timer tick effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRunning && startTime !== null) {
      intervalId = setInterval(() => {
        const now = Date.now();
        setElapsedMs(now - startTime + pausedTime);
      }, 10); // Update every 10ms for smooth display
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, startTime, pausedTime]);

  // Handle start/resume
  const handleStart = useCallback(() => {
    setStartTime(Date.now());
    setIsRunning(true);
  }, []);

  // Handle pause
  const handlePause = useCallback(() => {
    if (startTime !== null) {
      setPausedTime(Date.now() - startTime + pausedTime);
    }
    setIsRunning(false);
    setStartTime(null);
  }, [startTime, pausedTime]);

  // Handle stop
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setElapsedMs(0);
    setStartTime(null);
    setPausedTime(0);
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle reset
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setElapsedMs(0);
    setStartTime(null);
    setPausedTime(0);
  }, []);

  // Format time for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Workout Timer</DialogTitle>
          <DialogDescription>
            Lines {block.startLine + 1} - {block.endLine + 1}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timer Display */}
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="text-6xl font-mono font-bold mb-2 text-foreground">
                {formatTime(elapsedMs)}
              </div>
              <div className="text-sm text-muted-foreground">
                {isRunning ? 'Running' : 'Stopped'}
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                {elapsedMs > 0 ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            )}
            
            <Button
              onClick={handleStop}
              size="lg"
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
            
            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={isRunning}
            >
              <RotateCcw className="h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* Workout Content Preview */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Workout
            </h4>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded">
              {block.content}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
