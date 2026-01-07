
### Every Minute on the Minute (EMOM)

```wod
(20) :60 
  5 pushups
  10 situps
```

**Stack Expectations:**
- `mount()` → pushes repeating timer block (round 1 of 20), then pushes first child (5 pushups)
- `next()` → pops pushups, pushes next child (10 situps)
- `next()` → pops situps, advances to round 2, waits for :60 timer, pushes 5 pushups
- `next()` → pops pushups, pushes 10 situps
- ... repeats for 20 rounds total
- `complete()` → pops the repeating timer after round 20

**Report Expectations:**
- Total rounds completed: 20
- Total reps: 100 pushups, 200 situps
- Time per round tracking

---

### Chelsea (30-minute EMOM with 3 exercises)

```wod
(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```

**Stack Expectations:**
- `mount()` → pushes EMOM block (round 1 of 30), then pushes first child (5 Pullups)
- `next()` → pops Pullups, pushes 10 Pushups
- `next()` → pops Pushups, pushes 15 Air Squats
- `next()` → pops Air Squats, advances to round 2, waits for :60 boundary, pushes 5 Pullups
- ... repeats for 30 rounds
- `complete()` → pops EMOM block after round 30

**Report Expectations:**
- Total rounds: 30
- Total reps: 150 Pullups, 300 Pushups, 450 Air Squats
- Rest time remaining per minute

**Timer Completion Test:**
```typescript
it('should complete after 30 rounds when timer boundaries pass', () => {
  harness.mount();
  
  for (let round = 1; round <= 30; round++) {
    // Complete 3 exercises per round
    harness.next(); // Pullups
    harness.next(); // Pushups
    harness.next(); // Air Squats
    
    // Advance to next minute boundary
    harness.advanceClock(60 * 1000);
  }
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().roundsCompleted).toBe(30);
});
```

**Early Completion Test:**
```typescript
it('should allow early completion mid-EMOM', () => {
  harness.mount();
  
  // Complete 10 rounds
  for (let round = 1; round <= 10; round++) {
    harness.next();
    harness.next();
    harness.next();
    harness.advanceClock(60 * 1000);
  }
  
  // User stops at 10 minutes
  harness.complete();
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().roundsCompleted).toBe(10);
  expect(harness.getReport().elapsedTime).toBe(10 * 60 * 1000);
});
```

---

### Cindy (20-minute AMRAP)

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```

**Stack Expectations:**
- `mount()` → pushes AMRAP timer block (20:00 countdown), then pushes first child (5 Pullups)
- `next()` → pops Pullups, pushes 10 Pushups
- `next()` → pops Pushups, pushes 15 Air Squats
- `next()` → pops Air Squats, increments round count, pushes 5 Pullups (new round)
- ... continues until 20:00 timer expires
- Timer expiration → auto-completes AMRAP block

**Report Expectations:**
- Rounds completed (target: 10-20 for intermediate)
- Partial round tracking (e.g., "15+7" = 15 full rounds + 7 reps into round 16)
- Total elapsed time: 20:00

**Timer Completion Test:**
```typescript
it('should auto-complete when timer expires', () => {
  harness.mount();
  // Simulate 3 full rounds
  for (let i = 0; i < 9; i++) harness.next(); // 3 exercises × 3 rounds
  
  // Advance clock to expiration
  harness.advanceClock(20 * 60 * 1000); // 20 minutes
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().roundsCompleted).toBe(3);
});
```

**Early Completion Test:**
```typescript
it('should allow early completion via complete button', () => {
  harness.mount();
  // Simulate 2 full rounds + partial
  for (let i = 0; i < 7; i++) harness.next(); // 2 rounds + 1 exercise
  
  // User presses complete early (only 5 minutes in)
  harness.advanceClock(5 * 60 * 1000);
  harness.complete();
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().roundsCompleted).toBe(2);
  expect(harness.getReport().partialReps).toBe(5); // 5 Pullups done
  expect(harness.getReport().elapsedTime).toBeLessThan(20 * 60 * 1000);
});
```

---

### Fran (21-15-9 Descending Rep Scheme)

```wod
(21-15-9) 
  Thrusters 95lb
  Pullups
```

**Stack Expectations:**
- `mount()` → pushes rep scheme block (round 1: 21 reps), pushes 21 Thrusters
- `next()` → pops Thrusters, pushes 21 Pullups
- `next()` → pops Pullups, advances to round 2 (15 reps), pushes 15 Thrusters
- `next()` → pops Thrusters, pushes 15 Pullups
- `next()` → pops Pullups, advances to round 3 (9 reps), pushes 9 Thrusters
- `next()` → pops Thrusters, pushes 9 Pullups
- `next()` → pops Pullups, completes rep scheme block

**Report Expectations:**
- Total time for completion
- Total reps: 45 Thrusters, 45 Pullups
- Split times per round (21s, 15s, 9s)

---

### Annie (50-40-30-20-10 Descending Scheme)

```wod
(50-40-30-20-10)
  Double-Unders
  Situps
