---
title: "Runtime & JIT Documentation vs Implementation Drift Analysis"
date: 2025-08-11
tags: [analysis, documentation, runtime, jit, drift]
related: 
  - ../Core/Runtime/JitCompiler.md
  - ../Core/Runtime/FragmentCompilationManager.md
  - ../Core/Runtime/RuntimeJitStrategies.md
  - ../Core/IScriptRuntime.md
status: complete
---

# Runtime & JIT Documentation vs Implementation Drift Analysis

## Executive Summary

This analysis reveals significant drift between the documentation in `/Core` and the actual implementation. While the core architectural concepts remain aligned, there are substantial differences in interfaces, method signatures, and implementation details. The documentation appears to be more mature and comprehensive than the current implementation, suggesting either the docs were written as a design specification or the implementation has diverged during development.

## Critical Drift Areas

### 1. JitCompiler Interface Misalignment

#### Documentation States:
```typescript
// From Core/Runtime/JitCompiler.md
compile(statements: ICodeStatement[], stack: RuntimeStack): IRuntimeBlock | undefined
root(runtime: ITimerRuntime): IRuntimeBlock
registerStrategy(strategy: IRuntimeBlockStrategy): void
```

#### Implementation Has:
```typescript
// From src/runtime/JitCompiler.ts
compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined
root(runtime: ITimerRuntime): IRuntimeBlock  
// No registerStrategy method - strategies managed through constructor
```

**Key Differences:**
- Documentation expects `RuntimeStack` parameter, implementation uses `IScriptRuntime`
- No `registerStrategy` method in implementation
- Strategy management is done through constructor injection rather than registration pattern
- Missing implementations for `idle()` and `end()` methods (throw errors)

### 2. FragmentCompilationManager Context Mismatch

#### Documentation States:
```typescript
// From Core/Runtime/FragmentCompilationManager.md
interface FragmentCompilationContext {
    // Context properties to be defined
}
compileStatementFragments(statement: JitStatement, context: FragmentCompilationContext): RuntimeMetric
```

#### Implementation Has:
```typescript
// From src/runtime/FragmentCompilationManager.ts
compileStatementFragments(statement: ICodeStatement, context: IScriptRuntime): RuntimeMetric
```

**Key Differences:**
- Documentation uses `JitStatement`, implementation uses `ICodeStatement`
- Documentation suggests a specific `FragmentCompilationContext`, implementation uses `IScriptRuntime` directly
- Documentation's question #4 was answered differently than implemented

### 3. RuntimeJitStrategies API Divergence

#### Documentation States:
```typescript
// From Core/Runtime/RuntimeJitStrategies.md
interface IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], statements: JitStatement[]): IRuntimeBlock | undefined;
}
```

#### Implementation Has:
```typescript
// From src/runtime/IRuntimeBlockStrategy.ts (inferred)
interface IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined;
}
```

**Key Differences:**
- Documentation passes `JitStatement[]`, implementation passes `IScriptRuntime`
- Implementation includes extensive logging, not mentioned in documentation
- The `RuntimeJitStrategies` class in `JitCompiler.ts` has a different method signature than standalone file

### 4. IScriptRuntime Interface Discrepancy

#### Documentation States:
```typescript
// From Core/IScriptRuntime.md
Properties:
- script: RuntimeScript
- stack: RuntimeStack  
- jit: RuntimeJit

Methods:
- apply(actions: IRuntimeAction[], source: IRuntimeBlock): void
```

#### Implementation Has:
```typescript
// From src/runtime/IScriptRuntime.ts (interface) and ScriptRuntime.ts (implementation)
Properties:
- script: WodScript (not RuntimeScript)
- stack: RuntimeStack
- jit: JitCompiler (not RuntimeJit)

Methods:
- handle(event: IRuntimeEvent): void
- tick(): IRuntimeEvent[]
// No apply method
```

**Key Differences:**
- Different script type (`WodScript` vs `RuntimeScript`)
- Different JIT type (`JitCompiler` vs `RuntimeJit`)
- Completely different method set (`handle/tick` vs `apply`)
- Documentation mentions `TimedScriptRuntime` and `VirtualScriptRuntime` implementations that don't exist

### 5. Event Handling Architecture Divergence

#### Documentation Implies:
- Event handlers are registered with the JIT compiler
- System-level handlers managed separately
- `handleEvent` method on `IRuntimeBlock` takes system handlers as parameter

