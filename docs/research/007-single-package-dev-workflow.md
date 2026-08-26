# Specification: Single-Package Dev Workflow & Developer Experience

**Ticket:** [#986](https://github.com/SergeiGolos/wod-wiki/issues/986)  
**Date:** 2026-08-26  
**Status:** Decided  

---

## 1. Executive Summary & Developer Experience (DX)

1. **Instant HMR across Monorepo (Source Aliasing):**  
   `apps/playground/vite.config.ts` and `apps/storybook/vite.config.ts` share a unified `workspaceAliases()` resolver that maps `@bitcobblers/wod-wiki-*` imports directly to their TypeScript source files (`packages/*/src`). When editing a parser, query service, or UI component in `packages/*`, changes hot-reload in the Playground and Storybook browser tabs in milliseconds—**zero build step, zero watch daemons required**.
2. **Seamless Package-Level Focus:**  
   Developers can focus on a single package using `bun run --filter '@bitcobblers/wod-wiki-<name>' <cmd>` from workspace root, or by navigating directly into any subfolder (`cd packages/wql && bun test`).
3. **Streamlined Root Commands:**  
   - `bun dev` (or `bun run dev`): Boots the primary development app (`apps/playground`) on `http://localhost:5173`.
   - `bun run dev:storybook` (or `bun storybook`): Boots the isolated component workbench on `http://localhost:6006`.
4. **Retirement of `dev-start.cjs`:**  
   The legacy `dev-start.cjs` (which spawned obsolete `server` and `tv` processes) is retired; `bun run dev` invokes Vite directly.

---

## 2. Command Surface & Developer Task Matrix

| Development Intent / Task | Command from Monorepo Root | Command from Package Subdirectory |
| --- | --- | --- |
| **Run Playground Web App** | `bun dev` or `bun run dev` | `cd apps/playground && bun dev` |
| **Run Storybook Workbench** | `bun run dev:storybook` (or `bun storybook`) | `cd apps/storybook && bun dev` |
| **Test Everything** | `bun test` | — |
| **Test Single Package** (`core`, `lang`, `wql`, `ui`, `engine`) | `bun run test:<pkg>` (e.g. `bun run test:wql`)<br>or `bun run --filter '@bitcobblers/wod-wiki-wql' test` | `cd packages/wql && bun test` (or `vitest run`) |
| **Test Single Package (Watch Mode)** | `bun run --filter '@bitcobblers/wod-wiki-wql' test:watch` | `cd packages/wql && vitest` |
| **Test Playground App** | `bun run test:playground` | `cd apps/playground && bun test` |
| **Test Storybook Stories** | `bun run test:storybook` | `cd apps/storybook && bun test` |
| **Typecheck Entire Monorepo** | `bun run typecheck` | `tsc --noEmit` |
| **Typecheck Single Package** | `bun run --filter '@bitcobblers/wod-wiki-wql' typecheck` | `cd packages/wql && tsc --noEmit` |
| **Lint Entire Monorepo** | `bun run lint` | — |
| **Build All (Packages + Apps)** | `bun run build` | — |
| **Build Packages Only** | `bun run build:packages` | `cd packages/core && bun run build` |
| **Run Live E2E Tests (Playground)** | `bun run test:e2e` | `cd apps/playground && bun test:e2e` |
| **Run Live E2E Tests (Storybook)** | `bun run test:e2e:storybook` | `cd apps/storybook && bun test:e2e` |

---

## 3. Live Source Resolution Architecture

In `apps/playground/vite.config.ts` and `apps/storybook/vite.config.ts`:

```typescript
// Shared workspace aliases helper
export function getWorkspaceAliases(rootDir: string) {
  return {
    '@': path.resolve(rootDir, 'apps/playground/src'),
    '@bitcobblers/wod-wiki-core': path.resolve(rootDir, 'packages/core/src'),
    '@bitcobblers/wod-wiki-lang/react': path.resolve(rootDir, 'packages/lang/src/react.ts'),
    '@bitcobblers/wod-wiki-lang': path.resolve(rootDir, 'packages/lang/src'),
    '@bitcobblers/wod-wiki-wql': path.resolve(rootDir, 'packages/wql/src'),
    '@bitcobblers/wod-wiki-engine': path.resolve(rootDir, 'packages/engine/src'),
    '@bitcobblers/wod-wiki-ui/styles.css': path.resolve(rootDir, 'packages/ui/src/styles.css'),
    '@bitcobblers/wod-wiki-ui/extensions': path.resolve(rootDir, 'packages/ui/src/extensions/index.ts'),
    '@bitcobblers/wod-wiki-ui': path.resolve(rootDir, 'packages/ui/src'),
  };
}
```

### Benefits:
- **Instant HMR:** Changes in `packages/` immediately update both Playground and Storybook without compiling `tsup`.
- **IDE Navigation:** F12 / Cmd+Click jumps directly to the original TypeScript source definitions rather than `.d.ts` bundles in `dist/`.
- **Zero Drift:** Eliminates bugs caused by forgetting to rebuild dependent packages during local feature development.

---

## 4. Documentation & Onboarding Section (README Outline)

```markdown
### Development Quickstart

1. **Install Dependencies:**
   ```bash
   bun install
   ```

2. **Start Development Server:**
   - Web Application (Playground): `bun dev` (starts on `http://localhost:5173`)
   - Component Workbench (Storybook): `bun run dev:storybook` (starts on `http://localhost:6006`)

3. **Running Tests:**
   - Run all workspace tests: `bun test`
   - Test a single package: `bun run test:wql` or `cd packages/wql && bun test`
   - Test the web app: `bun run test:playground`
```
