# UI Requirements for WOD Wiki Application

## 1. Executive Summary and Introduction

This document outlines the user interface (UI) requirements for the WOD Wiki application. The goal is to provide a clear and comprehensive guide for the design team to create high-fidelity mockups and prototypes. The requirements are derived from the existing Storybook components and documentation, which define the core features and user interactions of the application.

The WOD Wiki application is a tool for creating, executing, and tracking high-intensity workouts. It features a specialized workout editor with a custom syntax, a powerful exercise suggestion engine, and a runtime environment for executing workouts step-by-step.

## 2. Core UI Components

The application is built from a set of core components, each with a specific function.

### 2.1. Clock & Timer Components

Timers are a fundamental part of the application, used for tracking workout durations, rest periods, and intervals.

*   **Digital Clock Display**: A prominent, large-format digital display for timers. It supports both `count-up` (stopwatch) and `count-down` modes.
*   **Timer Controls**: Standard controls including `Start`, `Stop`, `Pause`, and `Reset`.
*   **Time Span Visualization**: A "memory card" feature that displays a detailed log of timer activity, including start/stop timestamps for each interval. This is crucial for reviewing workout history with pauses.
*   **Workout-Specific Clocks**: The clock component is adaptable for different workout styles:
    *   **AMRAP (As Many Rounds As Possible)**: A countdown timer showing the total time remaining.
    *   **EMOM (Every Minute On The Minute)**: A countdown timer for the total workout, with clear indicators for each one-minute interval.
    *   **Tabata**: Interval timer showing work and rest periods.
    *   **For Time**: A count-up timer to measure the total time to complete a workout.

### 2.2. Editor Components

The editor is the primary interface for creating and modifying workouts.

*   **WOD Wiki Editor**: A specialized code editor (based on Monaco) for writing workouts using a custom syntax. It includes syntax highlighting.
*   **Exercise Suggestion System**: An intelligent typeahead feature that provides real-time exercise suggestions as the user types.
    *   **Rich Metadata**: Suggestions are enriched with icons and text indicating equipment (🏋️), muscles worked (💪), and difficulty (⭐).
    *   **Hover Documentation**: Hovering over a suggested exercise reveals a detailed card with instructions, muscles worked, and equipment needed.
    *   **Smart Search**: The search is debounced for performance and requires a minimum of two characters to activate.

### 2.3. Journal Component

The journal is for storing and retrieving workouts.

*   **Workout Journal**: A date-based component that allows users to save, view, and edit workouts for any given day.
*   **Date Picker**: A calendar interface to select a date.
*   **Persistence**: Workouts are saved to the browser's `localStorage`, keyed by date.
*   **Controls**: "Save" and "New" buttons for managing the workout entry for the selected date.

### 2.4. Runtime Components

The runtime components are used during an active workout.

*   **JIT (Just-In-Time) Compiler/Runner**: This component takes a workout script and breaks it down into an executable, step-by-step sequence.
*   **Runtime State Display**: A view that shows the currently parsed workout script, the overall state, and the active block of work.
*   **Execution Controls**: "Next Block" and "Reset" buttons to manually advance through the workout and to start over.

## 3. Application Screens and User Flows

The core components are assembled into several key screens that define the user experience.

### 3.1. Workout Creation and Journal Screen

This is the primary screen for managing workouts. It combines the editor and journal functionalities.

*   **Layout**: A two-panel layout is recommended.
    *   **Left Panel**: A calendar or date-picker for selecting the workout date.
    *   **Right Panel**: The `WodWiki` editor, pre-filled with the workout for the selected date, or empty if no workout exists.
*   **Functionality**:
    *   Users can write or edit a workout in the editor. The exercise suggestion engine provides assistance.
    *   Users can save the workout for the selected date.
    *   Users can clear the editor to start a new workout.
    *   This screen should be the main hub for users to manage their workout log.

### 3.2. Workout Execution Screen

This screen is for performing a workout. It should be designed for clarity and ease of use during intense physical activity.

*   **Layout**: A two-panel, full-screen "performance" mode.
    *   **Left Panel (Primary Focus)**: The `EnhancedClockDesign` component. This should be large and easily readable from a distance. It will display:
        *   The main workout timer (countdown or count-up).
        *   The current round number.
        *   Key metrics for the current round/interval (e.g., "Reps: 21 of 21", "Rest Time: 40 sec").
        *   A "Next Up" label to prepare the user for the next movement (e.g., "Next: 21 Thrusters").
    *   **Right Panel (Secondary Information)**: The `Runtime` component, showing the full workout script for context and the detailed breakdown of the current block. The "Next Block" button would be located here.
*   **Interaction**: The primary interaction during a workout is advancing to the next block. The design should consider large, easily tappable buttons.

### 3.3. Workout Library Screen

This screen allows users to browse and use pre-defined workouts.

*   **Layout**: A categorized index of workouts. Categories include CrossFit, Swimming, StrongFirst, and Dan John.
*   **Functionality**:
    *   Users can browse the list of available workouts.
    *   Clicking on a workout should load its script into the **Workout Creation and Journal Screen**, allowing the user to view, edit, and save it to a specific date.

## 4. Design Considerations

*   **Typography**: Use clear, legible fonts, especially for the timer and metrics on the execution screen. A monospaced font for the editor is essential.
*   **Color**: Use color to convey information, such as timer status (running, paused, stopped) and workout progress. The existing theme uses Tailwind CSS, and the `tailwind.config.js` can be referenced for the color palette.
*   **Responsiveness**: The application should be usable on a variety of screen sizes, from desktop monitors to tablets. The execution screen, in particular, should be optimized for tablet use in a gym environment.

## 5. Conclusion and Next Steps

This document provides the foundational UI requirements for the WOD Wiki application. The next step is for the design team to use this information to create wireframes and high-fidelity mockups for each of the described screens. These designs should then be reviewed to ensure they meet the functional requirements and provide an intuitive and effective user experience.
