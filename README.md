# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

## Current Status

WOD Wiki has a mature foundation for parsing workout scripts and a set of core execution features (as of v0.5.0). Key implemented aspects include:

*   **Workout Script Parsing:** A comprehensive syntax (see [wod-wiki/Syntax.md](wod-wiki/Syntax.md)) allows defining diverse workout structures. The parser translates these scripts into an internal representation.
*   **Workout Execution Core (v0.5.0):**
    *   **Results Tracking:** Robust tracking of metrics (effort, reps, resistance, distance) with inline editing, filtering, and exercise summary cards.
    *   **Audio Cues & ChromeCast Integration:** Sound effects for workout events and ability to cast workouts.
    *   **UI/UX:** Refined results display, responsive layouts, and editor syntax highlighting.
*   **Exercise Typeahead Integration (NEW):**
    *   **Intelligent Suggestions:** Real-time exercise name completion for 873+ exercises as you type in the Monaco Editor.
    *   **Rich Metadata:** Equipment 🏋️, muscles 💪, and difficulty ⭐ icons displayed inline with suggestions.
    *   **Hover Documentation:** Rich hover cards showing exercise details including muscles, equipment, difficulty, and instructions.
    *   **High Performance:** Debounced search (150ms), LRU caching (100 exercises), and localStorage index caching for fast response (< 10ms search, < 1ms cached load).
    *   **Error Resilience:** Retry logic with exponential backoff, 500ms timeout, and graceful fallbacks.
    *   **12 Storybook Stories:** Interactive demonstrations of all features including equipment filtering, muscle targeting, and difficulty levels.
    *   See [Exercise Typeahead Implementation Guide](./docs/exercise-typeahead-implementation-guide.md) for full details.
*   **JIT (Just-In-Time) Compiler Architecture:**
    *   The architectural design is established, including phases for Fragment Compilation, Metric Inheritance, Block Creation, and Stack Execution.
    *   An enhanced Storybook demonstration ([stories/compiler/JitCompiler.stories.tsx](stories/compiler/JitCompiler.stories.tsx)) showcases real-time visualization of compilation, runtime stack, and memory allocation.
    *   Shared fragment visualization components ([src/components/fragments/](src/components/fragments/)) provide reusable UI for parsing and displaying workout script fragments.
*   **Metric Inheritance System:**
    *   The core system for metric inheritance (allowing parent blocks to influence child metrics) is implemented and tested.
    *   Includes `IMetricInheritance` interface, `MetricComposer`, `RuntimeMetric` types, and example patterns.
    *   Integrated into the JIT Compiler design as a distinct phase.

## Runtime Test Bench

The **Runtime Test Bench** is an interactive development and debugging tool for WOD Wiki workout scripts. It provides a complete workflow for editing, parsing, compiling, and executing workout definitions with real-time runtime visualization.

### Features

- **Integrated Monaco Editor** with syntax highlighting and auto-parse (500ms debounce)
- **Real-time Compilation** with JIT compiler and three optimization strategies
- **Runtime Execution** at 10 steps/second with NextEvent-based advancement
- **Debugger Controls**: Pause, resume, single-step, stop, and reset
- **Live Visualization**: Runtime stack, memory allocations, and execution status
- **Keyboard Shortcuts** for efficient workflow
- **Performance Optimized**: <100ms parse, <500ms compile, >30fps UI, no memory leaks

### Quick Start

View in Storybook:
```bash
npm run storybook
# Navigate to: Runtime Test Bench → Default
```

### Keyboard Shortcuts

| Shortcut | Action | State |
|----------|--------|-------|
| **Ctrl+Enter** | Execute / Resume | Idle / Paused |
| **Space** | Pause / Resume | Running / Paused |
| **F5** | Reset | Any |
| **F10** | Step | Idle / Paused |
| **F11** | Compile | Idle |
| **Escape** | Stop | Running / Paused |

### Example Workflow

