# TimeBoundRoundsStrategy Contract

**Interface**: `IRuntimeBlockStrategy`  
**Purpose**: Compile AMRAP workouts combining timer + rounds + children  
**Pattern**: `Timer + Rounds + Action="AMRAP"`  
**Status**: New Implementation

---

## Interface Implementation

### match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean

**Purpose**: Identify AMRAP workout patterns

**Logic**:
```typescript
const stmt = statements[0];
const hasTimer = stmt.fragments.some(f => f.type === FragmentType.Timer);
const hasRounds = stmt.fragments.some(f => f.type === FragmentType.Rounds);
const hasAMRAP = stmt.fragments.some(f => 
  f.type === FragmentType.Action && f.value === 'AMRAP'
);
return hasTimer && hasRounds && hasAMRAP;
```

**Returns**: `true` if all three fragments present, `false` otherwise

---

### compile(statements: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock

**Purpose**: Create TimerBlock(RoundsBlock(children)) composite structure

**Steps**:
1. Extract timer duration from Timer fragment
2. Extract rep scheme from Rounds fragment
3. Extract children from statement.children
4. Create RoundsBlock with LoopCoordinatorBehavior('timed-rounds')
5. Create TimerBlock with TimerBlockConfig({ direction: 'down', durationMs, children: [roundsBlock] })
6. Return TimerBlock

**Returns**: `IRuntimeBlock` (TimerBlock wrapping RoundsBlock)

---

## Test Scenarios

### Should Match AMRAP Pattern
```typescript
it('should match timer + rounds + AMRAP pattern', () => {
  const stmt = parseWorkout('(21-15-9) 20:00 AMRAP Thrusters, Pullups');
  const strategy = new TimeBoundRoundsStrategy();
  expect(strategy.match([stmt], runtime)).toBe(true);
});
```

### Should NOT Match Other Patterns
```typescript
it('should not match timer-only pattern', () => {
  const stmt = parseWorkout('20:00 For Time: 100 Squats');
  expect(strategy.match([stmt], runtime)).toBe(false);
});
```

### Should Compile Composite Structure
```typescript
it('should create TimerBlock wrapping RoundsBlock', () => {
  const stmt = parseWorkout('(21-15-9) 20:00 AMRAP Thrusters, Pullups');
  const block = strategy.compile([stmt], runtime);
  
  expect(block.blockType).toBe('Timer');
  expect(block.config.direction).toBe('down');
  expect(block.config.durationMs).toBe(1200000); // 20 minutes
  expect(block.config.children).toHaveLength(1);
  expect(block.config.children[0].blockType).toBe('Rounds');
});
```

---

**Status**: ✅ READY FOR IMPLEMENTATION
