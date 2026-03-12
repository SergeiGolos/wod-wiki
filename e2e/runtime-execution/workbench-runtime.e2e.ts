import { test, expect } from '@playwright/test';
import { WorkbenchPage } from '../pages/WorkbenchPage';

test.describe('Workbench Runtime Execution', () => {
  let workbench: WorkbenchPage;

  test.beforeEach(async ({ page }) => {
    workbench = new WorkbenchPage(page);
  });

  test('Fixed Rounds - 3 rounds of 1s exercise', async () => {
    await workbench.gotoTestingStory('Loops/Fixed Rounds');
    
    // Check initial state
    await workbench.expectActiveBlock('3 Rounds');
    await workbench.expectTimerValue('00:00');

    // Start workout
    await workbench.startWorkout();
    
    // Round 1
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100); // Wait for 1s block to complete
    
    // It should automatically transition to Rest (from the fixture: 1s Exercise, 1s Rest)
    await workbench.expectActiveBlock('Rest');
    await workbench.page.waitForTimeout(1100);

    // Round 2
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100);
    await workbench.expectActiveBlock('Rest');
    await workbench.page.waitForTimeout(1100);

    // Round 3
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100);
    await workbench.expectActiveBlock('Rest');
    await workbench.page.waitForTimeout(1100);

    // Completion check
    await workbench.expectWorkoutCompleted();
    
    // Validate results table
    const resultCount = await workbench.getResultsCount();
    expect(resultCount).toBe(6); // 3 rounds * (1 exercise + 1 rest)
  });

  test('For Time - Sequential blocks with next() manual advance', async () => {
    await workbench.gotoTestingStory('Loops/For Time');
    
    await workbench.expectActiveBlock('For Time');
    await workbench.startWorkout();

    // Block 1: 1s Exercise
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100);

    // Transition to Block 2: 1s Rest
    await workbench.expectActiveBlock('Rest');
    
    // Manual advance test
    await workbench.nextBlock();
    
    // Should be at Block 3: 1s Exercise
    await workbench.expectActiveBlock('Exercise');
    
    // Wait for completion
    await workbench.page.waitForTimeout(1100);
    
    await workbench.expectWorkoutCompleted();
  });

  test('AMRAP - 5s countdown', async () => {
    await workbench.gotoTestingStory('Loops/AMRAP');
    
    await workbench.expectActiveBlock('AMRAP 5s');
    await workbench.startWorkout();

    // Should show countdown from 00:05
    await workbench.expectTimerValue('00:05');
    
    // Wait for it to finish
    await workbench.page.waitForTimeout(5500);
    
    await workbench.expectWorkoutCompleted();
  });

  test('Metadata - Validate weight and reps in results', async () => {
    await workbench.gotoTestingStory('Blocks/Metadata');
    
    await workbench.startWorkout();
    
    // 10 Reps @ 20kg 1s Exercise
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100);
    
    // 100m @ Bodyweight 1s Exercise
    await workbench.expectActiveBlock('Exercise');
    await workbench.page.waitForTimeout(1100);
    
    // 10 kcal 1s Row
    await workbench.expectActiveBlock('Row');
    await workbench.page.waitForTimeout(1100);

    await workbench.expectWorkoutCompleted();
    
    // Check results for metadata
    await workbench.expectResultRow(0, { 'Exercise': '10', 'kg': '20' });
    await workbench.expectResultRow(1, { 'Exercise': '100', 'Bodyweight': '' });
    await workbench.expectResultRow(2, { 'Row': '10', 'kcal': '' });
  });

  test('Stop Workout - Early termination', async () => {
    await workbench.gotoTestingStory('Loops/Fixed Rounds');
    
    await workbench.startWorkout();
    await workbench.expectActiveBlock('Exercise');
    
    // Stop immediately
    await workbench.stopWorkout();
    
    // Should show results even if partial
    await workbench.expectWorkoutCompleted();
    const count = await workbench.getResultsCount();
    expect(count).toBeGreaterThan(0);
  });
});
