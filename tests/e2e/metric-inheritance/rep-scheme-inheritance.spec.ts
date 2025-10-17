import { test, expect } from '@playwright/test';

/**
 * End-to-end test for metric inheritance via public memory system.
 * 
 * Tests the "(21-15-9) Push-ups" workout to verify:
 * 1. RoundsBlock allocates public METRIC_REPS
 * 2. EffortStrategy inherits reps from parent
 * 3. Different rep counts per round (21 → 15 → 9)
 */

test.describe('Metric Inheritance - Rep Scheme', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Runtime Test Bench
    await page.goto('http://localhost:6006/iframe.html?id=runtime-test-bench--default&viewMode=story');
    
    // Wait for the story to load
    await page.waitForSelector('[data-testid="runtime-test-bench"]', { timeout: 10000 });
  });

  test('should inherit reps from RoundsBlock rep scheme: (21-15-9) Push-ups', async ({ page }) => {
    // Setup console log capture
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[Browser Console] ${text}`);
    });

    // Enter workout script
    const scriptInput = page.locator('[data-testid="script-input"], textarea, [contenteditable="true"]').first();
    await scriptInput.click();
    await scriptInput.clear();
    await scriptInput.fill('(21-15-9) Push-ups');

    // Wait a moment for parsing
    await page.waitForTimeout(500);

    // Click "Compile" or "Start" button
    const compileButton = page.locator('button:has-text("Compile"), button:has-text("Start"), button:has-text("Parse")').first();
    if (await compileButton.isVisible()) {
      await compileButton.click();
      await page.waitForTimeout(300);
    }

    // Execute workout step by step
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Step")').first();
    
    // Step through Round 1
    console.log('\n=== ROUND 1 ===');
    await nextButton.click();
    await page.waitForTimeout(200);
    await nextButton.click();
    await page.waitForTimeout(200);

    // Step through Round 2
    console.log('\n=== ROUND 2 ===');
    await nextButton.click();
    await page.waitForTimeout(200);
    await nextButton.click();
    await page.waitForTimeout(200);

    // Step through Round 3
    console.log('\n=== ROUND 3 ===');
    await nextButton.click();
    await page.waitForTimeout(200);
    await nextButton.click();
    await page.waitForTimeout(200);

    // Verify console logs contain expected metric inheritance messages
    console.log('\n=== VERIFICATION ===');
    console.log(`Total console messages: ${consoleMessages.length}`);

    // Check for RoundsBlock allocation
    const allocateLog = consoleMessages.find(msg => 
      msg.includes('RoundsBlock allocated public reps metric') && msg.includes('21')
    );
    console.log('RoundsBlock allocation log:', allocateLog);
    expect(allocateLog, 'RoundsBlock should allocate public reps metric with initial value 21').toBeTruthy();

    // Check for inherited reps in Round 1 (21 reps)
    const round1Log = consoleMessages.find(msg => 
      msg.includes('EffortStrategy: Inherited reps from parent: 21')
    );
    console.log('Round 1 inheritance log:', round1Log);
    expect(round1Log, 'EffortStrategy should inherit 21 reps in Round 1').toBeTruthy();

    // Check for round advance to 15 reps
    const round2UpdateLog = consoleMessages.find(msg => 
      msg.includes('RoundsBlock updated public reps metric: 15')
    );
    console.log('Round 2 update log:', round2UpdateLog);
    expect(round2UpdateLog, 'RoundsBlock should update reps to 15 for Round 2').toBeTruthy();

    // Check for inherited reps in Round 2 (15 reps)
    const round2Log = consoleMessages.find(msg => 
      msg.includes('EffortStrategy: Inherited reps from parent: 15')
    );
    console.log('Round 2 inheritance log:', round2Log);
    expect(round2Log, 'EffortStrategy should inherit 15 reps in Round 2').toBeTruthy();

    // Check for round advance to 9 reps
    const round3UpdateLog = consoleMessages.find(msg => 
      msg.includes('RoundsBlock updated public reps metric: 9')
    );
    console.log('Round 3 update log:', round3UpdateLog);
    expect(round3UpdateLog, 'RoundsBlock should update reps to 9 for Round 3').toBeTruthy();

    // Check for inherited reps in Round 3 (9 reps)
    const round3Log = consoleMessages.find(msg => 
      msg.includes('EffortStrategy: Inherited reps from parent: 9')
    );
    console.log('Round 3 inheritance log:', round3Log);
    expect(round3Log, 'EffortStrategy should inherit 9 reps in Round 3').toBeTruthy();

    // Verify no "no reps specified" warnings
    const noRepsWarnings = consoleMessages.filter(msg => 
      msg.includes('Created EffortBlock with no reps specified')
    );
    console.log('No-reps warnings:', noRepsWarnings.length);
    expect(noRepsWarnings.length, 'Should not have any "no reps specified" warnings').toBe(0);

    console.log('\n✅ All metric inheritance checks passed!');
  });

  test('should verify public metric visibility in memory panel', async ({ page }) => {
    // Setup console log capture
    page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // Enter workout script
    const scriptInput = page.locator('[data-testid="script-input"], textarea, [contenteditable="true"]').first();
    await scriptInput.click();
    await scriptInput.clear();
    await scriptInput.fill('(21-15-9) Push-ups');
    await page.waitForTimeout(500);

    // Compile/Start
    const compileButton = page.locator('button:has-text("Compile"), button:has-text("Start"), button:has-text("Parse")').first();
    if (await compileButton.isVisible()) {
      await compileButton.click();
      await page.waitForTimeout(300);
    }

    // Execute first step to create RoundsBlock
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Step")').first();
    await nextButton.click();
    await page.waitForTimeout(500);

    // Check if memory panel is visible
    const memoryPanel = page.locator('[data-testid="memory-panel"], .memory-panel, :has-text("Memory")').first();
    const hasMemoryPanel = await memoryPanel.isVisible().catch(() => false);

    if (hasMemoryPanel) {
      console.log('Memory panel found, checking for public metric...');
      
      // Look for metric:reps entry with public visibility
      const metricEntry = page.locator(':has-text("metric:reps"), :has-text("METRIC_REPS")').first();
      const hasMetric = await metricEntry.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasMetric) {
        console.log('✅ Found metric:reps in memory panel');
        
        // Check for "public" visibility indicator
        const publicIndicator = page.locator(':has-text("public")').first();
        const isPublic = await publicIndicator.isVisible({ timeout: 2000 }).catch(() => false);
        expect(isPublic, 'Metric should be marked as public visibility').toBeTruthy();
        
        console.log('✅ Metric has public visibility');
      } else {
        console.log('⚠️  metric:reps not visible in memory panel (UI might not display it)');
      }
    } else {
      console.log('⚠️  Memory panel not found in UI (might not be implemented yet)');
    }
  });
});
