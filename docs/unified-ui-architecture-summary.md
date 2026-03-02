# Unified UI Architecture — Executive Summary

**Related Document:** [Full Proposal](./unified-ui-architecture-proposal.md)

## Problem Statement

The Track Panel (Workbench) and Chromecast Receiver currently display the same workout state but use **different components** with **incompatible data sources**:

- **Track Panel**: `StackBlockItem` reads `IRuntimeBlock` with memory subscriptions
- **Chromecast**: `RemoteStackBlockItem` reads `RemoteDisplayRow` JSON snapshots
- **Result**: Duplicated logic, maintenance burden, type safety issues

## Solution

Introduce **IWorkoutDisplayModel** — a unified view model interface that abstracts the runtime/transport differences:

```
Track Panel:           LocalWorkoutDisplayModel  → IRuntimeBlock memory
Chromecast Receiver:   RemoteWorkoutDisplayModel → RemoteState JSON
Both:                  Same React components     → IWorkoutDisplayModel
```

## Key Benefits

1. **Zero Duplication**: `StackBlockItem` works in both environments
2. **Type Safety**: `IBlockDisplayModel` replaces `any[][]` serialization
3. **Zero Regression**: All Track Panel features preserved
4. **Future-Ready**: Dynamic controls, multi-display sync become trivial

## Architecture Diagrams

### Current State (Duplication)
```
Workbench                     Chromecast
  ↓                              ↓
StackBlockItem               RemoteStackBlockItem
  ↓                              ↓
IRuntimeBlock                RemoteDisplayRow
  ↓                              ↓
Memory subscriptions         WebSocket JSON
```

### Proposed State (Unified)
```
Workbench                     Chromecast
  ↓                              ↓
  ├───── StackBlockItem ─────────┤
  ↓                              ↓
LocalWorkoutDisplayModel    RemoteWorkoutDisplayModel
  ↓                              ↓
IRuntimeBlock                RemoteState JSON
```

## Migration Path (7 Phases)

| Phase | Scope | Impact | Risk |
|-------|-------|--------|------|
| 1 | Add interfaces | None — passive addition | Low |
| 2 | Migrate VisualStatePanel (Track) | Local refactor only | Low |
| 3 | Migrate TimerDisplay (Track) | Local refactor only | Low |
| 4 | Update DisplaySyncBridge | No Chromecast change | Low |
| 5 | Add RemoteWorkoutDisplayProvider | No UI change | Low |
| 6 | Migrate Chromecast components | **Full unification** | Medium |
| 7 | Cleanup & deprecate old hooks | Remove legacy code | Low |

Each phase is independently testable. Rollback is trivial at any point.

## Code Examples

### Before: Duplicated Components

**Track Panel:**
```typescript
const StackBlockItem: React.FC<{ block: IRuntimeBlock }> = ({ block }) => {
  const { elapsed } = useTimerElapsed(block.key.toString());
  const [fragments, setFragments] = useState<ICodeFragment[][]>([]);

  useEffect(() => {
    const locs = block.getFragmentMemoryByVisibility('display');
    setFragments(locs.map(loc => loc.fragments));
    return locs.map(loc => loc.subscribe(() => setFragments(...))).forEach(fn => fn());
  }, [block]);

  return <div>{block.label} {formatTime(elapsed)}</div>;
};
```

**Chromecast:**
```typescript
const RemoteStackBlockItem: React.FC<{ entry: RemoteDisplayRow; now: number }> = ({ entry, now }) => {
  const elapsed = calculateElapsedFromSpans(entry.timer?.spans, now);
  const fragments = entry.rows;

  return <div>{entry.label} {formatTime(elapsed)}</div>;
};
```

### After: Unified Component

```typescript
const StackBlockItem: React.FC<{ block: IBlockDisplayModel }> = ({ block }) => {
  // All data pre-computed by provider!
  return <div>{block.label} {formatTime(block.timer?.elapsed ?? 0)}</div>;
};

// Usage in both environments:
const RuntimeStackView: React.FC = () => {
  const { blocks } = useWorkoutDisplay(); // Works everywhere!
  return blocks.map(block => <StackBlockItem key={block.key} block={block} />);
};
```

## Validation Strategy

- **Unit Tests**: Display model providers with RuntimeTestBuilder harness
- **Integration Tests**: Existing component tests updated to use new provider
- **Storybook**: Manual validation checklist (timers, fragments, labels)
- **Chromecast E2E**: Full workout session with D-Pad controls

## Timeline

**Conservative Estimate:**
- Phase 1-3: 2 days (Track Panel only, low risk)
- Phase 4-5: 1 day (Bridge + provider setup)
- Phase 6: 2 days (Chromecast migration + testing)
- Phase 7: 1 day (Cleanup)

**Total: 6 days** with full test coverage and validation at each step.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chromecast rendering regression | Medium | High | Phase 5 deploys passive provider first; Phase 6 has full E2E test |
| Performance degradation (RAF overhead) | Low | Medium | Provider uses smart gating (same as current StackIntegratedTimer) |
| Type mismatches in serialization | Low | Medium | Display models designed for JSON round-trip; unit tests validate |
| Breaking existing Track Panel tests | Low | Low | Incremental migration preserves old hooks until Phase 7 |

## Success Criteria

✅ Track Panel visual parity maintained
✅ Chromecast visual parity maintained
✅ Zero test regressions
✅ `RemoteStackBlockItem` deleted
✅ `RemoteVisualStatePanel` deleted
✅ Storybook stories pass validation checklist
✅ Chromecast E2E test passes (full workout session)

## Next Actions

1. **Review**: Stakeholder review of [full proposal](./unified-ui-architecture-proposal.md)
2. **Approve**: Sign-off on Phase 1-7 migration plan
3. **Implement**: Begin Phase 1 (add interfaces)
4. **Validate**: Test after each phase before proceeding

---

**Questions?** See [full proposal](./unified-ui-architecture-proposal.md) or contact the WOD Wiki team.
