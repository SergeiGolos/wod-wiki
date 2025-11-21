# UI Overview

The WOD Wiki UI is primarily composed of the **Editor** and the **Runtime Visualization**.

## The Editor

The editor is the central place for defining workouts. It is powered by Monaco Editor and provides:

- **Syntax Highlighting**: Colors for keywords, timers, reps, weights, etc.
- **Auto-completion**: Suggestions for exercises and syntax elements.
- **Error Reporting**: Visual feedback on syntax errors.

### Key Features
- **Edit Mode**: Allows writing and modifying the workout script.
- **Track Mode**: (Conceptual) For following along with the workout.
- **Analyze Mode**: (Conceptual) For reviewing performance.

## Storybook Playground

The project includes a Storybook playground that allows developers and users to test the editor and runtime features in isolation.

### Components

- **WodWiki**: The main editor component.
- **Runtime Test Bench**: A tool for testing the compilation and execution flow.
- **Fragment Visualizers**: Components that display individual parts of the parsed workout (e.g., `TimerFragment`, `RepFragment`).

## Visual Reference

The interface is divided into panes:
1.  **Sidebar**: Navigation for different components and examples.
2.  **Editor Pane**: The main area for text input.
3.  **Index/Preview**: Shows the parsed structure or exercise index.
4.  **Controls**: Storybook controls for tweaking component props.

*(Insert screenshot here if hosting allows, or refer to the local storybook)*
