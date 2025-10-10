# Design System Migration Research

## Overview

This document analyzes the migration from the current WOD Wiki component styling to a modern, unified design system based on the provided HTML/React implementation. The target design uses shadcn/ui components with Tailwind CSS, creating a consistent, accessible, and maintainable UI across the entire project.

## Current State Analysis

### Existing Component Structure

#### Clock Components
- **ClockAnchor.tsx**: Main timer display component
- **TimeDisplay.tsx**: Time unit display with individual units
- **TimeUnit.tsx**: Individual time unit with value and label
- **EnhancedTimerHarness.tsx**: Testing and development harness

#### Memory Components
- **TimerMemoryVisualization.tsx**: Memory state visualization
- **MemoryCard**: Enhanced timer harness memory display

#### Story Components
- **UnifiedClockStory.tsx**: Standardized story format
- **TimerTestHarness.tsx**: Testing utilities

#### Editor Components
- **WodWiki.tsx**: Main Monaco editor component

### Current Design Patterns
- Tailwind CSS with custom utility classes
- Individual styled components without design system consistency
- Mixed layout patterns (grid, flex, custom)
- No standardized component library usage
- Inconsistent spacing, typography, and color usage

## Target Design System Analysis

### Component Library Requirements

#### shadcn/ui Components Needed
```typescript
// Core components from reference implementation
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
```

#### Icon Library Requirements
- **@phosphor-icons/react**: Modern icon library with consistent weight and style
- Icons used: Play, Pause, Square, Plus, Minus

#### Additional Components for WOD Wiki
- **Tabs/TabList**: For switching between editor, timer, and memory views
- **Dialog/Modal**: For settings and configuration
- **Tooltip**: For help and information
- **Alert**: For error and success messages
- **Separator**: Visual content division
- **Skeleton**: Loading states

### Design Patterns to Implement

#### 1. Card-based Layouts
```typescript
// Current: Custom divs with Tailwind
<div className="bg-white rounded-lg shadow-sm p-8">

// Target: shadcn/ui Card
<Card>
  <CardContent className="p-8">
```

#### 2. Consistent Button Styling
```typescript
// Current: Mixed button styles
<button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">

// Target: shadcn/ui Button
<Button size="lg" className="w-24">
  <Play size={20} className="mr-2" />
  Start
</Button>
```

#### 3. Progress Indicators
```typescript
// Current: Custom progress bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
</div>

// Target: shadcn/ui Progress
<Progress value={progress} className="h-2" />
```

#### 4. Status Badges
```typescript
// Current: Custom badge styling
<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">

// Target: shadcn/ui Badge
<Badge variant="secondary">AMRAP</Badge>
```

## Migration Impact Analysis

### High Impact Areas

#### 1. Clock Display Components
**Files to modify:**
- `src/clock/anchors/ClockAnchor.tsx`
- `src/clock/components/TimeDisplay.tsx`
- `src/clock/components/TimeUnit.tsx`

**Changes needed:**
- Replace custom div styling with Card/CardContent
- Update button components to use shadcn/ui Button
- Replace custom progress bar with Progress component
- Add Badge components for status indicators
- Update typography and spacing consistency

#### 2. Timer Control Components
**Files to modify:**
- `src/clock/components/EnhancedTimerHarness.tsx`
- Stories in `stories/clock/`

**Changes needed:**
- Update MemoryCard to use Card layout
- Replace TimerControls with Button components
- Add Badge components for status
- Consistent spacing and layout

#### 3. Editor Components
**Files to modify:**
- `src/editor/WodWiki.tsx`
- Editor control components

**Changes needed:**
- Wrap editor in Card component
- Add consistent toolbar styling
- Update button controls

#### 4. Storybook Components
**Files to modify:**
- `stories/clock/UnifiedClockStory.tsx`
- All clock-related stories

**Changes needed:**
- Update story layouts to use Card components
- Consistent prop interfaces
- Updated controls and styling

### Medium Impact Areas

#### 1. Fragment Visualization
**Files to modify:**
- `src/components/fragments/` components

**Changes needed:**
- Update to use consistent Badge and Card patterns
- Standardize color schemes

#### 2. Memory Visualization
**Files to modify:**
- `src/components/fragments/TimerMemoryVisualization.tsx`

**Changes needed:**
- Implement Card-based layout
- Use Badge for status indicators
- Update table styling

### Low Impact Areas

#### 1. Parser Components
- Minimal UI changes needed
- Focus on any status displays or controls

#### 2. Runtime Components
- Mostly logic, minimal UI impact

## Dependencies and Setup

### Required Packages
```json
{
  "dependencies": {
    "@phosphor-icons/react": "^2.0.10",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-label": "^2.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### shadcn/ui Setup Required
1. Initialize shadcn/ui in the project
2. Install required components
3. Configure Tailwind CSS for shadcn/ui
4. Set up component library structure

### File Structure Changes
```
src/
├── components/
│   └── ui/           # New: shadcn/ui components
├── clock/
│   └── components/   # Modified: New design patterns
├── editor/
│   └── components/   # Modified: Updated styling
└── lib/              # New: Utility functions (cn, etc.)
```

## Migration Strategy

### Phase 1: Foundation Setup
1. Install required dependencies
2. Set up shadcn/ui
3. Create utility functions (cn for class merging)
4. Update Tailwind configuration

### Phase 2: Core Component Migration
1. Update ClockAnchor with new design system
2. Migrate TimeDisplay and TimeUnit
3. Update EnhancedTimerHarness components
4. Test with existing stories

### Phase 3: Editor and Fragment Migration
1. Update WodWiki editor component
2. Migrate fragment visualization components
3. Update memory visualization

### Phase 4: Storybook and Testing
1. Update all stories to use new components
2. Update test mocks and expectations
3. Validate functionality

### Phase 5: Polish and Optimization
1. Consistency review
2. Performance optimization
3. Accessibility improvements
4. Documentation updates

## Benefits of Migration

### 1. Consistency
- Unified design language across all components
- Consistent spacing, typography, and colors
- Standardized interaction patterns

### 2. Maintainability
- Reduced custom CSS
- Centralized design tokens
- Easier theme management

### 3. Accessibility
- Built-in accessibility features from shadcn/ui
- Proper keyboard navigation
- Screen reader support

### 4. Developer Experience
- Type-safe component props
- Better IntelliSense support
- Consistent component APIs

## Risks and Mitigations

### 1. Breaking Changes
**Risk:** Existing component interfaces may change
**Mitigation:** Maintain backward compatibility where possible, document breaking changes

### 2. Bundle Size
**Risk:** Additional dependencies may increase bundle size
**Mitigation:** Tree-shaking, selective imports, performance monitoring

### 3. Learning Curve
**Risk:** Team needs to learn new component library
**Mitigation:** Documentation, training sessions, gradual migration

## Next Steps

1. **Stakeholder Approval**: Review and approve migration plan
2. **Dependency Installation**: Set up required packages
3. **Proof of Concept**: Migrate ClockAnchor as example
4. **Team Review**: Validate approach and design
5. **Full Migration**: Implement across all components
6. **Testing and Validation**: Ensure functionality preservation

## Success Metrics

- **Design Consistency**: 90%+ reduction in custom CSS
- **Developer Velocity**: 25%+ faster component development
- **Accessibility Score**: WCAG 2.1 AA compliance
- **Bundle Size**: <10% increase in final bundle size
- **User Satisfaction**: Positive feedback on new design