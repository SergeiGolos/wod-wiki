# Agent Prompt: Monorepo Reunification Execution

**Task:** Execute the monorepo reunification of `wod-wiki-engine` into `wod-wiki` as a single migration Pull Request.  
**Specification Authority:** [`docs/monorepo-migration-spec.md`](../monorepo-migration-spec.md)  
**Effort Map:** [Issue #979](https://github.com/SergeiGolos/wod-wiki/issues/979)  

---

## 1. Objective

Bring the 5 `@bitcobblers/wod-wiki-*` packages and Storybook from `https://github.com/SergeiGolos/wod-wiki-engine.git` into this repository (`wod-wiki`) as a unified Bun workspace monorepo.

Key outcomes to achieve:
1. **Directory Layout:** `packages/{core,lang,wql,engine,ui}` and `apps/{playground,storybook}`.
2. **Git History:** Merge engine history with 100% blame and tag preservation (`git merge --allow-unrelated-histories`).
3. **Workspace Manifests:** Root `package.json` with `workspaces: ["packages/*", "apps/*"]` and unified `bun` command surface.
4. **Instant HMR:** Vite source aliases in `apps/playground/vite.config.ts` mapping `@bitcobblers/wod-wiki-*` to `packages/*/src`.
5. **Parallel CI/CD Pipelines:** 6-phase parallel DAG in `.github/workflows/pull-request.yml` and `.github/workflows/main.yml`.
6. **Cleanup:** Delete obsolete `scripts/use-engine.ts`, `scripts/fix-codemirror-deps.cjs`, and `scripts/dev-start.cjs`.

---

## 2. Reference Documents

Before making any changes, review the detailed specs:
- **Master Specification & Runbook:** [`docs/monorepo-migration-spec.md`](../monorepo-migration-spec.md)
- **Engine History Import Mechanics:** [`docs/research/002-engine-history-import-mechanics.md`](../research/002-engine-history-import-mechanics.md)
- **Workspace Consolidation Spec:** [`docs/research/006-workspace-consolidation-spec.md`](../research/006-workspace-consolidation-spec.md)
- **Single-Package Dev Workflow:** [`docs/research/007-single-package-dev-workflow.md`](../research/007-single-package-dev-workflow.md)
- **Parallel Pipeline DAG:** [`docs/research/004-unified-parallel-pipeline-dag.md`](../research/004-unified-parallel-pipeline-dag.md)
- **Preview Hosting URLs:** [`docs/research/001-preview-hosting-and-storybook-urls.md`](../research/001-preview-hosting-and-storybook-urls.md)
- **Unified Version Line Cutover:** [`docs/research/003-unified-version-line-cutover.md`](../research/003-unified-version-line-cutover.md)
- **CI Secrets & NPM Continuity:** [`docs/research/005-ci-secrets-and-publishing-continuity.md`](../research/005-ci-secrets-and-publishing-continuity.md)

---

## 3. Step-by-Step Execution Plan

### Step 1: Branch Setup & Remote Fetch
```bash
git checkout main
git pull origin main
git checkout -b chore/monorepo-reunification

# Add engine remote and fetch all tags
git remote add engine https://github.com/SergeiGolos/wod-wiki-engine.git || git remote set-url engine https://github.com/SergeiGolos/wod-wiki-engine.git
git fetch engine --tags
```

### Step 2: Merge Engine History
```bash
git merge --allow-unrelated-histories engine/main \
  -m "Merge wod-wiki-engine into wod-wiki (monorepo reunification)"
```

### Step 3: Relocate Playground into `apps/playground/`
```bash
mkdir -p apps/playground
# Move playground configs, HTML shells, and assets
git mv playground/* apps/playground/ 2>/dev/null || true
# Move application source and unit tests
git mv src apps/playground/src
git mv tests apps/playground/tests
```

### Step 4: Remove Retired Artifacts
```bash
git rm -f scripts/use-engine.ts 2>/dev/null || true
git rm -f scripts/fix-codemirror-deps.cjs 2>/dev/null || true
git rm -f scripts/dev-start.cjs 2>/dev/null || true
```

### Step 5: Configure Manifests & Tooling
1. **Root `package.json`**:
   - Set `workspaces: ["packages/*", "apps/*"]`.
   - Update `scripts` section matching `docs/monorepo-migration-spec.md` §4 (`bun playground`, `bun storybook`, `bun package`, `bun test`, `bun test:package`, `bun test:storybook`, `bun test:playground`, `bun test:playground:unit`, etc.).
   - Deduplicate devDependencies and remove root `@storybook/*` devDeps.
2. **`apps/playground/package.json`**:
   - Set name `@bitcobblers/wod-wiki-playground`, `version: "0.11.0"`, `private: true`.
   - Set `@bitcobblers/wod-wiki-*` dependency versions to `^0.11.0`.
3. **`apps/playground/vite.config.ts`**:
   - Retarget `@/` alias to `path.resolve(__dirname, 'src')`.
   - Add `CODEMIRROR_SINGLETON_DEPS` and workspace source aliases.
4. **Copy `scripts/stamp-version.ts`** from engine repo if not present.
5. **Adopt `tsconfig.base.json` and `vitest.workspace.ts`** from engine repo.

### Step 6: Update CI Workflows
- Rewrite `.github/workflows/pull-request.yml` and `.github/workflows/main.yml` to implement the 6-phase parallel DAG specified in `docs/research/004-unified-parallel-pipeline-dag.md`.

### Step 7: Local Validation & Lockfile Update
Run the full verification suite locally:
```bash
bun install
bun run lint
bun run typecheck
bun run build
bun test
```

### Step 8: Commit & Submit PR
```bash
git add .
git commit -m "feat(monorepo): reunify wod-wiki and wod-wiki-engine into single workspace"
git push origin chore/monorepo-reunification
```
