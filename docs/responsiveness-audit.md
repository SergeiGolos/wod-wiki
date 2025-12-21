# WOD Workbench Responsiveness Audit

## Executive Summary

This document provides a comprehensive audit of responsive design issues across the three main screens of the WOD Workbench: **Plan**, **Track**, and **Analyze**. The audit identifies specific problems affecting usability on different screen sizes and provides actionable recommendations.

**Current Breakpoint Implementation:**
- Mobile: `< 768px`
- Tablet: `768px - 1024px`  
- Desktop: `≥ 1024px`

---

## Component Architecture Overview

The workbench uses a **SlidingViewport** model with three views sliding horizontally:

```
PLAN:    [Editor (Full Width)]
TRACK:   [TimerIndex (1/3)] [Timer (2/3)]
ANALYZE: [AnalyticsIndex (1/3)] [Timeline (2/3)]
```

Key files:
- [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx) - Main container
- [SlidingViewport.tsx](../src/components/layout/SlidingViewport.tsx) - Layout manager
- [RefinedTimerDisplay.tsx](../src/components/workout/RefinedTimerDisplay.tsx) - Timer screen
- [TimelineView.tsx](../src/timeline/TimelineView.tsx) - Analytics view

---

## Screen 1: Plan View

### Current Behavior
- **Desktop**: Full-width Monaco editor
- **Tablet**: Full-width Monaco editor
- **Mobile**: Full-width Monaco editor

### Issues

#### P1-01: Monaco Editor Touch Interaction
**Severity**: Medium  
**Affected Sizes**: Mobile (`< 768px`)

Monaco Editor has limited touch support on mobile devices. The pinch-to-zoom and text selection gestures conflict with native browser behaviors.

**Location**: [PlanPanel.tsx](../src/components/workbench/PlanPanel.tsx)

**Recommendation**: Consider providing a simplified text editor fallback for mobile or implementing touch-friendly editing controls.

---

#### P1-02: Toolbar Elements Missing on Mobile
**Severity**: Low  
**Affected Sizes**: Mobile (`< 768px`)

The header shows limited functionality on mobile - several toolbar actions like Debug button and GitHub link are hidden:

```tsx
// UnifiedWorkbench.tsx:389-396
{!isMobile && (
  <DebugButton
    isDebugMode={isDebugMode}
    onClick={() => setIsDebugMode(!isDebugMode)}
  />
)}
```

**Recommendation**: Consider adding a mobile-friendly overflow menu (hamburger menu or "..." button) for these secondary actions.

---

#### P1-03: CommitGraph Logo Sizing
**Severity**: Low  
**Affected Sizes**: Mobile (`< 768px`)

The logo container uses fixed pixel widths:

```tsx
// UnifiedWorkbench.tsx:363
<div className={cn('h-10 flex items-center', isMobile ? 'w-[150px]' : 'w-[300px]')}>
```

This could cause overflow issues on very small screens (< 360px).

**Recommendation**: Use percentage or `min-width` with `flex-shrink` instead of fixed pixel values.

---

## Screen 2: Track View (CRITICAL)

### Current Behavior
- **Desktop**: Side-by-side layout with TimerIndex (1/3) + Timer (2/3)
- **Tablet**: 50/50 vertical split with Timer on top, Index below
- **Mobile**: Full-height Timer with Index integrated inside `TrackPanelPrimary`

### Issues

#### T2-01: Timer Circle Fixed Dimensions Overflow on Small Screens
**Severity**: CRITICAL  
**Affected Sizes**: Mobile (`< 400px width`), Small tablets in portrait

The timer circle uses fixed pixel dimensions that don't scale properly:

```tsx
// RefinedTimerDisplay.tsx:230
<div className="relative w-48 h-48 lg:w-96 lg:h-96 flex items-center justify-center">
```

The inner button also uses fixed sizing:

```tsx
// RefinedTimerDisplay.tsx:242
<button className="relative z-10 w-40 h-40 lg:w-80 lg:h-80 ...">
```

**Problem**: On screens < 400px, the 192px (w-48) timer with surrounding controls takes more than available viewport width, causing horizontal overflow.

**Recommendation**: 
- Use viewport-relative units: `w-[min(192px,80vw)]` or `w-[clamp(120px,40vw,384px)]`
- Add `max-w-full` constraints
- Use CSS `aspect-ratio` for maintaining circle proportions

---

#### T2-02: Control Buttons Pushed Off Screen
**Severity**: CRITICAL  
**Affected Sizes**: Mobile (`< 768px`), especially in landscape

