# Workout Intensity Processing Strategies
## Progressive Enhancement Mechanism for Cross-Disciplinary Training Load Estimation

---

## Executive Summary

This document provides a comprehensive framework for calculating workout intensity using the fragment-based schema (timer, rep, effort, distance, rounds, action, resistance, increment, sound, text, group). The approach follows a **progressive enhancement model** where intensity estimates become more accurate as additional data streams become available, but functional estimates can still be generated with minimal data.

The strategies are organized into **five enhancement tiers**, each building upon the previous:

| Tier | Data Available | Accuracy | Cross-Discipline Comparison |
|------|---------------|----------|----------------------------|
| **Tier 1** | Fragments only | ±25-35% | Limited (discipline-specific only) |
| **Tier 2** | + Heart Rate | ±15-25% | Moderate (within cardio domains) |
| **Tier 3** | + Power/Watts | ±10-20% | Good (cycling/running power) |
| **Tier 4** | + GPS Streams | ±8-15% | Very Good (distance-based sports) |
| **Tier 5** | + All streams + Historical | ±5-12% | Excellent (full cross-discipline) |

---

## 1. Fragment Type Analysis & Intensity Mapping

### 1.1 Fragment Taxonomy

Each fragment type provides different information relevant to intensity calculation:

#### **timer** Fragment
- **Primary Use**: Duration measurement (fundamental to all intensity calculations)
- **Intensity Relevance**: Duration × intensity = training load
- **Data Extracted**: 
  - `start_time`, `end_time` → session/interval duration
  - `target_duration` → planned vs actual comparison
  - `role` (primary/secondary) → work vs rest identification

#### **rep** Fragment
- **Primary Use**: Repetition counting for resistance training and intervals
- **Intensity Relevance**: Volume calculation, velocity estimation
- **Data Extracted**:
  - `count` → total volume
  - `target_count` → completion rate
  - `failed_reps` → fatigue indicator (RPE proxy)

#### **effort** Fragment
- **Primary Use**: Composite performance metric (exercise-specific)
- **Intensity Relevance**: Direct intensity indicator when properly encoded
- **Data Extracted**:
  - May contain RPE, difficulty rating, or effort level
  - Context-dependent interpretation required

#### **distance** Fragment
- **Primary Use**: Spatial metrics for endurance activities
- **Intensity Relevance**: Pace/speed calculation, METs estimation
- **Data Extracted**:
  - `value` + `unit` → total distance
  - Combined with timer → speed/pace

#### **rounds** Fragment
- **Primary Use**: Iteration tracking (circuit training, HIIT)
- **Intensity Relevance**: Work density calculation
- **Data Extracted**:
  - `current` / `total` → progression state
  - Round duration patterns → work:rest ratio

#### **action** Fragment
- **Primary Use**: Exercise identification
- **Intensity Relevance**: METs lookup, discipline classification
- **Data Extracted**:
  - Exercise name → MET value from compendium
  - Category classification (cardio/strength/flexibility)

#### **resistance** Fragment
- **Primary Use**: Load/weight tracking
- **Intensity Relevance**: Volume load calculation, relative intensity
- **Data Extracted**:
  - `value` + `unit` → absolute load
  - Combined with rep → volume load

#### **increment** Fragment
- **Primary Use**: Progressive changes across rounds
- **Intensity Relevance**: Intensity progression tracking
- **Data Extracted**:
  - Pattern of increase/decrease → fatigue adaptation
  - Progressive overload quantification

#### **text** Fragment
- **Primary Use**: Descriptive metadata
- **Intensity Relevance**: Context extraction, effort descriptors
- **Data Extracted**:
  - Keywords like "max", "easy", "tempo" → RPE hints
  - Modifiers like "heavy", "light" → intensity classification

#### **group** Fragment
- **Primary Use**: Semantic grouping of related fragments
- **Intensity Relevance**: Set/exercise boundary identification
- **Data Extracted**:
  - Grouping structure → workout organization
  - Enables per-set intensity calculation

---

## 2. Progressive Enhancement Tiers

### Tier 1: Fragment-Only Processing (Baseline)

**When This Applies**: No wearable data available, manual logging only

**Available Data**: All fragment types (timer, rep, effort, distance, rounds, action, resistance, increment, text, group)

**Accuracy**: ±25-35% (significant estimation required)

#### 2.1.1 Strategy: MET-Based Estimation with RPE Inference

**Core Algorithm**:

```
function calculateTier1Intensity(workoutFragments):
    // Step 1: Identify workout type from action fragments
    workoutType = classifyWorkoutType(actionFragments)
    
    // Step 2: Get base MET value for exercise type
    baseMET = lookupMET(workoutType)
    
    // Step 3: Apply intensity modifiers
    intensityModifier = calculateIntensityModifier(fragments)
    
    // Step 4: Calculate duration-weighted training load
    duration = calculateTotalDuration(timerFragments)
    estimatedMET = baseMET * intensityModifier
    
    // Step 5: Generate TIS (Training Intensity Score)
    TIS = (estimatedMET / individualMETmax) * 100 * (duration/60)
    
    return TIS
```

#### 2.1.2 Workout Type Classification

| Fragment Pattern | Workout Type | Base METs | Confidence |
|-----------------|--------------|-----------|------------|
| action + resistance + rep | Strength Training | 5.0 | High |
| action + distance + timer | Endurance Cardio | Variable | Medium |
| action + rounds + timer (work/rest pattern) | HIIT/Circuit | 8.0-12.0 | Medium |
| action (yoga poses) + timer + text | Yoga | 2.5-4.0 | Medium |
| action + distance + timer (intervals) | Sprint/Intervals | 10.0-15.0 | Low |
| action (mixed patterns) | Cross-Training | Calculate per segment | Low |

#### 2.1.3 Intensity Modifier Calculation

