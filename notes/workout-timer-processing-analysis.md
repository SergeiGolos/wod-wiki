# Workout Timer Processing Analysis

## Executive Summary

This document analyzes all workout definitions currently defined in the Storybook stories and organizes them by processing patterns based on CrossFit workout methodologies. The analysis identifies critical issues in timer handling and processing logic that need to be addressed to ensure proper workout execution.

## Methodology

Based on CrossFit training principles and the current WOD Wiki runtime system, workouts have been categorized into seven distinct processing patterns. Each pattern represents a unique combination of timing mechanisms, round structures, and completion criteria.

## Workout Processing Patterns

### Pattern 1: Descending Rep Scheme Workouts

**Description**: Classic CrossFit "Girl" workouts with descending rep schemes (21-15-9). These are pure for-time workouts where athletes complete all reps as fast as possible.

**Workouts in this Pattern**:
- **Fran**: (21-15-9) Thrusters 95lb + Pullups
- **Diane**: (21-15-9) Deadlift 225lb + Handstand Pushups
- **Elizabeth**: (21-15-9) Clean 135lb + Ring Dips

**Expected Timer Behavior**:
- Single count-up timer ("For Time")
- Timer starts on first movement, stops on last rep completion
- No rest periods between movements
- Immediate advancement between rep scheme sets

**Current Processing Issues**:
- ❌ TimerStrategy defaults to count-up without proper "For Time" detection
- ❌ No mechanism to detect descending rep scheme completion
- ❌ Child advancement between movements within same round not clearly defined

### Pattern 2: Single Movement Max Effort

**Description**: Heavy single-movement workouts performed for max load or maximum reps in a time cap.

**Workouts in this Pattern**:
- **Grace**: 30 Clean & Jerk 135lb
- **Isabel**: 30 Snatch 135lb
- **Karen**: 150 Wall Ball Shots 20lb

**Expected Timer Behavior**:
- Single count-up timer with optional time cap
- Immediate completion when target reps reached
- Simple effort completion detection

**Current Processing Issues**:
- ✅ EffortStrategy should handle these correctly
- ⚠️ Missing time cap detection for workouts with caps

### Pattern 3: Fixed Rounds with Rest

**Description**: Multi-round workouts with specified rest periods between rounds.

**Workouts in this Pattern**:
- **Barbara**: (5) [20 Pullups + 30 Pushups + 40 Situps + 50 Air Squats] + 3:00 Rest
- **Nancy**: (5) [400m Run + 15 Overhead Squats 95lb]
- **DanJon ABC**: (20) [2 Clean + 1 Press + 3 Front Squat] 1:00
- **DanJon ABC Single Bell**: Complex alternating pattern with :30 Rest

**Expected Timer Behavior**:
- Round-based progression with RoundsBehavior
- Separate timer for work periods and rest periods
- Rest timer starts automatically after each round completion
- Clear round transition events

**Current Processing Issues**:
- ❌ No Rest timer implementation detected
- ❌ RoundsStrategy doesn't handle embedded rest periods
- ❌ Complex movement patterns within rounds not properly modeled

### Pattern 4: EMOM (Every Minute On the Minute)

**Description**: Workouts where athletes perform specified work at the start of each minute.

**Workouts in this Pattern**:
- **Chelsea**: (30) :60 EMOM [5 Pullups + 10 Pushups + 15 Air Squats]
- **EMOMMultiple**: (15) :60 EMOM [+ 5 Pullups + 10 Pushups + 15 Air Squats]
- **EMOMComplex**: (20) :60 EMOM [+ 3 Deadlifts 315lb + 6 Hang Power Cleans 185lb + 9 Front Squats 135lb]

**Expected Timer Behavior**:
- Fixed 60-second intervals with automatic advancement
- Work completion should not affect timing (EMOM continues regardless)
- Clear minute boundary events
- Movement completion tracking within each minute

**Current Processing Issues**:
- ❌ No EMOM-specific strategy detected
- ❌ TimerBehavior doesn't support interval-based timing
- ❌ No mechanism for "every minute" advancement regardless of work completion
- ❌ Missing EMOM completion detection (when all minutes completed)

### Pattern 5: AMRAP (As Many Rounds As Possible)

**Description**: Time-bound workouts where athletes complete as many rounds as possible within a time limit.

**Workouts in this Pattern**:
- **Cindy**: 20:00 AMRAP [5 Pullups + 10 Pushups + 15 Air Squats]
- **Mary**: 20:00 AMRAP [+ 5 Handstand Pushups + 10 Single-leg Squats + 15 Pullups]
- **CountdownTimer (Demo)**: 20:00 AMRAP [5 Pullups + 10 Pushups + 15 Air Squats]

**Expected Timer Behavior**:
- Countdown timer (20:00 counting down to zero)
- Round counting until time expires
- Automatic workout completion when timer reaches zero
- Round tracking independent of timer

**Current Processing Issues**:
- ❌ TimerStrategy defaults to count-up, not countdown for AMRAP
- ❌ No AMRAP-specific behavior combining timer + rounds
- ❌ Missing "time expired" completion detection
- ❌ Round counting not integrated with countdown timer

