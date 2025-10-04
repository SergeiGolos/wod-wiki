# API Contracts: Proper Script Advancement

**Feature**: 006-proper-advancement-of  
**Date**: 2025-10-04

This directory contains TypeScript interface contracts for the advancement feature.

## Contract Files

### Core Interfaces
- `IRuntimeBlock.contract.ts` - Runtime block interface with advancement methods
- `IAdvancementState.contract.ts` - Advancement state tracking interface
- `NextAction.contract.ts` - Action for signaling next block

### Validation Interfaces
- `IValidationRule.contract.ts` - Parse-time validation rule interface
- `IStackValidator.contract.ts` - Runtime stack validation interface

## Testing Strategy

Each contract file has a corresponding `.test.ts` file that:
1. Defines the expected interface shape
2. Creates test implementations
3. Verifies method contracts
4. Tests error conditions

## Usage

These contracts define the expected behavior BEFORE implementation. Tests should fail until the implementation is complete.

## Contract Test Execution

Run contract tests with:
```bash
npm run test:unit -- contracts
```

Expected initial state: **All tests failing** (no implementation yet)