**From `resistance` + `rep` fragments (Strength Training)**:

```python
def calculateStrengthModifier(resistance, rep, action):
    # Estimate relative intensity from rep range
    if rep.count <= 5:
        repIntensityFactor = 0.9  # Heavy (85-100% 1RM assumed)
    elif rep.count <= 12:
        repIntensityFactor = 0.7  # Moderate (70-85% 1RM assumed)
    else:
        repIntensityFactor = 0.5  # Light (<70% 1RM assumed)
    
    # Adjust for resistance increment pattern
    if hasIncrementPattern():
        # Progressive loading suggests structured training
        intensityFactor = repIntensityFactor * 1.1
    
    return intensityFactor
```

**From `distance` + `timer` fragments (Endurance)**:

```python
def calculateEnduranceModifier(distance, timer):
    # Calculate pace/speed
    speed_mph = distance.value / (timer.duration / 60)
    
    # Map speed to METs using ACSM equations
    if speed_mph < 3.0:
        return 0.5  # Walking pace
    elif speed_mph < 5.0:
        return 0.7  # Jogging
    elif speed_mph < 7.0:
        return 0.9  # Running
    else:
        return 1.1  # Fast running
```

**From `rounds` + `timer` fragments (HIIT/Circuit)**:

```python
def calculateHIITModifier(rounds, timerFragments):
    # Identify work:rest ratio from timer roles
    workTime = sum(t.duration for t in timers if t.role == 'primary')
    restTime = sum(t.duration for t in timers if t.role == 'secondary')
    
    workRestRatio = workTime / restTime if restTime > 0 else 1.0
    
    # Higher work:rest = higher intensity
    if workRestRatio >= 2.0:
        return 1.3  # Very high intensity
    elif workRestRatio >= 1.0:
        return 1.1  # High intensity
    else:
        return 0.9  # Moderate intensity
```

#### 2.1.4 RPE Inference from Fragment Patterns

When no explicit RPE is provided, infer from:

| Fragment Pattern | Inferred RPE | Reasoning |
|-----------------|--------------|-----------|
| `rep.failed_reps` present | 9-10 | Reaching failure indicates high effort |
| `increment` shows decrease | 8-9 | Fatigue causing load reduction |
| `rounds` incomplete | 7-8 | Unable to complete planned volume |
| `text` contains "max", "PR" | 9-10 | Maximum effort keywords |
| `text` contains "easy", "recovery" | 3-4 | Low effort keywords |
| `timer` exceeds target significantly | 5-6 | Pacing conservative |
| Resistance near bodyweight (bodyweight exercises) | 6-7 | Moderate by default |

#### 2.1.5 What CAN Be Identified at Tier 1

| Capability | Method | Confidence |
|------------|--------|------------|
| Workout type classification | Action fragment analysis | High |
| Approximate duration | Timer fragments | Exact |
| Total volume (resistance training) | resistance × rep | High |
| Estimated distance | Distance fragments | Exact if logged |
| Approximate METs | Action lookup + modifiers | Medium |
| RPE inference | Pattern analysis | Low-Medium |
| Session load estimate | Duration × estimated METs | Medium |
| Work:rest ratio (HIIT) | Timer role analysis | Medium-High |

#### 2.1.6 What CANNOT Be Identified at Tier 1

| Limitation | Reason | Impact |
|------------|--------|--------|
| Actual heart rate response | No HR data | Cannot verify cardiovascular stress |
| True power output | No power meter | Cannot measure mechanical work |
| Actual pace/speed | No GPS | Must rely on logged distance |
| Individual physiological response | No biometrics | Population averages only |
| Lactate threshold proximity | No biometrics | Cannot identify training zones |
| Recovery status | No HRV or HR data | Cannot assess readiness |
| EPOC contribution | No oxygen data | Post-exercise calories estimated |
| Anaerobic contribution | No lactate/HR data | HIIT intensity underestimated |

---

### Tier 2: Fragment + Heart Rate Data

**When This Applies**: User has HR monitor but no power meter or GPS

**Available Data**: All fragments + HR stream (bpm values with timestamps)

**Accuracy**: ±15-25% (significant improvement for cardio, limited for strength)

#### 2.2.1 Strategy: TRIMP-Based Training Load

**Core Algorithm**:

```
function calculateTier2Intensity(workoutFragments, hrStream):
    // Step 1: Get individual HR parameters
    HRrest = getUserHRrest()  // From profile or baseline
    HRmax = getUserHRmax()    // From test or 220-age formula
    
    // Step 2: Map HR to timeline segments using fragments
    segments = mapHRToSegments(hrStream, workoutFragments)
    
    // Step 3: Calculate TRIMP for each segment
    totalTRIMP = 0
    for segment in segments:
        HRavg = segment.averageHR
        duration = segment.duration
        
        // Calculate HR ratio
        HRr = (HRavg - HRrest) / (HRmax - HRrest)
        
        // Apply Banister formula
        weightingFactor = 0.64 * exp(1.92 * HRr)  // Males
        // weightingFactor = 0.86 * exp(1.67 * HRr)  // Females
        
        segmentTRIMP = duration * HRr * weightingFactor
        totalTRIMP += segmentTRIMP
        
        // Store segment intensity for analysis
        segment.intensity = calculateZoneFromHR(HRavg, HRmax)
    
    return {
        TRIMP: totalTRIMP,
        zones: calculateTimeInZones(segments),
        TIS: mapTRIMPtoTIS(totalTRIMP)
    }
```

#### 2.2.2 Heart Rate Zone Calculation

