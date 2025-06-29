# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

## Current Status

WOD Wiki has a mature foundation for parsing workout scripts and a set of core execution features (as of v0.5.0). Key implemented aspects include:

*   **Workout Script Parsing:** A comprehensive syntax (see `wod-wiki/Syntax.md`) allows defining diverse workout structures. The parser translates these scripts into an internal representation.
*   **Workout Execution Core (v0.5.0):**
    *   **Results Tracking:** Robust tracking of metrics (effort, reps, resistance, distance) with inline editing, filtering, and exercise summary cards.
    *   **Audio Cues & ChromeCast Integration:** Sound effects for workout events and ability to cast workouts.
    *   **UI/UX:** Refined results display, responsive layouts, and editor syntax highlighting.
*   **JIT (Just-In-Time) Compiler Architecture:**
    *   The architectural design is established, including phases for Fragment Compilation, Metric Inheritance, Block Creation, and Stack Execution.
    *   A Storybook demonstration (`stories/runtime/JitCompiler.stories.tsx`) showcases this using mock components.
*   **Metric Inheritance System:**
    *   The core system for metric inheritance (allowing parent blocks to influence child metrics) is implemented and tested.
    *   Includes `IMetricInheritance` interface, `MetricComposer`, `RuntimeMetric` types, and example patterns.
    *   Integrated into the JIT Compiler design as a distinct phase.

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

This will start the Storybook development server, typically on `http://localhost:6006`.

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
