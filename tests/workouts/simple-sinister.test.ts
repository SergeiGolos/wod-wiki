import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Simple and Sinister - Sequential Timed Blocks
 * 
 * Stack Expectations:
 * - mount() → pushes first timed block (5:00 timer + 100 KB Swings)
 * - Timer expires or reps complete → next() pushes 1:00 Rest timer
 * - Rest expires → next() pushes 10:00 timer + 10 Turkish Getups
 * - Final block completes → workout done
 * 
 * Report Expectations:
 * - Time to complete swings (target: under 5:00)
 * - Time to complete getups (target: under 10:00)
 * - Total workout time
 */
describe('Simple and Sinister (Sequential Timed Blocks)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`)
      .withStrategy(new GenericTimerStrategy())
      .withStrategy(new GenericGroupStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push first timed block on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(1);
    expect(harness.currentBlock?.label).toContain('KB Swings');
  });

  it('should progress through blocks as timers expire', () => {
    harness.mount();
    expect(harness.currentBlock?.label).toContain('KB Swings');
    
    // Complete swings before timer
    harness.next();
    
    // Rest timer starts
    expect(harness.currentBlock?.label).toContain('Rest');
    harness.advanceClock(60 * 1000); // 1 minute rest
    harness.addRestTime(60 * 1000);
    
    // Auto-advances to getups
    harness.next();
    expect(harness.currentBlock?.label).toContain('Turkish Getups');
    
    // Complete getups
    harness.next();
    expect(harness.isComplete()).toBe(true);
  });

  it('should cap swings block when 5:00 timer expires', () => {
    harness.mount();
    
    // Don't complete swings - let timer run out
    harness.advanceClock(5 * 60 * 1000); // 5 minutes
    
    // Timer expiration should trigger auto-advance
    // Note: This tests timer-based completion behavior
    harness.next(); // Move past expired timer block
    
    // Should advance to rest regardless of reps completed
    expect(harness.currentBlock?.label).toContain('Rest');
  });

  it('should allow early completion during any block', () => {
    harness.mount();
    harness.next(); // Complete swings
    
    // User stops during rest period
    harness.advanceClock(30 * 1000); // 30 seconds into rest
    harness.addRestTime(30 * 1000);
    harness.complete();
    
    const report = harness.getReport();
    expect(harness.isComplete()).toBe(true);
    // Getups not completed
    expect(report.totalReps['Turkish Getups 70lb'] ?? 0).toBe(0);
    // Swings completed
    expect(report.totalReps['KB Swings 70lb']).toBe(100);
  });

  it('should track time for each segment', () => {
    harness.mount();
    
    // Complete swings in 4 minutes
    harness.advanceClock(4 * 60 * 1000);
    harness.next();
    
    // Rest for 1 minute
    harness.advanceClock(60 * 1000);
    harness.addRestTime(60 * 1000);
    harness.next();
    
    // Complete getups in 8 minutes
    harness.advanceClock(8 * 60 * 1000);
    harness.next();
    
    const report = harness.getReport();
    expect(report.outputs.length).toBeGreaterThan(0);
    // Total: 4 + 1 + 8 = 13 minutes
    expect(report.elapsedTime).toBe(13 * 60 * 1000);
  });

  it('should complete when all blocks are done', () => {
    harness.mount();
    
    harness.next(); // KB Swings
    harness.advanceClock(60 * 1000);
    harness.addRestTime(60 * 1000);
    harness.next(); // Rest
    harness.next(); // Turkish Getups
    
    expect(harness.isComplete()).toBe(true);
  });

  it('should track total reps for each exercise', () => {
    harness.mount();
    
    harness.next(); // 100 KB Swings
    harness.advanceClock(60 * 1000);
    harness.next(); // Rest
    harness.next(); // 10 Turkish Getups
    
    const report = harness.getReport();
    expect(report.totalReps['KB Swings 70lb']).toBe(100);
    expect(report.totalReps['Turkish Getups 70lb']).toBe(10);
  });
});