```

**Stack Expectations:**
- `mount()` → pushes rep scheme block (round 1: 50 reps), pushes 50 Double-Unders
- `next()` → pops Double-Unders, pushes 50 Situps
- `next()` → pops Situps, advances to round 2 (40 reps), pushes 40 Double-Unders
- ... continues through 5 rounds (50, 40, 30, 20, 10)
- Final `next()` → completes rep scheme block

**Report Expectations:**
- Total time for completion
- Total reps: 150 Double-Unders, 150 Situps
- Split times per round

---

### Barbara (5 Rounds with Rest)

```wod
(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest
```

**Stack Expectations:**
- `mount()` → pushes rounds block (round 1 of 5), pushes 20 Pullups
- `next()` → pops Pullups, pushes 30 Pushups
- `next()` → pops Pushups, pushes 40 Situps
- `next()` → pops Situps, pushes 50 Air Squats
- `next()` → pops Air Squats, pushes 3:00 Rest timer
- `next()` (or timer expires) → pops Rest, advances to round 2, pushes 20 Pullups
- ... continues through 5 rounds
- Final rest completes → rounds block complete

**Report Expectations:**
- Work time per round (excluding rest)
- Total work time vs total time
- Rest periods: 4 × 3:00 = 12:00 total rest

**Timer Completion Test (Rest Timer Expires):**
```typescript
it('should auto-advance when rest timer expires', () => {
  harness.mount();
  
  // Complete round 1 exercises
  harness.next(); // Pullups
  harness.next(); // Pushups
  harness.next(); // Situps
  harness.next(); // Air Squats
  
  // Now on rest timer
  expect(harness.currentBlock().name).toContain('Rest');
  
  // Advance clock through rest
  harness.advanceClock(3 * 60 * 1000); // 3 minutes
  
  // Should auto-advance to round 2
  expect(harness.currentBlock().name).toContain('Pullups');
  expect(harness.getReport().currentRound).toBe(2);
});
```

**Skip Rest Test (Early Next):**
```typescript
it('should allow skipping rest with next()', () => {
  harness.mount();
  
  // Complete round 1
  harness.next();
  harness.next();
  harness.next();
  harness.next();
  
  // On rest timer - skip it early
  harness.advanceClock(30 * 1000); // Only 30 seconds
  harness.next(); // Skip remaining rest
  
  // Should advance to round 2
  expect(harness.currentBlock().name).toContain('Pullups');
  expect(harness.getReport().restTaken).toBeLessThan(3 * 60 * 1000);
});
```

**Early Completion Test:**
```typescript
it('should allow early completion mid-workout', () => {
  harness.mount();
  
  // Complete 2 full rounds
  for (let round = 0; round < 2; round++) {
    harness.next(); // Pullups
    harness.next(); // Pushups
    harness.next(); // Situps
    harness.next(); // Air Squats
    harness.advanceClock(3 * 60 * 1000); // Rest
    harness.next();
  }
  
  // Start round 3, then quit
  harness.next(); // Pullups
  harness.complete();
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().roundsCompleted).toBe(2);
  expect(harness.getReport().partialRound).toBe(1); // 1 exercise into round 3
});
```

---

### Grace (Single Exercise For Time)

```wod
30 Clean & Jerk 135lb
```

**Stack Expectations:**
- `mount()` → pushes single rep block (30 Clean & Jerks)
- Block tracks rep completion internally
- `complete()` → pops block when 30 reps done

**Report Expectations:**
- Total time to complete 30 reps
- Average time per rep

---

### Simple and Sinister (Sequential Timed Blocks)

```wod
5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb
```

**Stack Expectations:**
- `mount()` → pushes first timed block (5:00 timer + 100 KB Swings)
- Timer expires or reps complete → `next()` pushes 1:00 Rest timer
- Rest expires → `next()` pushes 10:00 timer + 10 Turkish Getups
- Final block completes → workout done

**Report Expectations:**
- Time to complete swings (target: under 5:00)
- Time to complete getups (target: under 10:00)
- Total workout time

**Timer Completion Test (Natural Flow):**
```typescript
it('should progress through blocks as timers expire', () => {
  harness.mount();
  expect(harness.currentBlock().name).toContain('KB Swings');
  
  // Complete swings before timer
  harness.next();
  
  // Rest timer starts
  expect(harness.currentBlock().name).toContain('Rest');
  harness.advanceClock(60 * 1000); // 1 minute rest
  
  // Auto-advances to getups
  expect(harness.currentBlock().name).toContain('Turkish Getups');
  
  // Complete getups
  harness.next();
  expect(harness.isComplete()).toBe(true);
});
```

**Timer Expiration Test (Cap Reached):**
```typescript
it('should cap swings block when 5:00 timer expires', () => {
  harness.mount();
  
  // Don't complete swings - let timer run out
  harness.advanceClock(5 * 60 * 1000); // 5 minutes
  
  // Should auto-advance to rest regardless of reps completed
  expect(harness.currentBlock().name).toContain('Rest');
  expect(harness.getReport().swingsCompleted).toBeLessThan(100);
});
```

**Early Completion Test:**
```typescript
it('should allow early completion during any block', () => {
  harness.mount();
  harness.next(); // Complete swings
  
  // User stops during rest period
  harness.advanceClock(30 * 1000); // 30 seconds into rest
  harness.complete();
  
  expect(harness.isComplete()).toBe(true);
  expect(harness.getReport().getupCompleted).toBe(0);
  expect(harness.getReport().swingsCompleted).toBe(100);
});
```

---

## Test Implementation Pattern

Each scenario should follow this test structure:

```typescript
describe('WorkoutName', () => {
  let harness: RuntimeTestBuilder;

  beforeEach(() => {
    harness = new RuntimeTestBuilder()
      .withScript(`
        // wod script here
      `)
      .build();
  });

  it('should push correct initial block on mount', () => {
    harness.mount();
    expect(harness.currentBlock().blockType).toBe('ExpectedType');
  });

  it('should advance through children with next()', () => {
    harness.mount();
    harness.next();
    expect(harness.currentBlock().name).toBe('ExpectedChild');
  });

  it('should complete after all rounds/reps', () => {
    // simulate full workout
    harness.mount();
    // ... advance through all steps
    expect(harness.isComplete()).toBe(true);
  });

  it('should report correct totals', () => {
    // verify metrics
    const report = harness.getReport();
    expect(report.totalReps).toBe(expectedTotal);
  });
});