```
1. Edit: Enter workout "timer 21:00\n  (21-15-9)\n    Thrusters 95lb\n    Pullups"
2. Parse: Auto-parses in 500ms
3. Compile: Press F11 or click Compile button
4. Execute: Press Ctrl+Enter or click Run button
5. Debug: Press Space to pause, F10 to step, Escape to stop
6. Reset: Press F5 to clear and start over
```

### Documentation

For complete usage guide, see [Runtime Test Bench Usage](./docs/runtime-test-bench-usage.md).

### Testing

Comprehensive test coverage with 20+ tests:
- **Integration Tests**: Full workflow, state transitions, error handling
- **Keyboard Tests**: All shortcuts validated in all states
- **Performance Tests**: Parse, compile, execution, UI responsiveness, memory leak detection

```bash
# Run integration tests
npx vitest run tests/integration/RuntimeTestBench.integration.test.tsx

# Run performance tests
npx vitest run tests/integration/RuntimeTestBench.performance.test.tsx
```

## In Progress / Next Steps

Current development focuses on fully implementing and integrating the JIT Compiler and its runtime environment:

*   **Full JIT Compiler Runtime Implementation:**
    *   **Concrete Runtime Components:** Replace placeholder/mock runtime parts (e.g., `IRuntimeBlock` implementations, `ITimerRuntime`) with functional versions.
    *   **Metric Inheritance Integration:** Update `IRuntimeBlockStrategy` implementations and `IRuntimeBlock.inherit()` methods to use the metric inheritance system. Integrate with `FragmentCompilationManager`.
*   **End-to-End JIT Compilation Pipeline:** Ensure all JIT phases (parsing to execution) are fully connected and operational with real components.
*   **Comprehensive Testing:** Thoroughly test the integrated JIT compiler and runtime.

## Future Enhancements

Post JIT-integration, planned enhancements include:

*   **Advanced Metric Inheritance:** Implement more sophisticated, context-aware inheritance patterns.
*   **Performance Optimization:** Analyze and optimize the JIT compiler and runtime.
*   **Expanded Language Features:** Refine workout syntax based on feedback.
*   **Enhanced Developer Tooling:** Improve debugging and diagnostic tools.

## Project Structure

```text
x:/wod-wiki
├── .git/                # Git repository metadata
├── .github/             # GitHub workflows and templates
├── .obsidian/           # Obsidian workspace data
├── .storybook/          # Storybook configuration files
├── .vscode/             # VSCode workspace settings
├── dist/                # Build output directory (library and styles)
├── docs/                # Project and component documentation
├── node_modules/        # Project dependencies (ignored by git)
├── public/              # Static assets for Storybook/Vite
├── src/
│   ├── cast/            # Casting utilities or logic
│   ├── clock/           # Timer/clock components and logic
│   ├── components/      # Shared React components
│   │   └── fragments/   # Fragment visualization components (FragmentVisualizer, fragmentColorMap)
│   ├── editor/          # Editor-specific components and logic
│   ├── fragments/       # Parsed statement fragment types
│   ├── core/            # Core logic (parser, runtime, services, utils) - Note: some elements like parser & runtime are further detailed
│   │   ├── jit/         # JIT Compiler specific logic
│   │   ├── parser/      # Workout script parsing logic
│   │   ├── runtime/     # Workout execution runtime logic
│   │   ├── services/
│   │   └── utils/
│   ├── stories/         # Storybook stories for components
│   ├── index.css        # Main CSS entry point (Tailwind directives)
│   └── index.ts         # Library entry point (exports components)
├── storybook-static/    # Static export of Storybook
├── .gitignore           # Specifies intentionally untracked files that Git should ignore
├── .windsurfrules       # Windsurf deployment/config rules
├── package.json         # Project metadata, dependencies, and scripts
├── package-lock.json    # Dependency lockfile
├── postcss.config.js    # PostCSS configuration (for Tailwind)
├── publish-alpha.ps1    # Script for publishing alpha builds
├── README.md            # This file
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration for the library source
├── tsconfig.node.json   # TypeScript configuration for config files (Vite, Storybook)
├── tsconfig.tsbuildinfo # TypeScript incremental build info (ignored by git)
└── vite.config.ts       # Vite configuration for building the library
```
*Note: The `src/` structure above is based on observed files. The previous, more detailed breakdown of a `src/components/` subdirectory has been removed as it was not verifiable with current tools.*