#### Implementation Shows:
- Event handlers are attached to individual blocks
- No system-level handler registration on JIT
- Event handling cascades through the stack
- Extensive logging throughout event handling pipeline

### 6. Missing Documentation for Implemented Features

The implementation includes several features not documented:
- `EventHandler` array property on JitCompiler (in docs but not implemented)
- Detailed logging system throughout runtime
- `isCompiling` flag on JitCompiler
- Action queueing and execution system in ScriptRuntime
- Handler response pattern with `handled` and `shouldContinue` flags

### 7. Type System Inconsistencies

#### Documentation Uses:
- `JitStatement`
- `RuntimeScript`
- `ITimerRuntime`
- `RuntimeJit`
- `FragmentCompilationContext`

#### Implementation Uses:
- `ICodeStatement`
- `WodScript`
- `IScriptRuntime`
- `JitCompiler`
- Direct `IScriptRuntime` as context

## Root Cause Analysis

### 1. **Evolution Without Documentation Updates**
The implementation appears to have evolved beyond the original design without corresponding documentation updates. Key architectural decisions (like using `IScriptRuntime` as the universal context) were made but not reflected in docs.

### 2. **Interface Renaming**
Multiple interfaces were renamed during implementation:
- `JitStatement` → `ICodeStatement`
- `RuntimeScript` → `WodScript`
- `RuntimeJit` → `JitCompiler`
- `ITimerRuntime` → `IScriptRuntime`

### 3. **Simplified Context Pattern**
The documentation suggests specialized context objects (`FragmentCompilationContext`), but the implementation simplified this to pass `IScriptRuntime` everywhere, providing access to all runtime state.

### 4. **Different Architectural Decisions**
- Documentation: Strategy registration pattern
- Implementation: Constructor injection pattern
- Documentation: Separate system handlers
- Implementation: Unified handler chain through stack

## Impact Assessment

### High Impact Issues:
1. **Breaking API Changes**: Method signatures don't match between docs and implementation
2. **Missing Core Functionality**: `idle()` and `end()` methods throw errors
3. **Type Mismatches**: Would prevent code written against documentation from working

### Medium Impact Issues:
1. **Conceptual Confusion**: Different naming for same concepts
2. **Missing Features**: No strategy registration as documented
3. **Behavioral Differences**: Event handling works differently than documented

### Low Impact Issues:
1. **Missing Documentation**: Logging and debugging features not documented
2. **Implementation Details**: Internal workings differ but external behavior similar

## Recommendations

### Immediate Actions:
1. **Decide on Authoritative Source**: Is documentation the spec or implementation the reality?
2. **Align Critical Interfaces**: Fix method signatures to match across docs and code
3. **Implement Missing Methods**: Complete `idle()` and `end()` in JitCompiler
4. **Update Type Names**: Consistently use either documented or implemented names

### Short-term Actions:
1. **Document Implementation Decisions**: Explain why certain patterns were chosen
2. **Create Migration Guide**: If breaking changes are kept, document how to migrate
3. **Add Missing Documentation**: Document logging, action system, and other implemented features

### Long-term Actions:
1. **Establish Documentation Process**: Ensure docs are updated with code changes
2. **Version Documentation**: Tag documentation versions to match code versions
3. **Automated Drift Detection**: Consider tools to detect documentation drift

## Alignment Opportunities

### Areas of Strong Alignment:
1. **Core Architecture**: Block-based execution model is consistent
2. **Stack Management**: RuntimeStack works as documented
3. **Metric System**: RuntimeMetric structure matches documentation
4. **Compilation Pipeline**: Overall flow matches even if details differ

### Easy Wins:
1. **Type Renaming**: Simple find/replace to align type names
2. **Method Signatures**: Add overloads to support both patterns
3. **Documentation Updates**: Update parameter types in docs to match implementation

## Conclusion

The drift between documentation and implementation is significant but manageable. The core architecture remains sound, but the details have diverged considerably. The documentation appears to represent an earlier or idealized version of the system, while the implementation has evolved to meet practical needs.

The most critical decision is whether to:
1. **Update documentation to match implementation** (easier, preserves current functionality)
2. **Update implementation to match documentation** (harder, may break existing code)
3. **Create a new version** that incorporates the best of both approaches

Given that the implementation includes valuable features like comprehensive logging and a working event system, option 1 (updating documentation) appears most practical, with selective implementation updates for critical missing features like the `idle()` and `end()` methods.
