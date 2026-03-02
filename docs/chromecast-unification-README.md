# Chromecast UI Unification Documentation

This directory contains comprehensive documentation for unifying the Track Panel and Chromecast Receiver UI architecture.

## Quick Links

- **Start Here**: [Executive Summary](./unified-ui-architecture-summary.md) — High-level overview with key benefits and timeline
- **Full Details**: [Detailed Proposal](./unified-ui-architecture-proposal.md) — Complete architecture documentation with C4 diagrams
- **Current State**: [Receiver vs Track Panel Comparison](./receiver-vs-trackpanel.md) — Analysis of existing duplication

## Goal

Enable **identical React components** to be used for both the Track Panel (Workbench) and Chromecast Receiver displays, eliminating code duplication and enabling:

- Shared `StackBlockItem` component
- Shared `TimerDisplay` logic
- Shared fragment rendering
- Type-safe serialization
- Zero functional regression

## Solution Overview

Introduce `IWorkoutDisplayModel` — a unified view model interface that abstracts runtime/transport differences:

```
┌──────────────────┐         ┌──────────────────┐
│   Track Panel    │         │   Chromecast     │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         └────────┬──────────┬────────┘
                  │          │
                  ▼          ▼
         ┌─────────────────────────┐
         │ IWorkoutDisplayModel    │
         │ (unified interface)     │
         └─────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌────────────────┐  ┌──────────────────┐
│ Local Provider │  │ Remote Provider  │
│ (runtime mem)  │  │ (WebSocket JSON) │
└────────────────┘  └──────────────────┘
```

## Migration Phases

| Phase | Scope | Risk | Duration |
|-------|-------|------|----------|
| 1 | Add interfaces | Low | 0.5 days |
| 2 | Migrate VisualStatePanel | Low | 1 day |
| 3 | Migrate TimerDisplay | Low | 0.5 days |
| 4 | Update DisplaySyncBridge | Low | 0.5 days |
| 5 | Add RemoteProvider | Low | 0.5 days |
| 6 | Migrate Chromecast | Medium | 2 days |
| 7 | Cleanup | Low | 1 day |

**Total:** 6 days with full test coverage

## Key Files

### Documentation
- `unified-ui-architecture-summary.md` — Executive summary (start here)
- `unified-ui-architecture-proposal.md` — Full proposal with C4 diagrams
- `receiver-vs-trackpanel.md` — Current state analysis

### Current Implementation
- `src/components/track/VisualStatePanel.tsx` — Track Panel UI
- `src/components/track/VisualStateComponents.tsx` — `StackBlockItem` (to be unified)
- `src/receiver-main.tsx` — Chromecast UI with `RemoteStackBlockItem` (to be deleted)
- `src/components/layout/DisplaySyncBridge.tsx` — Serialization bridge

### Proposed Implementation
- `src/runtime/display/IWorkoutDisplayModel.ts` — New interfaces (Phase 1)
- `src/runtime/display/LocalWorkoutDisplayModel.tsx` — Track Panel provider (Phase 2)
- `src/runtime/display/RemoteWorkoutDisplayModel.tsx` — Chromecast provider (Phase 5)

## Benefits

✅ **Code Reuse**: Single `StackBlockItem` for both environments
✅ **Type Safety**: `IBlockDisplayModel` replaces `any[][]`
✅ **Maintainability**: Bug fixes apply to both displays automatically
✅ **Extensibility**: Dynamic controls, multi-display sync become trivial
✅ **Zero Regression**: All current Track Panel features preserved

## Success Criteria

- [ ] Track Panel visual parity maintained
- [ ] Chromecast visual parity maintained
- [ ] Zero test regressions
- [ ] `RemoteStackBlockItem` deleted
- [ ] `RemoteVisualStatePanel` deleted
- [ ] Storybook stories pass validation checklist
- [ ] Chromecast E2E test passes

## Next Steps

1. **Review** the [Executive Summary](./unified-ui-architecture-summary.md)
2. **Deep Dive** into the [Full Proposal](./unified-ui-architecture-proposal.md)
3. **Approve** the migration plan
4. **Implement** Phase 1 (add interfaces)

---

**Questions?** Open an issue or contact the WOD Wiki team.