| Zone | %HRmax | %HRR | TRIMP Weight | Training Effect |
|------|--------|------|--------------|-----------------|
| Zone 1 | 50-60% | 50-60% | 1.0x | Recovery |
| Zone 2 | 60-70% | 60-70% | 1.5x | Aerobic base |
| Zone 3 | 70-80% | 70-80% | 2.5x | Tempo |
| Zone 4 | 80-90% | 70-80% | 4.0x | Threshold |
| Zone 5 | 90-100% | 90-100% | 6.0x | VO2max |

#### 2.2.3 Fragment-HR Correlation Analysis

**Strength Training HR Patterns**:

```
function analyzeStrengthHR(hrStream, resistance, rep, timer):
    // Identify HR response patterns characteristic of RT
    observations = []
    
    // Pattern 1: HR spikes during sets, partial recovery between
    for set in groupBySets(fragments):
        setHR = getHRDuringSet(hrStream, set.timer)
        recoveryHR = getHRBetweenSets(hrStream, set.timer)
        
        if setHR > recoveryHR * 1.15:
            observations.append("typical_strength_pattern")
        
        // Estimate effort from HR response
        hrJump = setHR - recoveryHR
        if hrJump > 20:
            set.effort = "high"  // RPE 7-9 inferred
        elif hrJump > 10:
            set.effort = "moderate"  // RPE 5-7 inferred
        else:
            set.effort = "low"  // RPE 3-5 inferred
    
    return observations
```

**HIIT HR Patterns**:

```
function analyzeHIIHR(hrStream, rounds, timer):
    // HIIT shows characteristic HR oscillation
    peaks = []
    valleys = []
    
    for round in rounds:
        workHR = getAverageHR(hrStream, round.workTimer)
        restHR = getAverageHR(hrStream, round.restTimer)
        
        peaks.append(workHR)
        valleys.append(restHR)
    
    // Calculate HR drift (fatigue indicator)
    hrDrift = (mean(peaks[-3:]) - mean(peaks[:3])) / mean(peaks[:3])
    
    if hrDrift > 0.05:  // 5% increase
        intensityEstimate = "increasing_fatigue"
    else:
        intensityEstimate = "sustainable"
    
    return {
        avgWorkHR: mean(peaks),
        avgRestHR: mean(valleys),
        hrDrift: hrDrift,
        inferredIntensity: intensityEstimate
    }
```

#### 2.2.4 What CAN Be Identified at Tier 2

| Capability | Method | Confidence |
|------------|--------|------------|
| All Tier 1 capabilities | Plus HR data | Improved |
| Cardiovascular stress level | HR zone analysis | High |
| Time in zone distribution | HR stream mapping | High |
| Estimated VO2 response | HR-VO2 correlation | Medium |
| Training impulse (TRIMP) | Banister formula | High (for cardio) |
| Fatigue accumulation | HR drift analysis | Medium |
| Recovery between sets/rounds | Inter-set HR response | Medium |
| Session RPE inference | HR patterns | Medium |
| Lactate threshold estimate (if test data) | HR deflection point | Low-Medium |

#### 2.2.5 What CANNOT Be Identified at Tier 2

| Limitation | Reason | Impact |
|------------|--------|--------|
| Actual power output | No power meter | Cannot measure mechanical work in watts |
| Running/cycling pace | No GPS/speed sensor | Must rely on logged distance |
| True metabolic cost | HR doesn't capture anaerobic | HIIT underestimated |
| Strength training intensity | HR poorly correlates with force | Limited value for RT |
| Hot yoga HR-MET dissociation | Heat elevates HR without metabolic cost | Overestimates yoga intensity |
| Cardiac drift vs intensity increase | Cannot distinguish causes | May misinterpret late-session data |
| Altitude effects | No context for elevation | HR elevated without intensity increase |

---

### Tier 3: Fragment + Heart Rate + Power Data

**When This Applies**: User has power meter (cycling) or running power (Stryd/Garmin)

**Available Data**: All fragments + HR stream + Power stream (watts with timestamps)

**Accuracy**: ±10-20% (excellent for power-based activities)

#### 2.3.1 Strategy: Power-Based Training Stress Score

**Core Algorithm**:

```
function calculateTier3Intensity(workoutFragments, hrStream, powerStream):
    // Step 1: Determine critical power/FTP from user profile or test
    CP = getUserCriticalPower()  // Running or cycling
    
    // Step 2: Calculate normalized power for session
    NP = calculateNormalizedPower(powerStream)
    
    // Step 3: Calculate Intensity Factor
    IF = NP / CP
    
    // Step 4: Calculate Training Stress Score
    duration_hours = getTotalDuration(timerFragments) / 3600
    TSS = (duration_hours * NP * IF) / (CP * 3600) * 100
    
    // Simplified: TSS = duration_hours * IF² * 100
    
    // Step 5: Map to fragment segments
    segments = mapPowerToSegments(powerStream, workoutFragments)
    for segment in segments:
        segment.TSS = calculateSegmentTSS(segment, CP)
        segment.powerZone = determinePowerZone(segment.avgPower, CP)
    
    // Step 6: Cross-validate with HR
    hrPowerDecoupling = calculateDecoupling(hrStream, powerStream)
    
    return {
        TSS: TSS,
        NP: NP,
        IF: IF,
        zones: calculatePowerZones(segments),
        decoupling: hrPowerDecoupling,
        TIS: mapTSStoTIS(TSS)
    }
```

#### 2.3.2 Power Zone Classification

| Zone | %CP/FTP | Name | Training Effect |
|------|---------|------|-----------------|
| Zone 1 | <80% | Active Recovery | Recovery |
| Zone 2 | 80-90% | Endurance | Aerobic base |
| Zone 3 | 90-100% | Tempo | Threshold development |
| Zone 4 | 100-110% | Threshold | Lactate tolerance |
| Zone 5 | 110-120% | VO2max | Maximum aerobic |
| Zone 6 | 120-150% | Anaerobic | Anaerobic capacity |
| Zone 7 | >150% | Sprint | Neuromuscular |

