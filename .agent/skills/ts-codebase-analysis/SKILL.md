---
name: ts-codebase-analysis
description: TypeScript codebase dependency and cycle analysis using madge. Use when auditing circular dependencies, layer violations, or import architecture in a TypeScript project.
allowed-tools: Read, Glob, Grep, Bash
---

# TypeScript Codebase Analysis Skill

> Dependency cycle and layer-violation analysis for TypeScript projects using madge.

## Overview

This skill covers running `madge` to analyse TypeScript import graphs, identify circular dependencies, and audit layer violations. It documents known pitfalls — including the **`__tests__` false-positive** described below.

---

## Quick-Start Commands

This project exposes a convenience script (see `package.json`):

```bash
# Production-only circular dependency report (RECOMMENDED)
bun run analyze:deps
```

For additional analysis options (`madge` is already installed as a devDependency in this repository):

```bash
# 1. Full report including test files (may inflate layer-violation counts — see pitfall below)
bun x madge --extensions ts,tsx --ts-config tsconfig.json --circular src/

# 2. Output as JSON for programmatic analysis
bun x madge --extensions ts,tsx --ts-config tsconfig.json --exclude __tests__ --json src/ > deps.json

# 3. Generate a visual dependency graph (requires graphviz)
bun x madge --extensions ts,tsx --ts-config tsconfig.json --exclude __tests__ --image graph.svg src/
```

---

## ⚠️ Known Pitfall: `__tests__/` False Positives

### Symptom

Madge reports layer violations such as `runtime → testing` even though **no production runtime code** imports from the testing layer.

### Root Cause

Madge scans **all** `.ts` / `.tsx` files it finds, including co-located `__tests__/` files. When a test file in `src/runtime/__tests__/` imports from `src/testing/harness/`, madge records this as a `runtime → testing` edge — the same as if a production file had done it.

Madge does not distinguish `__tests__/` files from production source files. This inflates layer-violation counts.

### Evidence (wod-wiki, 2026-04-29)

All 27 `runtime → testing` edges that appeared in the v3 baseline were exclusively from test files:

| Source Pattern | Count |
|---|---|
| `runtime/behaviors/__tests__/*.test.ts → testing/harness/index.ts` | 13 |
| `runtime/blocks/__tests__/*.test.ts → testing/harness/*.ts` | 6 |
| `runtime/compiler/strategies/__tests__/*.test.ts → testing/harness/index.ts` | 3 |
| `runtime/__tests__/RuntimeDebugMode.test.ts → testing/testable/TestableBlock.ts` | 1 |
| `runtime/behaviors/__tests__/integration/*.test.ts → testing/harness/*.ts` | 3 |
| **Total** | **27** |

After re-running with `--exclude '__tests__'`, **zero** `runtime → testing` edges remained.

### Fix

Always use `--exclude '__tests__'` for **production-only** cycle analysis:

```bash
bun x madge --extensions ts,tsx --ts-config tsconfig.json --exclude '__tests__' --circular src/
```

---

## Baseline (wod-wiki, 2026-04-29)

| Run | Files scanned | Circular deps | runtime→testing edges |
|---|---|---|---|
| Without `--exclude` | 709 | 29 | 27 (all in `__tests__/`) |
| With `--exclude '__tests__'` | 617 | 29 | 0 |

> The 29 production-code circular dependencies are internal runtime/contracts cycles
> unrelated to the `runtime → testing` layer-violation issue.

---

## Interpreting Results

### Circular Dependencies

A circular dependency means module A imports B which (directly or transitively) imports A. This can cause:

- Initialization order issues at runtime
- Difficult-to-tree-shake bundles
- Tight coupling that resists refactoring

**Not all cycles are harmful.** Internal cycles within a single domain (e.g., `runtime/contracts ↔ runtime/impl`) may be acceptable. Focus on **cross-layer** cycles first.

### Layer Violations

A layer violation is a one-way directional dependency from a higher-level layer to a lower-level one that should not be coupled. Example: production `runtime/` code importing from `testing/`.

Use madge's directed-graph output (JSON) to audit this. The example below
checks for `runtime → testing` violations — adapt the layer names to your
project's structure:

```bash
bun x madge --extensions ts,tsx --ts-config tsconfig.json --exclude '__tests__' --json src/ \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
# Adapt 'runtime/' and 'testing/' to your layer names
violations = {k: v for k, v in data.items()
              if k.startswith('runtime/') and any('testing/' in d for d in v)}
print(json.dumps(violations, indent=2))
"
```

---

## Recommended Analysis Workflow

1. **Run production baseline** (exclude test files):
   ```bash
   bun run analyze:deps
   ```
2. **Compare to previous baseline** — note increases/decreases.
3. **Identify cross-layer cycles** using the JSON output.
4. **Ignore or document** expected internal domain cycles.
5. **Track progress** in an architecture debt report.

---

## Related

- Issue [#525](https://github.com/SergeiGolos/wod-wiki/issues/525) — `runtime → testing` false positive resolved
- Architecture Debt Report v3 — external notes reference (not tracked in this repo): `Journal/2026-04-29/architecture-debt-report-2026-04-29-v3`
