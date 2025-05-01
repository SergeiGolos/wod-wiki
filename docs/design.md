# wod.wiki Design Guide

## Application Overview

wod.wiki is a specialized workout editor and timer application that allows users to:

1. Create structured workout routines using a specialized markdown-like syntax
2. Execute workouts with precise timing
3. Track performance metrics across multiple workout sessions
4. Visualize workout results and progress

The application combines a code-like editing experience with real-time workout execution, making it unique in the fitness application space.

## Core User Experience

### Target Audience

- CrossFit athletes and coaches
- Functional fitness enthusiasts
- Strength and conditioning professionals
- Programming designers who create workout schedules

### Key User Flows

1. **Creating Workouts**: Users enter workout details in a specialized editor with syntax highlighting and auto-completion
2. **Executing Workouts**: Users start, pause, and navigate through workout segments
3. **Reviewing Results**: Users analyze workout performance via metric displays
4. **Sharing Workouts**: Users export or share workout programs

## UI Components Architecture

The application consists of several key UI components that work together:

### 1. Editor Container

The main workspace combining all UI elements:

- **ButtonRibbon**: Primary action controls for workouts
- **TimerDisplay**: Shows countdown/elapsed time
- **WodWiki**: The syntax-highlighted editor
- **ResultsDisplay**: Performance metrics view

### 2. Editor Component

A Monaco-based specialized editor with:

- Custom syntax highlighting for workout elements
- Intelligent auto-completion for workout patterns
- Inlay hints with visual cues
- Real-time validation and parsing

Key design attributes:
- Font should support both editing and clear display of special characters
- Color scheme should differentiate workout elements (durations, reps, weights, etc.)
- Adequate spacing for inlay hints

### 3. Timer Component

Multi-layered timer display showing:

- Primary countdown/up timer
- Total workout duration
- Round/lap counters
- Current exercise indicator

Key design attributes:
- High contrast for readability during exercise
- Large numerals for primary timer
- Clear visual differentiation between timer states (running, paused, completed)

### 4. Results Component

Performance analytics display with:

- Tabular data for completed exercises
- Metrics visualization (bar charts, line graphs)
- Exercise completion indicators
- Time-based performance metrics

Key design attributes:
- Clean data visualization
- Scannable metrics tables
- Clear highlighting of PRs or important metrics

## Visual Design Language

### Color System

#### Primary Palette

Define a primary color palette that:
- Provides sufficient contrast for timer displays
- Supports accessibility needs
- Differentiates between workout element types:
  - Time durations (e.g., `:20`, `1:30`)
  - Repetition counts (e.g., `21`, `95`)
  - Distance measurements (e.g., `25m`, `5km`)
  - Weight measurements (e.g., `95lb`, `50kg`)
  - Exercise names

#### State Colors

Define colors for:
- Active/running state
- Paused state
- Completed state
- Warning (approaching time limit)
- Error (invalid input)

### Typography

#### Editor Typography

- Monospaced font for code-like editing experience
- Clear differentiation between numbers and letters
- Support for special characters used in workout notation
- Variable width for inlay hints vs. actual content

#### Display Typography

- High-legibility font for timer displays
- Scalable size hierarchy for primary vs. secondary information
- Consideration for viewing at a distance during exercise

### Iconography

Develop a consistent icon set for:

- Exercise types (💪 for strength, 🏃‍♂️ for cardio, etc.)
- Metrics (⏱️ for time, 📏 for distance, etc.)
- Controls (play, pause, stop, reset)
- Navigation (next, previous, jump to)
- Export/Share functions

Icons should be:
- Simple and recognizable at small sizes
- Consistent in style and weight
- Available in both filled and outlined versions for different states

## UI Components Specification

### 1. Button Ribbon

The primary control interface for workout execution:

- **Start Button**: Primary action button, prominent positioning
- **Pause/Resume Button**: Toggle state with clear visual differentiation
- **Reset Button**: Less prominent but accessible
- **End Button**: Distinct from other controls to prevent accidental clicks
- **Navigation Controls**: For moving between workout segments

