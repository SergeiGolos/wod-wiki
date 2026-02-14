# GitHub Copilot Instructions

## Shared Agent Knowledge

This repository uses `AGENTS.md` at the project root as the **canonical source of truth** for all AI coding agents. Before performing any task, read and follow the guidelines in [AGENTS.md](../AGENTS.md).

`AGENTS.md` contains critical information about:
- Project overview and tech stack
- Build, test, and development commands
- Code style and naming conventions
- Project architecture and key subsystems
- Test harness usage and patterns
- Validation requirements after changes
- Known issues and constraints

**Always defer to `AGENTS.md` for project conventions.** The instructions below supplement it with Copilot-specific guidance.

## Agent Ecosystem

Multiple AI agents may operate in this repository. Each has its own instruction file, but all share `AGENTS.md` as common ground:

| File | Agent | Role |
|------|-------|------|
| `AGENTS.md` | All agents | Shared project knowledge and conventions |
| `CLAUDE.md` | Claude Code | Claude-specific workflow guidance |
| `gemini.md` | Google Gemini | Gemini-specific workflow guidance |
| `.github/copilot-instructions.md` | GitHub Copilot | This file — Copilot-specific guidance |

When making changes to shared conventions (commands, architecture, patterns), update `AGENTS.md` first so all agents stay synchronized.

## Copilot-Specific Guidelines

### Package Manager
Use **bun** exclusively. Never suggest `npm`, `yarn`, or `pnpm` commands. Refer to `AGENTS.md` for the exact command syntax.

### Quick Reference Commands
```bash
bun install                    # Install dependencies
bun run test                   # Run unit tests
bun run test:components        # Run integration tests
bun run test:all               # Run all tests
bun run storybook              # Start dev server
bun run build-storybook        # Build (NEVER cancel — may take up to 60 min)
bun x tsc --noEmit             # Type check
```

### Code Generation Patterns

**Imports**: Use `@/*` path alias for `src/` imports. Order: external libraries → internal modules → relative imports.

**Components**: Functional React components with hooks. Style with Tailwind CSS classes — no custom CSS. Always define TypeScript interfaces for props.

**Naming**:
- Components & files: `PascalCase` (e.g., `WorkoutTimer.tsx`)
- Functions & variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Utilities & non-component files: `camelCase`

**Testing**: Use the test harness from `tests/harness/` (`BehaviorTestHarness`, `MockBlock`, `RuntimeTestBuilder`) instead of inline mocks. Co-locate test files with source using `.test.ts` or `.spec.ts` suffix.

### Architecture Awareness

When generating code that touches these subsystems, understand their patterns:

- **Parser** (`src/parser/`): Chevrotain-based. Token definitions → parser rules → visitor transforms. Changes require updating all three layers.
- **Runtime** (`src/runtime/`): Stack-based execution with JIT compilation. Blocks use constructor-based init and require consumer-managed `dispose()`.
- **Fragments** (`src/fragments/`): Typed workout components. Each fragment type maps to a specific workout metric.
- **Editor** (`src/editor/`): Monaco Editor integration with custom language support.

### What NOT to Do
- Do not introduce `npm`/`yarn` commands or lock files
- Do not add custom CSS — use Tailwind utilities
- Do not skip `dispose()` calls on runtime blocks
- Do not use `type` when `interface` works for object shapes
- Do not fix pre-existing TypeScript errors (369 baseline) unrelated to your changes
- Do not cancel `build-storybook` — it may appear stuck but is working

### Validation Checklist
After generating or modifying code, the user should:
1. `bun run test` — no new test failures
2. `bun x tsc --noEmit` — no new type errors from your changes
3. `bun run storybook` — Storybook loads and affected stories render
