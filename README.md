# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

## 📚 Documentation

[![Powered by Bun](https://img.shields.io/badge/Powered%20by-Bun-000?logo=bun&logoColor=white)](https://bun.sh)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=for-the-badge&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/SergeiGolos/wod-wiki)

We have comprehensive documentation available in the `docs/` directory:

### Guides
- **[Architecture](./docs/Architecture.md)**: High-level overview of the system components and data flow.
- **[UI Overview](./docs/UI_Overview.md)**: Guide to the editor and runtime visualization interface.
- **[WOD Syntax](./docs/Wod_Wiki_Syntax.md)**: detailed explanation of the workout definition language.
- **[Metrics Collection](./docs/Metrics_Collection.md)**: How performance data is tracked and stored.

### Features
- **[Exercise Typeahead](./docs/Exercise_Typeahead.md)**: Details on the intelligent exercise suggestion system.
- **[Runtime Test Bench](./docs/Runtime_Test_Bench.md)**: How to use the interactive debugging tool.

### Code Quality
- **[Code Quality Summary](./docs/CODE_QUALITY_SUMMARY.md)**: Overview of code quality metrics and improvements
- **[Code Analysis](./docs/CODE_ANALYSIS.md)**: Detailed analysis of anti-patterns and code smells
- **[Refactoring Plan](./docs/REFACTORING_PLAN.md)**: Prioritized roadmap for code improvements

## 🚀 Quick Start

### Prerequisites
- Bun (v1.0+ recommended)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SergeiGolos/wod-wiki.git
    cd wod-wiki
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Setup environment:**
    ```bash
    bun run setup
    ```
    *Note: This step installs Playwright browsers. Errors during download are expected/handled.*

### Running Locally

To start the development environment with Storybook:

```bash
bun run storybook
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

- **Unit Tests**: `bun run test`
- **End-to-End Tests**: `bun run test:e2e`
- **Storybook Tests**: `bun run test:storybook`

### Build

To build the library and Storybook:

```bash
bun run build
```

## 📊 Current Status

As of v0.5.0, the project includes:

- **Parser**: Fully functional grammar for complex workouts.
- **Editor**: Monaco integration with syntax highlighting and exercise suggestions.
- **Runtime**: JIT compiler architecture with basic block execution.
- **Metrics**: Foundation for tracking reps, time, and load.

## License

This project is licensed under the MIT License.
