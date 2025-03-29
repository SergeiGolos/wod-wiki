# Notebook Component

The Notebook component is a central part of wod.wiki that provides an interface for managing and displaying workout collections. It integrates with the [Editor](Editor.md) component and uses the specialized [wod.wiki syntax](../Core/Compile.md) that is executed by the [Runtime](../Core/Runtime.md) component.

## Core Features

The Notebook offers several key features that enhance the workout management experience:

### Workout Collection Management

- Displays a list of saved workouts in a navigation panel
- Allows creation of new workouts
- Provides selection and viewing of existing workouts

### Workout Editing

- Integrates with the EditorContainer for workout content editing
- Preserves workout metadata (creation and update timestamps)
- Supports saving changes to workouts

### Data Persistence

- Works with the [Data Store](Data%20Store.md) for workout storage and retrieval
- Maintains workout history and organization
- Supports future integration with cloud storage

## Architecture

The Notebook component is composed of several interconnected parts:

### Component Structure

```
Notebook
├── Navigation Panel (workout list)
└── Content Area
    └── EditorContainer (selected workout)
        ├── ButtonRibbon (controls)
        ├── TimerDisplay (workout visualization)
        ├── WodWiki (core editor)
        └── ResultsDisplay (metrics and analysis)
```

### Key Interfaces

1. **Workout**: Defines the structure of workout data
   - `id`: Unique identifier for the workout
   - `title`: Display name for the workout
   - `content`: Workout definition in wod.wiki syntax
   - `createdAt`: Creation timestamp
   - `updatedAt`: Last modification timestamp

2. **NotebookProps**: Configuration options for the Notebook component
   - `initialWorkouts`: Optional pre-loaded workout data

## Integration with Other Components

The Notebook maintains relationships with several other components:

1. **EditorContainer**: Displays and allows editing of the selected workout
2. **Data Store**: Provides persistence for workout data
3. **Runtime**: Executes the workout scripts when started

## User Interface

The Notebook UI is designed to be clean and intuitive:

- **Left Panel**: Navigation list showing workout titles and last update dates
- **Right Panel**: Selected workout display with full editor capabilities
- **New Workout Button**: Creates a new empty workout

## Technical Implementation

The Notebook is implemented using React and TypeScript with the following technical characteristics:

- React hooks for state management
- TypeScript interfaces for type safety
- Tailwind CSS for styling
- Component-based architecture for maintainability

## Future Enhancements

Planned enhancements for the Notebook component include:

- Workout categorization and tagging
- Search and filter capabilities
- Workout templates and sharing
- Integration with external fitness tracking systems

This Notebook component serves as the organizational hub of the wod.wiki platform, enabling efficient management and execution of structured workout definitions.