#### 2.3.3 HR-Power Decoupling Analysis

**Purpose**: Identify fatigue and aerobic efficiency

```
function calculateDecoupling(hrStream, powerStream):
    // Split session into first half and second half
    midpoint = len(powerStream) / 2
    
    firstHalfPower = mean(powerStream[:midpoint])
    firstHalfHR = mean(hrStream[:midpoint])
    
    secondHalfPower = mean(powerStream[midpoint:])
    secondHalfHR = mean(hrStream[midpoint:])
    
    // Calculate power:HR ratio for each half
    ratio1 = firstHalfPower / firstHalfHR
    ratio2 = secondHalfPower / secondHalfHR
    
    // Decoupling percentage
    decoupling = (ratio1 - ratio2) / ratio1 * 100
    
    // Interpretation
    if decoupling < 5:
        status = "efficient"  // Good aerobic fitness
    elif decoupling < 15:
        status = "moderate_fatigue"
    else:
        status = "significant_fatigue"  // Consider rest
    
    return { decoupling: decoupling, status: status }
```

#### 2.3.4 What CAN Be Identified at Tier 3

| Capability | Method | Confidence |
|------------|--------|------------|
| All Tier 2 capabilities | Plus power data | Improved |
| Actual mechanical work | Power × time | Exact |
| Normalized power | 30-second rolling average | High |
| Training Stress Score (TSS) | Power-based formula | High |
| Power zone distribution | CP/FTP-based zones | High |
| Aerobic efficiency | HR-power decoupling | High |
| Critical power estimation | From test or ML model | Medium-High |
| Interval quality assessment | Power consistency analysis | High |

#### 2.3.5 What CANNOT Be Identified at Tier 3

| Limitation | Reason | Impact |
|------------|--------|--------|
| Strength training power | Power meters not applicable | No benefit for RT |
| Running power accuracy | Estimated, not measured | Lower confidence than cycling |
| Wind resistance effects | Not captured by most meters | May underestimate outdoor effort |
| Terrain effects (trail running) | Variable efficiency | Power-pace relationship varies |
| Swimming intensity | No power meters in water | Must use pace or HR |

---

### Tier 4: Fragment + Heart Rate + Power + GPS Data

**When This Applies**: User has full sensor suite (HR, power, GPS)

**Available Data**: All fragments + HR + Power + GPS (position, elevation, speed)

**Accuracy**: ±8-15% (very good for outdoor activities)

#### 2.4.1 Strategy: Multi-Stream Integration

**Core Algorithm**:

```
function calculateTier4Intensity(workoutFragments, hrStream, powerStream, gpsStream):
    // Step 1: Sync all streams to common timeline
    syncedData = syncStreams(workoutFragments, hrStream, powerStream, gpsStream)
    
    // Step 2: Calculate grade-adjusted pace (running)
    if hasRunningAction(workoutFragments):
        GAP = calculateGradeAdjustedPace(gpsStream)
        runningPower = estimateOrMeasurePower(GAP, gpsStream)
    
    // Step 3: Calculate altitude-adjusted intensity
    elevationEffect = calculateElevationEffect(gpsStream.elevation)
    adjustedIntensity = baseIntensity * elevationEffect
    
    // Step 4: Cross-validate distance from fragments vs GPS
    loggedDistance = sum(distanceFragments)
    gpsDistance = calculateGPSDistance(gpsStream)
    distanceAccuracy = gpsDistance / loggedDistance if loggedDistance > 0 else 1.0
    
    // Step 5: Calculate comprehensive training load
    trainingLoad = {
        TSS: calculatePowerTSS(powerStream),
        TRIMP: calculateTRIMP(hrStream),
        distanceLoad: calculateDistanceLoad(gpsStream),
        elevationLoad: calculateElevationLoad(gpsStream)
    }
    
    // Step 6: Generate composite TIS
    TIS = calculateCompositeTIS(trainingLoad, workoutFragments)
    
    return TIS
```

#### 2.4.2 Grade-Adjusted Pace Calculation

```
function calculateGradeAdjustedPace(gpsStream):
    // Use Minetti equation for energy cost of grade
    adjustedDistance = 0
    
    for point in gpsStream:
        grade = point.elevationChange / point.horizontalDistance
        // Minetti cost of walking/running on grade
        costFactor = 1.0 + 0.0 * grade + 4.0 * grade²  // Simplified
        
        // Add adjusted meters (equivalent flat distance)
        adjustedDistance += point.horizontalDistance * costFactor
    
    return adjustedDistance
```

#### 2.4.3 Elevation Effect on Intensity

| Grade | Intensity Multiplier | Reasoning |
|-------|---------------------|-----------|
| -10% to -5% | 0.85-0.95 | Downhill (reduced effort, eccentric load) |
| -5% to 0% | 0.95-1.0 | Slight downhill to flat |
| 0% to 5% | 1.0-1.15 | Gradual climb |
| 5% to 10% | 1.15-1.35 | Moderate climb |
| >10% | 1.35-1.50 | Steep climb |

#### 2.4.4 What CAN Be Identified at Tier 4

| Capability | Method | Confidence |
|------------|--------|------------|
| All Tier 3 capabilities | Plus GPS data | Improved |
| Actual speed/pace | GPS timestamps | High |
| Grade-adjusted pace | Elevation compensation | High |
| Route difficulty | Elevation gain/distance | High |
| Wind effect inference | Pace-power discrepancy | Medium |
| Terrain effect | Pace variability | Medium |
| Accurate distance | GPS measurement | High |

#### 2.4.5 What CANNOT Be Identified at Tier 4

| Limitation | Reason | Impact |
|------------|--------|--------|
| Indoor activities | GPS not functional | No benefit for gym/treadmill |
| Strength training | GPS not applicable | No benefit |
| Swimming | GPS underwater unreliable | Must use pool length counts |
| Heat/humidity effects | Not captured | May underestimate hot weather effort |