The control button row below the timer can extend beyond viewport:

```tsx
// RefinedTimerDisplay.tsx:261-267
<div className="flex items-center gap-6 mt-8 flex-wrap justify-center">
    <button className="group flex flex-col items-center gap-2 ...">
        <div className="w-14 h-14 flex items-center justify-center rounded-full ...">
```

Issues:
- Fixed `w-14 h-14` (56px) button containers
- `gap-6` (24px) spacing doesn't adapt to screen size
- `mt-8` (32px) margin pushes content down

**Recommendation**:
- Use responsive gap: `gap-3 sm:gap-6`
- Use responsive sizing: `w-12 h-12 sm:w-14 sm:h-14`
- Use responsive margin: `mt-4 sm:mt-8`

---

#### T2-03: Action Buttons Fixed Height Causes Overflow
**Severity**: HIGH  
**Affected Sizes**: Mobile (`< 768px`)

Dynamic action buttons have fixed sizing that doesn't adapt:

```tsx
// RefinedTimerDisplay.tsx:276
<button className={`px-4 h-12 rounded-full text-sm font-semibold ...`}>
```

When multiple actions exist, they wrap but the fixed `h-12` (48px) combined with `px-4` can cause text truncation.

**Recommendation**: 
- Use `min-h-12` instead of `h-12`
- Add `py-2` for vertical padding
- Consider adding `text-ellipsis truncate` with `max-w-[...]` for very long labels

---

#### T2-04: Skip Forward Button Fixed 80px Size
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (`< 400px`)

```tsx
// RefinedTimerDisplay.tsx:282
<button onClick={onNext} className="w-20 h-20 flex items-center justify-center rounded-full ...">
```

80px button is too large for small screens when combined with other controls.

**Recommendation**: `w-16 h-16 sm:w-20 sm:h-20`

---

#### T2-05: Timer Display Text Sizing
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (`< 400px`)

```tsx
// RefinedTimerDisplay.tsx:249
<span className={`... ${compact ? 'text-5xl' : 'text-7xl lg:text-8xl'}`}>
```

`text-5xl` (3rem/48px) may still overflow on very small screens when displaying times like `99:59`.

**Recommendation**: 
- Add more breakpoints: `text-4xl sm:text-5xl md:text-7xl lg:text-8xl`
- Or use clamp: `text-[clamp(2rem,8vw,4.5rem)]`

---

#### T2-06: Stack View Panel Fixed Width on Desktop
**Severity**: MEDIUM  
**Affected Sizes**: Tablet landscape, small desktop

```tsx
// RefinedTimerDisplay.tsx:167
<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 lg:gap-8">
```

The 400px fixed width for the stack view doesn't scale on smaller desktop/tablet screens.

**Recommendation**: Use `lg:grid-cols-[minmax(280px,400px)_1fr]` or percentages like `lg:grid-cols-[35%_1fr]`

---

#### T2-07: Header Label Spacing
**Severity**: LOW  
**Affected Sizes**: Mobile (`< 768px`)

```tsx
// RefinedTimerDisplay.tsx:219-221
<div className="text-center mb-8 shrink-0">
    <h2 className="text-xl font-bold ...">
```

`mb-8` (32px) is excessive on small screens where vertical space is limited.

**Recommendation**: `mb-4 sm:mb-8`

---

#### T2-08: Tablet 50/50 Split Wastes Timer Space
**Severity**: MEDIUM  
**Affected Sizes**: Tablet (`768px - 1024px`)

```tsx
// SlidingViewport.tsx:150-156
<div className="h-1/2 border-b border-border overflow-hidden">
  {trackPrimaryPanel}
</div>
<div className="h-1/2 overflow-hidden">
  {trackIndexPanel}
</div>
```

A 50/50 split gives too little vertical space to the timer on tablets, making the timer ring appear cramped.

**Recommendation**: Use `h-[60%]` / `h-[40%]` split, or make the index collapsible.

---

#### T2-09: Mobile Track View Missing Auto-Scroll Toggle
**Severity**: LOW  
**Affected Sizes**: Mobile (`< 768px`)

When `isUserScrolledUp` is true, auto-scroll is disabled but there's no visual indicator or way to re-enable without scrolling to bottom.

