/**
 * WorkoutTimerDialog - Dialog for executing workouts with timer controls
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WodBlock } from '../types';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { JitCompiler } from '../../runtime/JitCompiler';
import { WodScript } from '../../WodScript';
import { RuntimeProvider } from '../../runtime/context/RuntimeContext';
import { ClockAnchor } from '../../clock/anchors/ClockAnchor';
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
 */
export const WorkoutTimerDialog: React.FC<WorkoutTimerDialogProps> = ({
  open,
  onOpenChange,
  block
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [blockKey, setBlockKey] = useState<string | null>(null);

  // Initialize runtime when dialog opens
  useEffect(() => {
    if (open && block.statements) {
      // Create WodScript from block statements
      const script = new WodScript(block.content, block.statements);
      
      // Create JIT compiler with empty strategies (will use default ones)
      const jitCompiler = new JitCompiler([]);
      
      // Create runtime
      const newRuntime = new ScriptRuntime(script, jitCompiler);
      
      // Compile the script
      const compiledBlock = jitCompiler.compile(block.statements, newRuntime);
      
      if (compiledBlock) {
        // Mount the block to initialize it
        compiledBlock.mount(newRuntime);
        setRuntime(newRuntime);
        setBlockKey(compiledBlock.key.toString());
      }
    }
    
    // Cleanup when dialog closes
    return () => {
      if (runtime) {
        // Cleanup runtime if needed
        setRuntime(null);
        setBlockKey(null);
        setIsRunning(false);
      }
    };
  }, [open, block]);

  // Handle start/resume
  const handleStart = () => {
    if (runtime && blockKey) {
      // Find timer memory references
      const isRunningRefs = runtime.memory.search({
        id: null,
        ownerId: blockKey,
        type: 'timer:isRunning',
        visibility: null
      });

      if (isRunningRefs.length > 0) {
        const isRunningRef = isRunningRefs[0];
        isRunningRef.set(true);
        setIsRunning(true);
      }
    }
  };

  // Handle pause
  const handlePause = () => {
    if (runtime && blockKey) {
      // Find timer memory references
      const isRunningRefs = runtime.memory.search({
        id: null,
        ownerId: blockKey,
        type: 'timer:isRunning',
        visibility: null
      });

      if (isRunningRefs.length > 0) {
        const isRunningRef = isRunningRefs[0];
        isRunningRef.set(false);
        setIsRunning(false);
      }
    }
  };

  // Handle stop
  const handleStop = () => {
    if (runtime && blockKey) {
      // Stop timer and reset
      const isRunningRefs = runtime.memory.search({
        id: null,
        ownerId: blockKey,
        type: 'timer:isRunning',
        visibility: null
      });

      if (isRunningRefs.length > 0) {
        const isRunningRef = isRunningRefs[0];
        isRunningRef.set(false);
        setIsRunning(false);
      }
      
      // Close dialog
      onOpenChange(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (runtime && blockKey) {
      // Reset timer
      const timeSpansRefs = runtime.memory.search({
        id: null,
        ownerId: blockKey,
        type: 'timer:timeSpans',
        visibility: null
      });
      
      const isRunningRefs = runtime.memory.search({
        id: null,
        ownerId: blockKey,
        type: 'timer:isRunning',
        visibility: null
      });

      if (timeSpansRefs.length > 0) {
        timeSpansRefs[0].set([]);
      }
      
      if (isRunningRefs.length > 0) {
        isRunningRefs[0].set(false);
        setIsRunning(false);
      }
    }
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
          {runtime && blockKey && (
            <RuntimeProvider runtime={runtime}>
              <div className="flex justify-center py-8">
                <ClockAnchor
                  blockKey={blockKey}
                  timerType="countup"
                  className="text-6xl font-mono"
                />
              </div>
            </RuntimeProvider>
          )}

          {/* No runtime yet */}
          {!runtime && (
            <div className="text-center py-8 text-muted-foreground">
              Initializing workout...
            </div>
          )}

          {/* Timer Controls */}
          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                Start
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
            >
              <RotateCcw className="h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* Workout Content Preview */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Workout
            </h4>
            <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
              {block.content}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