---

### Tier 5: Full Integration + Historical Data + ML Enhancement

**When This Applies**: User has all sensors + historical training data + ML model trained

**Available Data**: All streams + historical patterns + personal physiological model

**Accuracy**: ±5-12% (excellent, personalized)

#### 2.5.1 Strategy: Machine Learning Enhanced Estimation

**Core Algorithm**:

```
function calculateTier5Intensity(workoutFragments, allStreams, userHistory):
    // Step 1: Extract features from all available data
    features = extractFeatures(workoutFragments, allStreams)
    
    // Step 2: Add historical context features
    features.recentLoad = calculateRecentLoad(userHistory, days=7)
    features.chronicLoad = calculateChronicLoad(userHistory, days=42)
    features.acwr = features.recentLoad / features.chronicLoad
    features.recoveryStatus = estimateRecovery(userHistory.hrvData)
    
    // Step 3: Apply personal physiological model
    personalModel = getUserModel(userHistory)
    
    // Step 4: Generate predictions
    predictions = {
        TRIMP: predictTRIMP(features, personalModel),
        TSS: predictTSS(features, personalModel),
        RPE: predictRPE(features, personalModel),
        recoveryTime: predictRecoveryTime(features, personalModel),
        adaptiveBenefit: predictBenefit(features, personalModel)
    }
    
    // Step 5: Cross-validate predictions
    validatedPredictions = crossValidate(predictions, allStreams)
    
    // Step 6: Generate comprehensive TIS
    TIS = generateEnhancedTIS(validatedPredictions, workoutFragments)
    
    return TIS
```

#### 2.5.2 Feature Engineering for ML Model

| Feature Category | Examples | Source |
|-----------------|----------|--------|
| **Workout Structure** | Duration, sets, reps, rounds | Fragments |
| **Intensity Metrics** | Avg HR, power, pace | Streams |
| **Distribution Metrics** | Time in zones, power variability | Streams |
| **Fatigue Indicators** | HR drift, power decay | Streams |
| **Historical Context** | Recent load, ACWR, recovery | History |
| **Personal Factors** | Age, weight, fitness level, HRmax | Profile |
| **Environmental** | Temperature, altitude (if available) | Context |

#### 2.5.3 Personal Physiological Model Components

```
class PersonalPhysiologicalModel:
    // Individual thresholds
    HRmax: float              // Measured or estimated
    HRrest: float             // Morning resting HR
    LTHR: float               // Lactate threshold HR
    CP: float                 // Critical power
    FTP: float                // Functional threshold power
    VO2max_estimated: float   // From tests or ML estimation
    
    // Efficiency factors
    runningEconomy: float     // ml/kg/km
    cyclingEfficiency: float  // Gross efficiency %
    swimmingEfficiency: float // Stroke efficiency
    
    // Recovery parameters
    recoveryRate: float       // Load decay time constant
    adaptationRate: float     // Fitness gain rate
    
    // Sport-specific weights
    sportWeights: {
        running: 1.0,
        cycling: 0.95,
        swimming: 0.85,
        strength: 1.2,  // Higher due to EPOC
        yoga: 0.9       // Lower due to HR-MET dissociation
    }
```

#### 2.5.4 What CAN Be Identified at Tier 5

| Capability | Method | Confidence |
|------------|--------|------------|
| All Tier 4 capabilities | Plus ML/personalization | Very High |
| Personalized intensity zones | Individual model | High |
| Accurate TIS across disciplines | Sport-specific weights | High |
| Recovery time prediction | Historical patterns | Medium-High |
| Optimal training load | ACWR optimization | Medium |
| Injury risk assessment | Load spike detection | Medium |
| Performance prediction | Fitness-fatigue model | Medium |
| Cross-training equivalence | Multi-sport model | Medium-High |

---

## 3. Fragment-Specific Processing Strategies

### 3.1 Processing `timer` Fragments

#### Primary Extraction

```
function processTimerFragments(timerFragments):
    sessions = []
    
    for timer in timerFragments:
        duration = timer.end_time - timer.start_time
        
        // Role identification
        if timer.role == 'primary':
            type = 'work'
        elif timer.role == 'secondary':
            type = 'rest'
        else:
            type = 'unknown'
        
        sessions.append({
            duration: duration,
            type: type,
            target: timer.target_duration,
            variance: abs(duration - timer.target_duration) / timer.target_duration
        })
    
    return {
        totalDuration: sum(s.duration for s in sessions),
        workDuration: sum(s.duration for s in sessions if s.type == 'work'),
        restDuration: sum(s.duration for s in sessions if s.type == 'rest'),
        workRestRatio: workDuration / restDuration if restDuration > 0 else None,
        sessions: sessions
    }
```

#### Intensity Implications

| Timer Pattern | Intensity Indicator | TIS Adjustment |
|---------------|--------------------|----------------| 
| Duration >> Target | Fatigue or intentional easy day | -10-20% |
| Duration << Target | Cut short (high intensity or failure) | +10% |
| High work:rest (>2:1) | HIIT, high metabolic demand | +20-30% |
| Low work:rest (<1:1) | Recovery or skill focus | -10% |

### 3.2 Processing `rep` Fragments

#### Primary Extraction

```
function processRepFragments(repFragments):
    totalReps = sum(r.count for r in repFragments)
    failedReps = sum(r.failed for r in repFragments if r.failed)
    
    // Infer intensity from rep range
    avgRepsPerSet = mean([r.count for r in repFragments])
    
    if avgRepsPerSet <= 5:
        intensityZone = "strength"  // 85-100% 1RM
    elif avgRepsPerSet <= 12:
        intensityZone = "hypertrophy"  // 65-85% 1RM
    else:
        intensityZone = "endurance"  // <65% 1RM
    
    return {
        totalReps: totalReps,
        failedReps: failedReps,
        failureRate: failedReps / totalReps if totalReps > 0 else 0,
        inferredIntensity: intensityZone,
        inferredRPE: 9 if failedReps > 0 else 7  // Simplified
    }
```