**Location**: [TrackPanel.tsx#L65-85](../src/components/workbench/TrackPanel.tsx#L65-85)

**Recommendation**: Add a "scroll to bottom" floating button when auto-scroll is disabled.

---

## Screen 3: Analyze View

### Current Behavior
- **Desktop**: AnalyticsIndex (1/3) + Timeline (2/3)
- **Tablet**: Timeline (full) with Index (1/3 height) below
- **Mobile**: Timeline only (Index hidden)

### Issues

#### A3-01: Chart Height Fixed at 450px
**Severity**: HIGH  
**Affected Sizes**: Mobile (`< 768px`), Tablet portrait

```tsx
// TimelineView.tsx:145
<div className="p-4 min-h-[450px] h-[450px] flex-shrink-0 border-b border-border">
```

A fixed 450px chart height consumes most of the viewport on mobile, leaving no room for the details table below.

**Recommendation**: 
- Use viewport-relative heights: `h-[min(450px,60vh)]`
- Or use responsive heights: `h-[280px] sm:h-[350px] lg:h-[450px]`

---

#### A3-02: Metric Toggle Buttons Overflow
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (`< 768px`), when many metrics exist

```tsx
// TimelineView.tsx:117
<div className="flex bg-muted rounded-lg p-1 border border-border overflow-x-auto max-w-[400px] custom-scrollbar">
```

The `max-w-[400px]` constraint causes horizontal scroll, but the scrollbar is hidden by `custom-scrollbar` styling.

**Recommendation**: 
- Show scroll indicators or use wrapping: `flex-wrap`
- Or use a dropdown/select for metric selection on mobile

---

#### A3-03: Mobile View Loses Analytics Index
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (`< 768px`)

```tsx
// SlidingViewport.tsx:122-127 (mobile layout)
<div className="w-1/3 h-full flex-shrink-0">
  {analyzePrimaryPanel}  // Only primary panel, no index!
</div>
```

Mobile users cannot access segment filtering as the AnalyticsIndexPanel is not rendered.

**Recommendation**: Add a toggleable drawer or bottom sheet for segment selection on mobile.

---

#### A3-04: Header Takes Fixed Height Regardless of Screen
**Severity**: LOW  
**Affected Sizes**: Mobile (`< 768px`)

```tsx
// TimelineView.tsx:105
<header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0 z-10">
```

56px header consumes significant space on small screens.

**Recommendation**: `h-12 sm:h-14` (48px on mobile)

---

#### A3-05: Segment Details Table Not Responsive
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (`< 768px`)

The segment comparison table (rendered below the chart) doesn't have mobile-friendly styling and can cause horizontal overflow.

**Recommendation**: 
- Use horizontal scroll with sticky first column
- Or collapse into accordion cards on mobile

---

## Cross-Cutting Issues

### C-01: Header Height Inconsistent Between Components
**Severity**: LOW  
**Affected Files**: Multiple

Different headers use different fixed heights:
- `UnifiedWorkbench.tsx`: `h-14` (56px)
- `TimelineView.tsx`: `h-14` (56px)
- `RuntimeDebugPanel.tsx`: Variable

This should be standardized via a design token or shared constant.

---

### C-02: View Mode Buttons Use Icon-Only on Mobile
**Severity**: LOW  
**Affected Sizes**: Mobile (`< 768px`)

```tsx
// UnifiedWorkbench.tsx:405-429
size={isMobile ? 'icon' : 'sm'}
...
{!isMobile && 'Plan'}
```

While space-efficient, icon-only buttons reduce discoverability for new users.

**Recommendation**: Consider adding tooltips or a labeled first-run experience.

---

### C-03: Hardcoded Breakpoint Logic
**Severity**: LOW  
**Affected Files**: Multiple

Breakpoint checks are duplicated across components:

```tsx
// UnifiedWorkbench.tsx:100-101
const checkMobile = () => setIsMobile(window.innerWidth < 768);

// SlidingViewport.tsx:73-75
setIsMobile(width < 768);
setIsTablet(width >= 768 && width < 1024);
```

**Recommendation**: Create a shared `useBreakpoint` hook with consistent breakpoint definitions.

---

### C-04: RuntimeDebugPanel Fixed Width
**Severity**: MEDIUM  
**Affected Sizes**: Screens < 768px wide

```tsx
// RuntimeDebugPanel.tsx:352
<div className="fixed right-0 top-0 bottom-0 w-[480px] bg-background ...">
```

The debug panel at 480px would overflow on mobile and smaller tablets.

**Recommendation**: 
- `w-full sm:w-[480px]`
- Or use a full-screen modal on mobile

---

### C-05: Touch Target Sizes
**Severity**: MEDIUM  
**Affected Sizes**: Mobile (touch devices)

Some interactive elements are smaller than the recommended 44x44px touch target:
- Secondary timer cards: Variable
- Fragment pills in stack view
- Some icon buttons

**Recommendation**: Ensure minimum `min-w-11 min-h-11` (44px) for touch targets on mobile.

---

## Priority Matrix

| ID | Issue | Severity | Effort | Priority |
|----|-------|----------|--------|----------|
| T2-01 | Timer circle overflow | CRITICAL | Medium | P0 |
| T2-02 | Control buttons off-screen | CRITICAL | Low | P0 |
| A3-01 | Fixed chart height | HIGH | Low | P1 |
| T2-03 | Action button overflow | HIGH | Low | P1 |
| C-04 | Debug panel width | MEDIUM | Low | P1 |
| T2-06 | Stack view fixed width | MEDIUM | Low | P2 |
| T2-08 | Tablet split ratio | MEDIUM | Low | P2 |
| A3-02 | Metric toggle overflow | MEDIUM | Medium | P2 |
| A3-03 | Mobile missing index | MEDIUM | High | P2 |
| A3-05 | Table not responsive | MEDIUM | Medium | P2 |
| T2-04 | Skip button size | MEDIUM | Low | P3 |
| T2-05 | Timer text sizing | MEDIUM | Low | P3 |
| C-05 | Touch targets | MEDIUM | Medium | P3 |
| P1-01 | Monaco touch | MEDIUM | High | P3 |
| C-03 | Hardcoded breakpoints | LOW | Medium | P4 |
| Others | Various LOW | LOW | Low | P4 |

---

## Recommended Fixes

### Immediate Fixes (P0)

#### Fix T2-01 and T2-02: Timer Circle and Controls

```tsx
// RefinedTimerDisplay.tsx - Timer container
<div className="relative w-[min(192px,75vw)] h-[min(192px,75vw)] sm:w-48 sm:h-48 lg:w-96 lg:h-96 flex items-center justify-center z-10 transition-all">

// Inner button
<button className="relative z-10 w-[min(160px,65vw)] h-[min(160px,65vw)] sm:w-40 sm:h-40 lg:w-80 lg:h-80 ...">

// Control row
<div className="flex items-center gap-3 sm:gap-6 mt-4 sm:mt-8 flex-wrap justify-center px-4">
```

### Short-Term Fixes (P1)

#### Fix A3-01: Chart Height

```tsx
// TimelineView.tsx
<div className="p-4 h-[min(450px,55vh)] min-h-[280px] flex-shrink-0 border-b border-border">
```

#### Fix C-04: Debug Panel

```tsx
// RuntimeDebugPanel.tsx
<div className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full bg-background ...">
```

---

## Testing Recommendations

### Viewport Sizes to Test

| Device | Width | Height | Orientation |
|--------|-------|--------|-------------|
| iPhone SE | 375px | 667px | Portrait |
| iPhone 14 | 390px | 844px | Portrait |
| iPhone 14 Pro Max | 430px | 932px | Portrait |
| iPad Mini | 768px | 1024px | Portrait |
| iPad Pro 11" | 834px | 1194px | Portrait |
| Small Laptop | 1280px | 800px | Landscape |
| Desktop | 1920px | 1080px | Landscape |

### Storybook Viewport Testing

Add viewport addon stories for key components:

```tsx
// Example: RefinedTimerDisplay.stories.tsx
export const MobileSmall: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1', // 320x568
    },
  },
};

export const MobileMedium: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone12', // 390x844
    },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'ipad', // 768x1024
    },
  },
};
```

---

## Appendix: Component File Locations

| Component | Path |
|-----------|------|
| UnifiedWorkbench | `src/components/layout/UnifiedWorkbench.tsx` |
| SlidingViewport | `src/components/layout/SlidingViewport.tsx` |
| TrackPanel | `src/components/workbench/TrackPanel.tsx` |
| RefinedTimerDisplay | `src/components/workout/RefinedTimerDisplay.tsx` |
| TimerIndexPanel | `src/components/layout/TimerIndexPanel.tsx` |
| TimelineView | `src/timeline/TimelineView.tsx` |
| AnalyticsIndexPanel | `src/components/layout/AnalyticsIndexPanel.tsx` |
| RuntimeDebugPanel | `src/components/workout/RuntimeDebugPanel.tsx` |
| PlanPanel | `src/components/workbench/PlanPanel.tsx` |

---

*Audit completed: December 21, 2025*
*Auditor: GitHub Copilot*
