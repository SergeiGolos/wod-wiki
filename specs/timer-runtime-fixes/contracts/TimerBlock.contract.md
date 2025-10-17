# TimerBlock Enhancement Contract

**Class**: `TimerBlock extends RuntimeBlock`  
**Purpose**: Enable TimerBlock to wrap and coordinate with child blocks  
**Enhancement**: Add child management behaviors when children present  
**Status**: Enhancement (modify existing class)

---

## Constructor Enhancement

### Current Signature
```typescript
constructor(
  runtime: IScriptRuntime,
  sourceIds: number[],
  config: TimerBlockConfig
)
```

### Enhanced TimerBlockConfig

```typescript
export interface TimerBlockConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  children?: ICodeStatement[];  // NEW: Child statements to execute
}
```

---

## Behavior Composition

### Without Children (Existing Behavior - No Changes)

```typescript
// Current: Timer-only block
const behaviors = [
  new TimerBehavior(config.direction, config.durationMs),
  new CompletionBehavior(() => this.shouldComplete())
];
```

### With Children (New Behavior)

```typescript
// Enhanced: Timer wrapping children
const behaviors = [
  new TimerBehavior(config.direction, config.durationMs),
  new ChildAdvancementBehavior(config.children),
  new LazyCompilationBehavior(config.children),
  new CompletionBehavior(() => this.shouldCompleteWithChildren())
];
```

---

## Completion Logic Enhancement

### shouldCompleteWithChildren(): boolean

**Purpose**: Complete when timer expires OR children complete (whichever first)

**Logic**:
```typescript
private shouldCompleteWithChildren(): boolean {
  // Timer expired (countdown reached zero)
  const timerExpired = this.config.direction === 'down' && this.getRemainingMs() === 0;
  
  // Children all complete (no active child on stack)
  const childrenDone = this.runtime.stack.current === undefined;
  
  return timerExpired || childrenDone;
}
```

---

## Test Scenarios

### Timer Expires First
```typescript
it('should complete when countdown reaches zero', async () => {
  const runtime = createTestRuntime('20:00 For Time: 1000 Squats');
  
  // Fast-forward timer to 0:00
  advanceTime(runtime, 1200000);
  
  // Timer expires, workout should complete (even with work remaining)
  expect(runtime.stack.current).toBeUndefined();
  expect(runtime.events).toContainEqual({ name: 'timer:complete' });
});
```

### Children Complete First
```typescript
it('should complete when children finish', async () => {
  const runtime = createTestRuntime('20:00 For Time: 10 Squats');
  
  // Complete squats quickly (1 minute)
  runtime.handle({ name: 'next' });
  advanceTime(runtime, 60000);
  
  // Children done, workout should complete (timer stops at 19:00 remaining)
  expect(runtime.stack.current).toBeUndefined();
  expect(timerBlock.getRemainingMs()).toBeGreaterThan(0); // Time left on clock
});
```

### Auto-Push First Child
```typescript
it('should auto-push first child on mount', async () => {
  const runtime = createTestRuntime('20:00 For Time: Squats, Pullups');
  const timerBlock = runtime.stack.current;
  
  // Push timerBlock
  runtime.stack.push(timerBlock);
  const mountActions = timerBlock.mount(runtime);
  
  // Should auto-push first child (Squats)
  expect(mountActions).toHaveLength(1);
  expect(mountActions[0]).toBeInstanceOf(PushBlockAction);
  expect(mountActions[0].block.exercise).toBe('Squats');
});
```

---

## Backward Compatibility

**Impact**: None for existing usage

**Reasoning**: 
- `children` field is optional in config
- Existing TimerBlocks without children continue working unchanged
- Behavior composition is internal implementation detail

**Migration**: No migration needed

---

**Status**: ✅ READY FOR IMPLEMENTATION