Design considerations:
- Touch-friendly sizing for use during exercise
- Clear visual hierarchy based on frequency of use
- Consistent positioning across workout states

### 2. Editor Area

The workspace for creating workout routines:

- **Line Numbers**: For reference and navigation
- **Syntax Highlighting**: Color-coded elements by type
- **Inlay Hints**: Visual cues for workout elements
- **Auto-completion Dropdown**: Suggestions interface
- **Error Indicators**: Highlighting invalid inputs

Design considerations:
- Clean, distraction-free editing environment
- Clear visual differentiation of workout elements
- Sufficient space for inlay hints without crowding content
- Responsive layout that adapts to different screen sizes

### 3. Timer Display

Multi-purpose chronograph for workout timing:

- **Primary Timer**: Large, central display showing current segment time
- **Total Timer**: Secondary display showing overall workout duration
- **Round Counter**: Indicates current round in multi-round workouts
- **Exercise Indicator**: Shows current exercise name/description

Design considerations:
- Maximum visibility during exercise (large numerals)
- Clear state indicators (running, paused, completed)
- Appropriate use of color to indicate time states (e.g., last 5 seconds)
- Consideration for different viewing distances

### 4. Results Display

Performance analytics visualization:

- **Metrics Table**: Structured display of workout metrics
- **Summary Statistics**: Aggregated performance data
- **Visual Graphs**: Time-based or comparative visualizations
- **Export Controls**: Options for saving/sharing results

Design considerations:
- Clear data hierarchy for scannability
- Appropriate use of data visualization principles
- Responsive layouts for different screen sizes
- Print-friendly design for exported results

## Interaction Patterns

### Editing Interactions

- **Real-time Validation**: Immediate feedback on syntax correctness
- **Auto-completion**: Context-aware suggestions while typing
- **Syntax Highlighting**: Color updates as user types
- **Error Correction**: Suggestions for fixing invalid syntax

### Timer Interactions

- **Start/Pause**: Primary interaction for controlling workout flow
- **Manual Navigation**: Moving between workout segments
- **Time Adjustment**: Modifying time values during workout
- **Auto-progression**: Automatic movement to next segment on completion

### Results Interactions

- **Metric Filtering**: Focusing on specific performance aspects
- **View Switching**: Toggling between different visualization types
- **Data Export**: Saving results in various formats
- **Comparison View**: Showing progress over time/sessions

## Responsive Design Considerations

The application should adapt to different contexts:

### Desktop View

- Full-featured editor with maximum screen real estate
- Side-by-side view of editor and timer/results
- Detailed metrics and visualizations

### Tablet View

- Focused editing experience with collapsible panels
- Touch-optimized controls
- Simplified but complete metrics display

### Mobile View

- Prioritized timer display for workout execution
- Simplified editor for quick modifications
- Essential metrics with drill-down capability

### Gym Display Mode

- Maximum visibility timer display
- Minimal UI elements
- Large text and high contrast

## Accessibility Considerations

The application should be accessible to users with different needs:

- **Color Contrast**: Meeting WCAG 2.1 AA standards
- **Screen Reader Support**: Proper labeling of all controls
- **Keyboard Navigation**: Complete functionality without mouse
- **Text Scaling**: Proper handling of increased text sizes
- **Reduced Motion**: Option for users with motion sensitivity

## Brand Identity Integration

The visual design should reflect the wod.wiki brand identity:

- **Logo Integration**: Consistent placement and sizing
- **Brand Colors**: Applied appropriately throughout the interface
- **Typography**: Aligned with overall brand guidelines
- **Voice & Tone**: Consistent terminology and messaging

## Implementation Guidance

For the development team:

- Use a component-based architecture for UI elements
- Ensure all components are themed consistently
- Implement responsive breakpoints for different device sizes
- Maintain accessibility throughout implementation
- Document component behaviors and states comprehensively

## Next Steps

1. Create wireframes for key screens and states
2. Develop a detailed component library
3. Design high-fidelity mockups for primary user flows
4. Create interactive prototypes for user testing
5. Finalize the design system documentation

This design guide serves as the foundation for creating a cohesive, effective, and engaging user experience for the wod.wiki application.