### Pattern 6: Complex Multi-Element Time Caps

**Description**: Workouts with multiple movement elements and time caps, potentially with varied rep schemes.

**Workouts in this Pattern**:
- **Helen**: (3) [400m Run + 21 KB Swings 53lb + 12 Pullups]
- **Jackie**: 1000m Row + 50 Thrusters 45lb + 30 Pullups
- **Linda**: (10-9-8-7-6-5-4-3-2-1) [Deadlift 1.5BW + Bench Press 1BW + Clean 0.75BW]

**Expected Timer Behavior**:
- For-time with optional time cap (count-up with cap)
- Complex rep scheme handling (descending pyramid for Linda)
- Multi-element completion tracking

**Current Processing Issues**:
- ❌ Complex rep schemes not properly supported
- ❌ Time cap detection not implemented
- ❌ Multi-element completion sequencing unclear

### Pattern 7: StrongFirst/Kettlebell Specific

**Description**: Strength-focused workouts with specific timing and rep schemes from StrongFirst methodology.

**Workouts in this Pattern**:
- **Simple & Sinister**: 5:00 100 KB Swings 70lb + 1:00 Rest + 10:00 10 Turkish Getups 70lb
- **KB Axe Heavy**: (20) 1:00 [4 KB Swings 106lb]
- **KB Axe Lite**: (20) 1:00 [6 KB Swings 70lb]

**Expected Timer Behavior**:
- Complex timing with work/rest intervals
- Density-focused training (specific reps in time windows)
- Clear work/rest phase separation

**Current Processing Issues**:
- ❌ No interval training timer support
- ❌ Density-based training not modeled
- ❌ Work/rest phase tracking not implemented

### Pattern 8: Swimming Structure

**Description**: Swimming workouts with warmup, main set, and cooldown structure.

**Workouts in this Pattern**:
- **Beginner Friendly Swimming**: Complex structure with repeated 25m swims + :20 rest + 100m kick sets

**Expected Timer Behavior**:
- Multi-phase workout (warmup/main/cooldown)
- Interval-based rest between swims
- Distance-based completion

**Current Processing Issues**:
- ❌ No distance-based completion detection
- ❌ Multi-phase workout structure not supported
- ❌ Swimming-specific timing not addressed

## Critical Timer Processing Issues

### 1. Strategy Selection Priority

**Current State**: TimerStrategy > RoundsStrategy > EffortStrategy
**Problem**: No clear hierarchy for complex workouts with both timer AND rounds (like EMOM, AMRAP)

**Issue**: AMRAP workouts should use combined timer + rounds behavior, but current system treats them as mutually exclusive.

### 2. Timer Direction Detection

**Current State**: TimerBehavior defaults to count-up
**Problem**: No automatic detection of when to use countdown vs count-up

**Missing Logic**:
- "AMRAP" keyword → countdown timer
- "For Time" → count-up timer
- Time caps → count-up with cap detection
- EMOM → interval-based timer

### 3. Rest Period Handling

**Current State**: No rest timer implementation
**Problem**: Rest periods are specified in syntax but not processed

**Missing Components**:
- Rest timer behavior separate from work timer
- Automatic work/rest transitions
- Rest period configuration from parser

### 4. Interval Training Support

**Current State**: Only continuous timers supported
**Problem**: EMOM and interval workouts require interval-based timing

**Missing Features**:
- Fixed interval advancement (every minute for EMOM)
- Work completion independent of timing
- Interval boundary events

### 5. Complex Rep Scheme Support

**Current State**: Basic rounds support only
**Problem**: Descending pyramids, ascending schemes not fully supported

**Issues**:
- RoundsBehavior expects uniform rounds
- Variable rep scheme parsing incomplete
- No support for complex rep sequences

## Recommended Implementation Strategy

### Phase 1: Timer Direction Detection
1. Extend TimerStrategy to detect countdown vs count-up based on keywords
2. Add "AMRAP", "For Time", "Time Cap" parsing
3. Implement countdown timer completion detection

### Phase 2: Combined Timer + Rounds
1. Create AMRAPStrategy combining TimerBehavior + RoundsBehavior
2. Implement EMOMStrategy for interval-based training
3. Add RestTimerBehavior for rest periods

### Phase 3: Complex Rep Schemes
1. Extend RoundsBehavior to support variable rep schemes
2. Add pyramid rep scheme detection (21-15-9, 10-9-8-7-6...)
3. Implement complex workout sequencing

### Phase 4: Interval Training Framework
1. Create IntervalTimerBehavior for EMOM-style workouts
2. Add work/rest phase management
3. Implement density-based training support

## Conclusion

The current WOD Wiki system handles basic effort and timer-based workouts but lacks support for complex CrossFit workout patterns that combine multiple timing mechanisms. Critical gaps exist in EMOM processing, AMRAP countdown timers, rest period handling, and complex rep schemes.

The recommended implementation strategy prioritizes fixing the most common workout patterns (AMRAP, EMOM, descending rep schemes) before advancing to more complex interval training support.

This analysis provides a roadmap for implementing proper timer processing that aligns with how CrossFit workouts are actually performed and timed.