### 3.3 Processing `resistance` Fragments

#### Primary Extraction

```
function processResistanceFragments(resistanceFragments, repFragments):
    totalVolume = 0
    sets = []
    
    for resistance in resistanceFragments:
        // Normalize to kg
        weight_kg = convertToKg(resistance.value, resistance.unit)
        
        // Find associated reps
        associatedReps = findAssociatedReps(resistance, repFragments)
        
        // Calculate volume load
        volumeLoad = weight_kg * associatedReps.count
        totalVolume += volumeLoad
        
        sets.append({
            weight: weight_kg,
            reps: associatedReps.count,
            volume: volumeLoad,
            estimated1RM: estimate1RM(weight_kg, associatedReps.count)
        })
    
    // Calculate relative intensity if we have 1RM estimates
    if all(s.estimated1RM for s in sets):
        avgRelativeIntensity = mean([s.weight / s.estimated1RM for s in sets])
    
    return {
        totalVolumeLoad: totalVolume,
        sets: sets,
        avgRelativeIntensity: avgRelativeIntensity if exists else None
    }
```

### 3.4 Processing `distance` Fragments

#### Primary Extraction

```
function processDistanceFragments(distanceFragments, timerFragments):
    totalDistance = sum(normalizeDistance(d) for d in distanceFragments)
    totalDuration = sum(t.duration for t in timerFragments)
    
    // Calculate pace/speed
    if totalDuration > 0:
        speed_mps = totalDistance / totalDuration
        pace_minPerMile = (totalDuration / 60) / (totalDistance / 1609.34)
    
    // Estimate METs from speed
    estimatedMET = estimateMETFromSpeed(speed_mps)
    
    return {
        totalDistance: totalDistance,
        avgSpeed: speed_mps,
        avgPace: pace_minPerMile,
        estimatedMET: estimatedMET
    }
```

### 3.5 Processing `action` Fragments

#### Primary Extraction

```
// MET lookup table (abbreviated)
MET_DATABASE = {
    // Running
    "running": { "default": 8.3, "speed_modifier": True },
    "jogging": 7.0,
    "sprint": 15.0,
    
    // Cycling
    "cycling": { "default": 7.0, "speed_modifier": True },
    "stationary_bike": 5.5,
    "spinning": 8.5,
    
    // Swimming
    "swimming": 8.0,
    "freestyle": 8.3,
    "breaststroke": 7.5,
    
    // Strength
    "squat": 5.0,
    "deadlift": 6.0,
    "bench_press": 5.0,
    "weightlifting": 5.0,
    
    // Yoga
    "yoga": 2.5,
    "vinyasa": 3.5,
    "power_yoga": 4.0,
    "hatha_yoga": 2.2,
    
    // HIIT
    "burpee": 8.0,
    "jump_rope": 12.0,
    "mountain_climber": 8.0,
    
    // Default
    "default": 4.0
}

function processActionFragments(actionFragments):
    workoutTypes = []
    totalMET = 0
    
    for action in actionFragments:
        // Normalize action name
        normalized = normalizeActionName(action.name)
        
        // Lookup MET value
        metValue = lookupMET(normalized, MET_DATABASE)
        
        workoutTypes.append({
            action: normalized,
            met: metValue,
            category: categorizeAction(normalized)
        })
    
    // Determine dominant workout type
    dominantType = getMostFrequent(workoutTypes.map(w => w.category))
    
    return {
        actions: workoutTypes,
        dominantType: dominantType,
        avgMET: mean([w.met for w in workoutTypes])
    }
```

### 3.6 Processing `text` Fragments for RPE Inference

#### Keyword-Based RPE Estimation

```
RPE_KEYWORDS = {
    // High intensity (RPE 8-10)
    "max": 10,
    "maximum": 10,
    "all-out": 10,
    "sprint": 9,
    "intense": 8,
    "hard": 8,
    "heavy": 8,
    "challenging": 7,
    "difficult": 7,
    "failure": 10,
    "PR": 10,  // Personal record
    "1RM": 10,
    "maximal": 10,
    
    // Moderate intensity (RPE 5-7)
    "moderate": 6,
    "medium": 6,
    "tempo": 6,
    "threshold": 7,
    "steady": 5,
    "working": 6,
    
    // Low intensity (RPE 1-4)
    "easy": 3,
    "light": 3,
    "recovery": 2,
    "warm-up": 2,
    "warmup": 2,
    "cool-down": 2,
    "cooldown": 2,
    "gentle": 2,
    "relaxed": 2,
    "rest": 1
}

function inferRPEFromText(textFragments):
    inferredRPEs = []
    
    for text in textFragments:
        content = text.content.toLowerCase()
        
        for keyword, rpe in RPE_KEYWORDS:
            if keyword in content:
                inferredRPEs.append(rpe)
    
    if inferredRPEs:
        // Use highest RPE found (conservative for intensity)
        return max(inferredRPEs)
    else:
        return None  // No RPE inference possible
```

---

## 4. Cross-Discipline Intensity Mapping

### 4.1 Training Intensity Score (TIS) Calculation

The unified TIS provides a single intensity metric across all disciplines:

