# Runtime Test Bench

The **Runtime Test Bench** is an interactive development and debugging tool for WOD Wiki workout scripts. It allows you to edit, parse, compile, and execute workout definitions with real-time runtime visualization.

## Features

- **Integrated Monaco Editor** with syntax highlighting and auto-parse (500ms debounce)
- **Real-time Compilation** with JIT compiler and three optimization strategies
- **Runtime Execution** at 10 steps/second with NextEvent-based advancement
- **Debugger Controls**: Pause, resume, single-step, stop, and reset
- **Live Visualization**: Runtime stack, memory allocations, and execution status
- **Keyboard Shortcuts** for efficient workflow
- **Performance Optimized**: <100ms parse, <500ms compile, >30fps UI, no memory leaks

## Quick Start

View in Storybook:
1.  Run `npm run storybook`
2.  Navigate to: **Runtime Test Bench → Default**

## Keyboard Shortcuts

| Shortcut | Action | State |
|----------|--------|-------|
| **Ctrl+Enter** | Execute / Resume | Idle / Paused |
| **Space** | Pause / Resume | Running / Paused |
| **F5** | Reset | Any |
| **F10** | Step | Idle / Paused |
| **F11** | Compile | Idle |
| **Escape** | Stop | Running / Paused |

## Example Workflow

1.  **Edit**: Enter workout text (e.g., `timer 21:00 ...`).
2.  **Parse**: Auto-parses in 500ms.
3.  **Compile**: Press **F11** or click Compile button.
4.  **Execute**: Press **Ctrl+Enter** or click Run button.
5.  **Debug**: Press **Space** to pause, **F10** to step.
6.  **Reset**: Press **F5** to clear.
