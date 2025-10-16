<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Build/Lint/Test Commands

- `npm test` - Run all tests using Vitest
- `npm run test:unit` - Run unit tests only
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:storybook` - Run Storybook component tests
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npx vitest run src/path/to/test.test.ts` - Run single test file
- `npx tsc --noEmit` - Type check without emitting files
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build static Storybook

# Code Style Guidelines

## TypeScript & Imports
- Use strict TypeScript with interfaces for all props and return types
- Import order: external libraries, internal modules, relative imports
- Use `@/*` path alias for src imports (configured in tsconfig.json)
- Prefer `interface` over `type` for object shapes

## Naming Conventions
- Components: PascalCase (e.g., `WorkoutTimer`)
- Functions/variables: camelCase (e.g., `parseWorkoutScript`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- Files: PascalCase for components, camelCase for utilities

## Error Handling
- Use TypeScript union types for error states
- Return `Result<T, Error>` pattern or throw descriptive errors
- Validate inputs at API boundaries

## React & Components
- Use functional components with hooks
- Follow existing Tailwind CSS patterns, avoid custom CSS
- Create Storybook stories for all public components
- Export components from `src/index.ts` if part of public API

## Testing
- Unit tests: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Integration tests: `tests/**/*.test.ts`
- Story files: `stories/**/*.stories.tsx`
- Test files should be co-located with source files when possible