```
function calculateTIS(workoutData, tier):
    // Base calculation depends on available data
    switch(tier):
        case 1:
            baseScore = calculateTier1TIS(workoutData.fragments)
        case 2:
            baseScore = calculateTier2TIS(workoutData.fragments, workoutData.hr)
        case 3:
            baseScore = calculateTier3TIS(workoutData.fragments, workoutData.hr, workoutData.power)
        case 4:
            baseScore = calculateTier4TIS(workoutData.fragments, workoutData.hr, workoutData.power, workoutData.gps)
        case 5:
            baseScore = calculateTier5TIS(workoutData, userHistory)
    
    // Apply discipline-specific correction
    discipline = classifyDiscipline(workoutData.fragments)
    correctionFactor = getDisciplineCorrectionFactor(discipline)
    
    adjustedTIS = baseScore * correctionFactor
    
    return {
        TIS: adjustedTIS,
        confidence: calculateConfidence(tier, workoutData),
        discipline: discipline,
        breakdown: generateBreakdown(workoutData)
    }
```

### 4.2 Discipline Correction Factors

| Discipline | Correction Factor | Reasoning |
|------------|-------------------|-----------|
| **Strength Training** | 1.20 | EPOC, neuromuscular fatigue not captured by METs |
| **HIIT/Sprint** | 1.15 | Anaerobic contribution underestimated |
| **Running** | 1.00 | Baseline (well-studied) |
| **Cycling** | 0.98 | Slightly lower muscle mass |
| **Swimming** | 0.95 | HR lowered by water immersion |
| **Yoga (room temp)** | 0.90 | HR-MET correlation weaker |
| **Yoga (hot/Bikram)** | 0.85 | HR elevated without metabolic increase |
| **Walking** | 1.00 | Baseline |

### 4.3 Cross-Discipline Equivalence Table

The following sessions would produce approximately equal TIS values:

| TIS ~50 (Moderate-Vigorous) | Duration | Key Metrics |
|----------------------------|----------|-------------|
| Running (easy-moderate) | 45 min | 65-70% HRmax, 7-8 METs |
| Cycling (moderate) | 60 min | 65-70% HRmax, 6-7 METs |
| Strength Training | 45 min | Volume load moderate, RPE 6-7 |
| Vinyasa Yoga | 60 min | 55-65% HRmax, 3-4 METs |
| HIIT | 25 min | Work:rest 2:1, avg HR 80% max |

| TIS ~75 (Vigorous-Hard) | Duration | Key Metrics |
|------------------------|----------|-------------|
| Running (tempo) | 40 min | 80-85% HRmax, 10-11 METs |
| Cycling (threshold) | 45 min | 90-100% FTP, 8-9 METs |
| Strength Training (heavy) | 50 min | Volume load high, RPE 8-9 |
| Power Yoga | 50 min | 70-75% HRmax, 4-5 METs |
| HIIT (hard) | 30 min | Work:rest 1:1, avg HR 85% max |

---

## 5. Implementation Recommendations

### 5.1 Processing Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKOUT INTENSITY ENGINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   FRAGMENTS  │  │   STREAMS    │  │   HISTORY    │       │
│  │   PROCESSOR  │  │   PROCESSOR  │  │   ANALYZER   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └────────────┬────┴────────────────┘                │
│                      ▼                                       │
│              ┌───────────────┐                               │
│              │  TIER SELECT  │                               │
│              └───────┬───────┘                               │
│                      ▼                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              INTENSITY CALCULATORS                   │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│  │  │ Tier 1  │ │ Tier 2  │ │ Tier 3  │ │ Tier 4+ │   │    │
│  │  │ MET/RPE │ │ TRIMP   │ │ TSS     │ │ Full    │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         ▼                                    │
│                ┌───────────────┐                             │
│                │  TIS OUTPUT   │                             │
│                │  + Confidence │                             │
│                │  + Breakdown  │                             │
│                └───────────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Data Quality Checks

Before processing, validate data quality:

```
function validateDataQuality(workoutData):
    issues = []
    
    // Fragment validation
    if not workoutData.fragments.timer:
        issues.append("CRITICAL: No timer fragments - cannot calculate duration")
    
    if not workoutData.fragments.action:
        issues.append("WARNING: No action fragments - cannot classify workout type")
    
    // Stream validation
    if workoutData.hr:
        hrQuality = checkHRQuality(workoutData.hr)
        if hrQuality.gaps > 0.1 * workoutData.duration:
            issues.append("WARNING: HR stream has significant gaps")
        if hrQuality.outliers > 0.05 * len(workoutData.hr):
            issues.append("WARNING: HR stream has outlier values")
    
    if workoutData.power:
        powerQuality = checkPowerQuality(workoutData.power)
        if powerQuality.zeros > 0.2 * len(workoutData.power):
            issues.append("WARNING: Power stream has many zero values (coasting?)")
    
    // Cross-validation
    if workoutData.fragments.distance and workoutData.gps:
        distanceMatch = validateDistance(workoutData.fragments.distance, workoutData.gps)
        if distanceMatch < 0.8:
            issues.append("WARNING: Logged distance doesn't match GPS")
    
    return { issues: issues, qualityScore: calculateQualityScore(issues) }
```

### 5.3 Confidence Scoring

Each TIS calculation should include a confidence score:

```
function calculateConfidence(tier, workoutData):
    confidence = 0.5  // Base
    
    // Tier bonus
    confidence += (tier - 1) * 0.1  // +10% per tier
    
    // Fragment completeness bonus
    fragmentScore = calculateFragmentCompleteness(workoutData.fragments)
    confidence += fragmentScore * 0.1
    
    // Stream quality bonus
    if workoutData.hr:
        confidence += checkHRQuality(workoutData.hr) * 0.05
    if workoutData.power:
        confidence += checkPowerQuality(workoutData.power) * 0.05
    if workoutData.gps:
        confidence += checkGPSQuality(workoutData.gps) * 0.05
    
    // Workout type familiarity bonus
    discipline = classifyDiscipline(workoutData.fragments)
    confidence += getDisciplineConfidence(discipline) * 0.1
    
    return min(confidence, 0.95)  // Cap at 95%
```

