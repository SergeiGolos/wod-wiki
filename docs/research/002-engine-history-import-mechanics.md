# Research: Engine History Import Mechanics

**Ticket:** [#981](https://github.com/SergeiGolos/wod-wiki/issues/981)  
**Date:** 2026-08-26  
**Status:** Decided  

---

## 1. Executive Summary & Key Findings

1. **Native Directory Parity:**  
   Inspection of `wod-wiki-engine` reveals that from its initial commit (`971c081`), all engine code was already created in `packages/*` (`packages/core`, `packages/lang`, `packages/wql`, `packages/engine`, `packages/ui`) and `apps/storybook`. No path reshaping or `git filter-repo` transformation is necessary.
2. **Chosen Approach:**  
   **Direct Git Merge with `--allow-unrelated-histories`**:
   - Cleanly imports all 5 engine packages and Storybook directly into their target paths.
   - Preserves 100% of line-by-line `git blame`, author attribution, commit messages, and dates without move boundaries.
   - Imports all `v0.*` engine release tags (up through `v0.10.42` / `v0.11.x`) via `git fetch --tags`, seamlessly seeding the Unified Version Line for `git for-each-ref`.
3. **Conflict Footprint:**  
   Zero file conflicts under `packages/`, `apps/storybook/`, `bench/`, and `e2e/`. The only conflicts are the 8 root configuration files (`package.json`, `tsconfig.json`, `bun.lock`, `bunfig.toml`, `CONTEXT.md`, `README.md`, `.eslintrc.json`, `.gitignore`), which are unified as part of the workspace migration PR.

---

## 2. Evaluation of Evaluated Approaches

| Approach | Blame / Log Quality | Tag Integrity | Complexity | Verdict |
| --- | --- | --- | --- | --- |
| **A. Direct Merge (`--allow-unrelated-histories`)** | **Flawless**: 1:1 line attribution and commit history directly preserved | **Complete**: All `v*` tags fetched into local ref space | **Minimal**: 4-line standard git operation | **CHOSEN** |
| **B. `git filter-repo` per-package splits** | **Fragmented**: Splits multi-package atomic commits into synthetic single-package commits | **Complex**: Requires tag re-mapping across multiple synthetic roots | **High**: High risk of synthetic commit divergence | **Rejected** (unnecessary) |
| **C. Staging Prefix (`git subtree add`) then `git mv`** | **Degraded**: Blame requires `-M`/`--follow` flags across the move boundary | **Partial**: Tags point to intermediate prefix commits | **Moderate**: Extra intermediate commit required | **Rejected** (inferior blame) |

---

## 3. Verified Cutover Recipe

The following procedure was verified against clones of both repositories:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Add engine remote and fetch with tags
git remote add engine https://github.com/SergeiGolos/wod-wiki-engine.git || git remote set-url engine https://github.com/SergeiGolos/wod-wiki-engine.git
git fetch engine --tags

# 2. Pin to target engine commit or main branch
ENGINE_REF="engine/main"

# 3. Create migration branch and merge engine history
git checkout -b chore/monorepo-reunification
git merge --allow-unrelated-histories "$ENGINE_REF" \
  -m "Merge wod-wiki-engine into wod-wiki (monorepo reunification)"

# 4. Resolve root conflicts with unified workspace manifests
# (package.json, tsconfig.json, bun.lock, CONTEXT.md, etc.)

# 5. Move playground into apps/playground and rewire @/ alias
mkdir -p apps/playground
git mv playground/* apps/playground/ 2>/dev/null || true
git mv src apps/playground/src
```

---

## 4. Tag Carryover & Version Seeding

1. `git fetch engine --tags` fetches all engine tags (e.g. `v0.10.42`, `v0.11.0`) into `refs/tags/`.
2. When the unified pipeline computes the next version via:
   ```bash
   LATEST_TAG=$(git for-each-ref refs/tags \
     --sort=-v:refname \
     --format '%(refname:short)' \
     | grep -E '^v?[0-9]+\.[0-9]+(\.[0-9]+)?$' \
     | head -1)
   ```
   The highest tag (`v0.11.x` / `v0.10.42`) naturally supersedes `wod-wiki`'s older `v0.6.x` tags without any manual database edits or tag re-seeding hacks.
