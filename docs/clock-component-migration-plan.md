# Clock Component Migration Plan

## Overview

This document provides a detailed migration plan for updating the clock components to use the modern design system based on the reference implementation. The migration will maintain all existing functionality while adopting the new visual design patterns.

## Migration Scope

### Components to Migrate

#### Primary Components
1. **ClockAnchor.tsx** - Main timer display component
2. **TimeDisplay.tsx** - Time unit display container
3. **TimeUnit.tsx** - Individual time unit component
4. **EnhancedTimerHarness.tsx** - Testing and development harness
5. **TimerMemoryVisualization.tsx** - Memory state visualization

#### Supporting Components
6. **UnifiedClockStory.tsx** - Storybook story component
7. **All clock-related stories** in `stories/clock/`

## Design Reference Analysis

### Key Features from Reference Implementation
```typescript
// Reference design patterns to adopt:
1. Card-based layout with consistent spacing
2. Badge components for status indicators
3. Progress components for visual feedback
4. Button components with icons
5. Consistent typography and color scheme
6. Grid layouts for responsive design
7. Hover states and transitions
```

### Target Layout Structure
```typescript
// Reference layout:
<Card>
  <CardContent className="p-8">
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold">{workout.name}</h2>
      <div className="flex justify-center items-center gap-4">
        <Badge variant="secondary">{workout.type}</Badge>
        <Badge variant="outline">Round {currentRound}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Time Display */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {workout.duration ? 'Time Remaining' : 'Time Elapsed'}
          </Label>
          <div className="text-6xl font-mono font-bold text-primary">
            {formatTime(timeRemaining || timeElapsed)}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <div className="text-4xl font-mono font-bold">
            {/* Additional metric */}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 pt-4">
        <Button size="lg" className="w-24">
          <Play size={20} className="mr-2" />
          Start
        </Button>
        <Button variant="destructive" size="lg">
          <Square size={20} className="mr-2" />
          Finish
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

## Component Migration Details

### 1. ClockAnchor.tsx Migration

#### Current Interface
```typescript
interface ClockAnchorProps {
  blockKey: string;
  title?: string;
  description?: string;
  duration?: number;
  showProgress?: boolean;
}
```

#### Target Interface (Enhanced)
```typescript
interface ClockAnchorProps {
  blockKey: string;
  title?: string;
  description?: string;
  duration?: number;
  showProgress?: boolean;
  showControls?: boolean;
  workoutType?: 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA';
  currentRound?: number;
  onRoundComplete?: () => void;
}
```

#### Migration Implementation
```typescript
// New ClockAnchor implementation
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square } from '@phosphor-icons/react';
import { useTimerElapsed } from '../../runtime/hooks/useTimerElapsed';
import { cn } from '@/lib/utils';