## Documentation

Detailed documentation for the components, architecture, and workout syntax can be found in the `docs` directory:

[Project Documentation](./docs/Welcome.md)

The documentation in the `docs` directory is automatically published to the project's [GitHub Wiki](../../wiki) whenever changes are pushed to the main branch.

For more in-depth design documents, working notes, and release details, please also refer to the `wod-wiki/` directory within this repository.

## Development

This project uses Storybook for component development and visualization.

### Install Dependencies

```bash
npm install
```

### **Run Storybook:**

```bash
npm run storybook
```

This will start both the Storybook development server on `http://localhost:6006` and the workout API server on `http://localhost:6007`.

#### API Server

The API server runs automatically with Storybook to serve workout and exercise data via HTTP requests instead of bundling it with the page. This significantly improves page load times by moving large datasets (108MB+ of exercise data, 5MB+ of workout data) out of JavaScript bundles.

**Features:**
- Serves workout data from JSON files via REST API
- Serves exercise typeahead data (873+ exercises) via REST API
- Runs concurrently with Storybook on port 6007
- CORS enabled for Storybook integration
- Hot-reload friendly
- Automatic data setup via symlink or copy

**Available endpoints:**

*Workouts:*
- `GET /api/health` - Server health check
- `GET /api/workouts/categories` - List all workout categories
- `GET /api/workouts/:category` - Get all workouts in a category
- `GET /api/workouts/:category/:name` - Get a specific workout

*Exercises:*
- `GET /api/exercises/index` - Get complete exercise index
- `GET /api/exercises/search?q=<query>` - Search exercises
- `GET /api/exercises/:exercisePath` - Get specific exercise data

**Running API server standalone:**
```bash
npm run api-server
```

For detailed API documentation, see [.storybook/api/README.md](.storybook/api/README.md).

## Building the Library

To build the library for publishing or use in other projects:

```shell
npm run build
```

This command will:

1. Compile TypeScript types (`tsc`).
2. Bundle the library code using Vite into the `dist` folder (creating ES and UMD formats).
3. Process and output the Tailwind CSS into `dist/style.css`.

## Building Storybook

To build a static version of the Storybook application (e.g., for deployment):

```bash
npm run build-storybook
```

This will output the static Storybook site to the `storybook-static` directory.

> **Note**: This project uses Storybook 9.0.4. The dark mode functionality is temporarily disabled pending community addon compatibility updates.

## Consuming the Package

### **Install the package:**

```bash
npm install @bitcobblers/wod-wiki
```

### **Install Peer Dependencies:**

Ensure your project has the required peer dependencies installed:

```bash
npm install react react-dom monaco-editor
```

### **Import the component and styles:**

```jsx
    import React from 'react';
    import { WodWikiEditor } from '@bitcobblers/wod-wiki'; // Example component import
    import '@bitcobblers/wod-wiki/dist/style.css'; // Import the necessary CSS

    function App() {
      return (
        <div>
          <h1>My App</h1>
          <WodWikiEditor 
            language="javascript" 
            initialValue="console.log('Hello from Monaco!');" 
          />
        </div>
      );
    }

    export default App;
    ```

    *Important:* Ensure your application's build process can handle CSS imports and that Tailwind CSS (if used directly in the consuming application) doesn't conflict. The provided `style.css` contains the necessary Tailwind styles for the components.

## Testing

### Unit Tests

Run unit tests using Vitest:

```shell
npm run test
```

### Storybook Tests

Run interaction tests in Storybook:

1. First, make sure Storybook is running:

```bash
npm run storybook
```

2. In a separate terminal, run the Storybook test runner:

```shell
npm run test-storybook
```

This will run all interaction tests defined in the stories using Playwright. The tests are defined in the `play` function of the stories, such as the timer test in `src/stories/TimerTest.stories.tsx`.
