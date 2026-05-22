# Testing Architecture Consolidation Plan

## Current State

Two branches with significant drift:
- `dev` (worktree: `~/projects/wod-wiki/wod-wiki/`) — main development
- `e2e/main` (worktree: `~/projects/wod-wiki/wod-wiki-e2e/`) — e2e tests + duplicated stories/tests

### Divergence Summary

| Area | `dev` only | `e2e/main` only | Diverged files |
|------|-----------|-----------------|----------------|
| stories/ | 16 files (HeroSlider, EffortCard, BuyMeACoffee, etc.) | 6 files (Navbar, WorkoutActionButton, SidebarLayout) | 23 files |
| tests/ | analytics/, paperclip/, playground/, whiteboard tests | wod-script tests | helpers, parser, compliance, naming conventions |
| src/ | Extensive (editor extensions, command-palette, workbench, cast) | command-palette strategies | Many components |
| e2e/ | 24 test files | 11 test files (some overlap, some unique) | — |

## Target Architecture

### `wod-wiki` project (single source of truth)

```
wod-wiki/
├── src/                          # All source code
│   └── **/*.test.ts              # Unit tests co-located with source (bun test)
├── tests/                        # Integration tests (bun test)
│   ├── harness/                  # Test harness utilities
│   ├── jit-compilation/
│   ├── runtime-compliance/
│   └── ...
├── stories/                      # Storybook stories
│   ├── catalog/                  # Component catalog
│   ├── acceptance/               # Storybook play tests (integration)
│   └── _shared/                  # Storybook fixtures & helpers
├── e2e/                          # Playwright E2E tests
│   ├── acceptance/               # Feature acceptance tests
│   └── live-app/                 # Playground URL tests
└── package.json
    ├── "test": "bun test ./src"  # Unit tests only
    ├── "test:components": "bun test tests/"  # Integration tests
    ├── "test:all": "..."         # Unit + integration
    ├── "test:storybook": "..."   # Storybook play tests
    └── "test:e2e": "playwright test e2e/"  # E2E tests
```

### `wod-wiki-e2e` project (to be decommissioned)

- **Current purpose**: E2E tests + duplicated stories/tests
- **Target**: Salvage unique e2e tests, then archive
- **Timeline**: After unique tests are migrated to `wod-wiki/e2e/`

## Test Responsibility Boundaries

| Test Type | Framework | Location | Scope | Command |
|-----------|-----------|----------|-------|---------|
| **Unit** | bun:test | `src/**/*.test.ts` | Functions, hooks, behaviors in isolation | `bun test ./src` |
| **Integration** | bun:test | `tests/**/*.test.ts` | Component integration, harness tests | `bun test tests/` |
| **Storybook** | Storybook play + Playwright | `stories/**/*.stories.tsx` | Component interaction in story context | `bun run test:storybook` |
| **E2E** | Playwright | `e2e/**/*.e2e.ts` | Full app flows on playground URL | `bun run test:e2e` |

## Immediate Actions Needed

### Phase 1: Merge e2e/main → dev (salvage unique content)
1. Identify e2e tests unique to `e2e/main` (not on dev)
2. Identify story/test files where `e2e/main` has newer versions
3. Merge or cherry-pick salvageable content to `dev`

### Phase 2: Clean up e2e/main
1. Remove all `stories/` (duplicates of dev)
2. Remove all `tests/` (duplicates of dev)
3. Remove all `src/` (dev is ahead)
4. Keep only `e2e/` tests that are playground-specific

### Phase 3: Consolidate E2E into wod-wiki
1. Move unique e2e tests from `e2e/main` to `dev`
2. Archive `e2e/main` branch

## Open Questions

1. **e2e/main branch history**: Does `e2e/main` have commits we need to preserve, or can we reset it?
2. **Storybook on e2e/main**: Is there a separate storybook config in e2e/main that runs these stories?
3. **Preview deploys**: Does `wod-wiki-e2e` get deployed separately, or is it purely for test execution?