export const ClockAnchor: React.FC<ClockAnchorProps> = ({
  blockKey,
  title = "AMRAP 20",
  description = "As Many Rounds As Possible",
  duration,
  showProgress = true,
  showControls = true,
  workoutType = 'FOR_TIME',
  currentRound = 1,
  onRoundComplete
}) => {
  const { elapsed } = useTimerElapsed(blockKey);

  // ... existing timer logic

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
            <div className="flex justify-center items-center gap-2">
              <Badge variant="secondary">{workoutType}</Badge>
              <Badge variant="outline">Round {currentRound}</Badge>
            </div>
          </div>

          {/* Main Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Timer Display */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-muted-foreground">
                {duration ? 'Time Remaining' : 'Time Elapsed'}
              </Label>
              <div className={cn(
                "text-6xl font-mono font-bold transition-colors",
                isRunning ? "text-primary animate-pulse" : "text-foreground"
              )}>
                {formatTime(displayTime)}
              </div>
              {showProgress && duration > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              )}
            </div>

            {/* Status/Info Panel */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <div className="flex flex-col items-center justify-center h-24">
                <div className={cn(
                  "w-4 h-4 rounded-full mb-2",
                  isRunning ? "bg-green-500" : "bg-gray-400"
                )} />
                <span className="text-lg font-medium">
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          {showControls && (
            <div className="flex justify-center gap-4 pt-4 border-t">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className="w-32"
                variant={isRunning ? "secondary" : "default"}
              >
                {isRunning ? (
                  <>
                    <Pause size={20} className="mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={20} className="mr-2" />
                    Start
                  </>
                )}
              </Button>

              {onRoundComplete && (
                <Button onClick={onRoundComplete} variant="outline" size="lg">
                  Finish Round
                </Button>
              )}

              <Button onClick={handleReset} variant="destructive" size="lg">
                <Square size={20} className="mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 2. TimeDisplay.tsx Migration

#### Current Implementation
```typescript
// Uses custom TimeUnit components with individual styling
<div className="flex gap-1 md:gap-2 w-full max-w-xs md:max-w-md">
  {timeUnits.map((unit, index) => (
    <React.Fragment key={index}>
      <TimeUnit value={unit.value} label={unit.label} />
      {index < timeUnits.length - 1 && (
        <div className="flex items-center justify-center text-gray-400 text-4xl font-light -mt-5">:</div>
      )}
    </React.Fragment>
  ))}
</div>
```

#### Target Implementation
```typescript
// Simplified, integrated into ClockAnchor
// Remove TimeDisplay component entirely
// Merge functionality directly into ClockAnchor for cleaner design
```

### 3. TimeUnit.tsx Migration

#### Decision: Deprecate
- The individual TimeUnit design doesn't align with the modern card-based layout
- Functionality will be merged into ClockAnchor
- Remove component and update imports

### 4. EnhancedTimerHarness.tsx Migration

#### MemoryCard Updates
```typescript
// Before
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">

// After
<Card>
  <CardContent className="p-6">
```

#### TimerControls Updates
```typescript
// Before
<div className="grid grid-cols-2 gap-3">
  <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
    Start
  </button>

// After
<div className="flex gap-2">
  <Button size="sm">
    <Play size={16} className="mr-2" />
    Start
  </Button>
```

### 5. TimerMemoryVisualization.tsx Migration

#### Layout Updates
```typescript
// Before
<div className={`p-4 border border-gray-200 rounded-lg ${
  isHighlighted ? 'bg-blue-100' : 'bg-white'
}`}>

// After
<Card className={cn(
  "transition-all duration-200",
  isHighlighted && "ring-2 ring-primary"
)}>
  <CardContent className="p-4">
```

#### Status Indicators
```typescript
// Before
<div className={`w-3 h-3 rounded-full ${
  isRunning ? 'bg-green-500' : 'bg-gray-400'
}`} />

// After
<Badge variant={isRunning ? "default" : "secondary"} className="gap-2">
  <div className={cn(
    "w-2 h-2 rounded-full",
    isRunning ? "bg-green-500" : "bg-gray-400"
  )} />
  {isRunning ? 'Running' : 'Stopped'}
</Badge>
```

## Storybook Updates

### UnifiedClockStory.tsx Updates

#### Layout Restructure
```typescript
// Before: Side-by-side layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Clock Display - Left */}
  <div className="lg:col-span-1">
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">

// After: Stacked card layout
<div className="space-y-6">
  {/* Timer Card */}
  <Card>
    <CardContent className="p-6">
      <h3 className="text-lg font-semibold mb-4">Timer Display</h3>
      <ClockAnchor
        blockKey={blockKey}
        title={config.title}
        description={config.description}
        duration={config.timerType === 'countdown' ? config.durationMs : undefined}
        showProgress={config.timerType === 'countdown'}
        workoutType={config.timerType === 'countdown' ? 'AMRAP' : 'FOR_TIME'}
      />
    </CardContent>
  </Card>

  {/* Memory and Controls */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <MemoryCard ... />
    <TimerControls ... />
  </div>
```

### New Stories to Create

#### 1. Enhanced Timer Display
```typescript
export const EnhancedDesign: Story = {
  render: () => (
    <EnhancedTimerHarness timerType="countdown" durationMs={1200000}>
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen">
          <ClockAnchor
            blockKey={blockKey}
            title="Fran"
            description="21-15-9 Thrusters & Pull-ups"
            duration={1200000}
            workoutType="AMRAP"
            currentRound={1}
            showControls={true}
          />
        </div>
      )}
    </EnhancedTimerHarness>
  )
};
```

#### 2. Multi-Metric Display
```typescript
export const WithMetrics: Story = {
  render: () => (
    <EnhancedTimerHarness timerType="countdown" durationMs={600000}>
      {({ blockKey, isRunning }) => (
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Timer */}
              <ClockAnchor
                blockKey={blockKey}
                title="Grace"
                description="30 Clean & Jerks"
                duration={600000}
                showProgress={true}
                showControls={false}
              />

              {/* Heart Rate */}
              <Card>
                <CardContent className="p-6 text-center">
                  <Label className="text-sm text-muted-foreground">Heart Rate</Label>
                  <div className="text-4xl font-mono font-bold text-red-600">
                    {Math.round(120 + Math.random() * 40)}
                  </div>
                  <Badge variant="outline" className="mt-2">Zone 3</Badge>
                </CardContent>
              </Card>

              {/* Reps */}
              <Card>
                <CardContent className="p-6 text-center">
                  <Label className="text-sm text-muted-foreground">Reps Completed</Label>
                  <div className="text-4xl font-mono font-bold text-primary">
                    {Math.floor(Math.random() * 30)}
                  </div>
                  <Progress value={65} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </EnhancedTimerHarness>
  )
};
```

## Migration Steps

### Phase 1: Foundation (Day 1-2)
1. Install dependencies (shadcn/ui, @phosphor-icons/react)
2. Set up project structure and utility functions
3. Configure Tailwind CSS and CSS variables
4. Create new component directory structure

### Phase 2: Core Component Migration (Day 3-4)
1. **ClockAnchor.tsx**
   - Implement new card-based layout
   - Add Badge components for status
   - Add Progress component for visual feedback
   - Add Button components with icons
   - Maintain all existing functionality

2. **Remove Deprecated Components**
   - Remove TimeDisplay.tsx
   - Remove TimeUnit.tsx
   - Update all imports

### Phase 3: Supporting Components (Day 5)
1. **EnhancedTimerHarness.tsx**
   - Update MemoryCard to use Card layout
   - Update TimerControls to use Button components
   - Add Badge components for status indicators

2. **TimerMemoryVisualization.tsx**
   - Convert to Card-based layout
   - Add Badge for running state
   - Improve visual hierarchy

### Phase 4: Storybook Updates (Day 6)
1. Update UnifiedClockStory.tsx
2. Create new enhanced stories
3. Update all existing clock stories
4. Validate visual consistency

### Phase 5: Testing & Validation (Day 7)
1. Run unit tests and update as needed
2. Validate Storybook functionality
3. Test responsive design
4. Check accessibility compliance
5. Performance validation

## Backward Compatibility

### Breaking Changes
- **TimeDisplay and TimeUnit components**: Deprecated and removed
- **ClockAnchor interface**: New optional props added
- **Import paths**: Updated to use new component structure

### Migration Path for Existing Code
```typescript
// Old usage
<ClockAnchor blockKey="timer-1" />

// New usage (backward compatible)
<ClockAnchor
  blockKey="timer-1"
  title="Custom Title"
  description="Custom Description"
  showProgress={true}
/>

// Advanced usage
<ClockAnchor
  blockKey="timer-1"
  title="Fran"
  description="21-15-9 Thrusters & Pull-ups"
  duration={600000}
  workoutType="AMRAP"
  currentRound={2}
  showControls={true}
  onRoundComplete={() => console.log('Round complete')}
/>
```

## Success Criteria

### Visual Consistency
- [ ] All clock components use Card-based layouts
- [ ] Consistent spacing and typography
- [ ] Uniform color scheme and status indicators
- [ ] Responsive design works on all screen sizes

### Functional Preservation
- [ ] All existing timer functionality preserved
- [ ] Memory visualization works correctly
- [ ] Storybook interactions work as expected
- [ ] No regressions in existing tests

### Developer Experience
- [ ] Cleaner component interfaces
- [ ] Better TypeScript support
- [ ] Improved Storybook documentation
- [ ] Easier component customization

### Performance
- [ ] No significant bundle size increase (<10%)
- [ ] Improved runtime performance
- [ ] Better memory usage
- [ ] Smooth animations and transitions

## Risk Mitigation

### Technical Risks
1. **Dependency Conflicts**: Use npm-check-updates to identify conflicts early
2. **Bundle Size**: Monitor with bundlephobia and implement code splitting
3. **Performance**: Profile components and optimize as needed

### Timeline Risks
1. **Complexity**: Break into smaller, manageable chunks
2. **Testing**: Allocate dedicated time for test updates
3. **Documentation**: Update documentation alongside development

### User Experience Risks
1. **Visual Changes**: Provide migration guide for existing users
2. **Breaking Changes**: Maintain backward compatibility where possible
3. **Learning Curve**: Provide examples and documentation

## Post-Migration Activities

1. **Performance Monitoring**: Set up bundle size and performance monitoring
2. **User Feedback**: Collect feedback on new design
3. **Documentation**: Update all component documentation
4. **Further Enhancements**: Plan additional features based on new design system