---

## 6. Summary: Capability Matrix by Tier and Discipline

### 6.1 What CAN Be Identified

| Capability | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|------------|--------|--------|--------|--------|--------|
| Workout duration | ✅ | ✅ | ✅ | ✅ | ✅ |
| Workout type | ✅ | ✅ | ✅ | ✅ | ✅ |
| Estimated METs | ✅ | ✅ | ✅ | ✅ | ✅ |
| RPE inference | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| HR zones | ❌ | ✅ | ✅ | ✅ | ✅ |
| TRIMP | ❌ | ✅ | ✅ | ✅ | ✅ |
| Power zones | ❌ | ❌ | ✅ | ✅ | ✅ |
| TSS | ❌ | ❌ | ✅ | ✅ | ✅ |
| Actual pace/speed | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| Grade-adjusted pace | ❌ | ❌ | ❌ | ✅ | ✅ |
| Personal thresholds | ❌ | ❌ | ❌ | ❌ | ✅ |
| Recovery prediction | ❌ | ❌ | ❌ | ❌ | ✅ |

### 6.2 What CANNOT Be Identified (and Why)

| Limitation | Affects | Reason | Mitigation |
|------------|---------|--------|------------|
| **Actual VO2** | All tiers | Requires lab testing | Use estimated VO2max from tests |
| **Lactate levels** | All tiers | Requires blood sampling | Use HR/power thresholds as proxy |
| **EPOC exact value** | All tiers | Requires metabolic cart | Estimate from intensity/duration |
| **Muscle damage** | Strength | No sensor for this | Infer from volume/RPE patterns |
| **Neuromuscular fatigue** | Strength | No direct measurement | Infer from velocity loss (if VBT) |
| **Heat stress effect** | Outdoor | No temperature sensor | User can log conditions |
| **Altitude effect** | Outdoor | If no elevation data | Use GPS elevation if available |
| **Hydration status** | All | No sensor | Could integrate with smart bottle |
| **Sleep quality impact** | All | External data needed | Could integrate with sleep tracker |

### 6.3 Discipline-Specific Limitations

| Discipline | Tier 1 Limitation | Tier 2 Limitation | Tier 3 Limitation |
|------------|-------------------|-------------------|-------------------|
| **Strength Training** | No 1RM reference | HR poorly correlates | Power not applicable |
| **Yoga** | METs highly variable | Heat elevates HR | No power measurement |
| **Swimming** | Distance logging required | HR lowered in water | No power meters |
| **HIIT** | Anaerobic underestimated | HR lag during intervals | Power variable |
| **Running** | Pace estimated only | Good correlation | Running power estimated |
| **Cycling** | Distance logging required | Good correlation | Gold standard |

---

## 7. Appendix: Formulas and Calculations

### A.1 TRIMP Formula (Banister)

```
TRIMP = D × HRr × 0.64 × e^(1.92 × HRr)

Where:
  D = Duration (minutes)
  HRr = (HRexercise - HRrest) / (HRmax - HRrest)
  e = Euler's number (2.718...)
  
Gender adjustments:
  Males:   weight factor = 0.64 × e^(1.92 × HRr)
  Females: weight factor = 0.86 × e^(1.67 × HRr)
```

### A.2 Training Stress Score (TSS)

```
TSS = (Duration_hours × NP × IF) / (FTP × 3600) × 100

Simplified:
TSS = Duration_hours × IF² × 100

Where:
  NP = Normalized Power (30-sec rolling average, raised to 4th power, averaged, 4th root)
  IF = Intensity Factor = NP / FTP
  FTP = Functional Threshold Power
```

### A.3 MET-Minute Calculation

```
MET-minutes = METs × Duration (minutes)

Weekly Target (WHO):
  Minimum: 600 MET-min/week
  Optimal: 1200+ MET-min/week
```

### A.4 Volume Load Calculation

```
Volume Load = Sets × Reps × Weight

Extended Volume Load = Sets × Reps × Weight × Displacement

Relative Intensity = Weight / Estimated 1RM × 100%
```

### A.5 1RM Estimation Formulas

```
Brzycki:  1RM = Weight × 36 / (37 - Reps)
Epley:    1RM = Weight × (1 + 0.0333 × Reps)
Lander:   1RM = 100 × Weight / (101.3 - 2.67123 × Reps)
```

### A.6 Training Intensity Score (TIS) Composite

```
TIS = (MET-Score × 0.30) + (RPE-Score × 0.35) + (Duration-Score × 0.20) + (Discipline-Factor × 0.15)

Where:
  MET-Score = (Activity METs / Individual METmax) × 100
  RPE-Score = Session RPE × 10
  Duration-Score = (Duration / 60) × Base Intensity Score
  Discipline-Factor = Discipline correction × base score
```

---

## 8. Conclusion

This progressive enhancement framework provides a systematic approach to calculating workout intensity using the fragment-based schema. Key takeaways:

1. **Start with fragments, enhance with streams**: The fragment schema provides sufficient data for basic intensity estimation, with accuracy improving dramatically as sensor streams become available.

2. **Cross-discipline comparison requires correction factors**: Raw metrics don't translate directly between yoga, strength training, and cardio. The TIS framework applies discipline-specific corrections.

3. **RPE is the universal metric**: When in doubt, infer or collect RPE. It's the single metric that works across all disciplines with reasonable accuracy.

4. **Confidence scoring is essential**: Always communicate confidence levels to users so they understand the reliability of intensity estimates.

5. **Historical data enables personalization**: The greatest accuracy gains come from building personal physiological models over time.

---

*Document Version: 1.0*
*Based on Research: Cross-Disciplinary Workout Intensity Measurement (100+ sources)*
*Generated: February 2025*
