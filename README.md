# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

## 📚 Documentation

We have comprehensive documentation available in the `docs/` directory:

### Guides
- **[Architecture](./docs/Architecture.md)**: High-level overview of the system components and data flow.
- **[UI Overview](./docs/UI_Overview.md)**: Guide to the editor and runtime visualization interface.
- **[WOD Syntax](./docs/Wod_Wiki_Syntax.md)**: detailed explanation of the workout definition language.
- **[Metrics Collection](./docs/Metrics_Collection.md)**: How performance data is tracked and stored.

### Features
- **[Exercise Typeahead](./docs/Exercise_Typeahead.md)**: Details on the intelligent exercise suggestion system.
- **[Runtime Test Bench](./docs/Runtime_Test_Bench.md)**: How to use the interactive debugging tool.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SergeiGolos/wod-wiki.git
    cd wod-wiki
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup environment:**
    ```bash
    npm run setup
    ```
    *Note: This step installs Playwright browsers. Errors during download are expected/handled.*

### Running Locally

To start the development environment with Storybook:

```bash
npm run storybook
```

This will launch the interface at `http://localhost:6006`.

## 🛠️ Contributing

### Project Structure

- `src/parser/`: Chevrotain-based parser logic.
- `src/runtime/`: JIT compiler and execution engine.
- `src/editor/`: Monaco Editor integration.
- `wod/`: Example workout files.
- `stories/`: Storybook stories for component development.

### Testing

- **Unit Tests**: `npm run test`
- **End-to-End Tests**: `npm run test:e2e`
- **Storybook Tests**: `npm run test:storybook`

### Build

To build the library and Storybook:

```bash
npm run build
```

## 📊 Current Status

As of v0.5.0, the project includes:

- **Parser**: Fully functional grammar for complex workouts.
- **Editor**: Monaco integration with syntax highlighting and exercise suggestions.
- **Runtime**: JIT compiler architecture with basic block execution.
- **Metrics**: Foundation for tracking reps, time, and load.

## License

This project is licensed under the MIT License.
