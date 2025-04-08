{{ ... }}
# Lap Feature Implementation Plan

## Overview

The Lap Feature will allow for different grouping behaviors in workout scripts. Currently, leaf nodes are identified by checking if `node.children.length == 0`. This approach doesn't support lap-based grouping where multiple exercises are considered part of a single timed section.

## Current Examples and Desired Behavior

### Example 1: Elements as a Single Unit (Lap)
```
(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```

In this example, the `+` symbols indicate a "LapFragment" and all three exercises should be treated as a single 60-second section, repeated 30 times.

### Example 2: Classic Round Structure
```
(3)
  400m Run
  21 KB Swings 53lb
  12 Pullups
```

In this case, there's no lap indicator, so we do 3 rounds where each exercise is executed in sequence.

## Required Changes

1. **Update the `StatementNode` Interface**
   
   Add an `isLeaf` property to the `StatementNode` interface in `timer.types.ts`:

   ```typescript
   export interface StatementNode {
     id: number;
     parent?: number;
     next?: number;
     rounds?: number;
     children: number[];
     meta: SourceCodeMetadata;
     fragments: StatementFragment[];
     isLeaf?: boolean; // New property to explicitly define a node as a leaf
   }
   ```

2. **Modify the Parser Visitor**

   Update `timer.visitor.ts` to set the `isLeaf` property based on the presence of `LapFragment`:

   ```typescript
   // Inside the wodBlock method in MdTimerInterpreter class
   wodBlock(ctx: any): StatementNode {
     let statement = { fragments: [] as StatementFragment[] } as StatementNode;
     ctx.lap && statement.fragments.push(...this.visit(ctx.lap));

     // ... existing code ...

     statement.meta = this.combineMeta(
       statement.fragments.map((fragment: any) => fragment.meta)
     );
     statement.id = statement.meta.startOffset;
    
     const rounds = fragmentTo<RoundsFragment>(statement, 'rounds')?.count ?? 0;
     statement.rounds = rounds;

     // Determine if this is a leaf node with lap fragments
     const lapFragments = statement.fragments.filter(f => f.type === 'lap');
     statement.isLeaf = lapFragments.length > 0;

     return statement;
   }
   ```

3. **Update the Runtime Logic**

   Modify `timer.runtime.ts` to use the new `isLeaf` property instead of checking for children length:

   ```typescript
   // Inside the gotoBlock method in TimerRuntime class
   gotoBlock(node: StatementNode | undefined): IRuntimeBlock {
     // ... existing code ...

     // if Leaf (use isLeaf explicitly or fall back to checking children)
     if (node.isLeaf === true || node.children.length == 0) {
       const leaf = this.script.goto(node.id);
       const compiledBlock = this.jit.compile(this.trace!, leaf);            
       this.onSetCursor(compiledBlock);
       return this.current = compiledBlock;
     }

     // ... existing code for handling non-leaf nodes ...
   }
   ```

4. **Update RuntimeJit Logic**

   Ensure that `RuntimeJit.compile()` method properly handles statements with both an `isLeaf` property and children. The compile method should group all child elements of a lap node into a single block instead of treating them individually.

## Technical Considerations

1. **Backward Compatibility**
   - Existing workouts without lap fragments will continue to work as before
   - The `isLeaf` property defaults to undefined, so the old check for `children.length == 0` works as a fallback

2. **Node Traversal Logic**
   - When a node is marked as a leaf but has children, those children should be treated as part of the same logical unit
   - The runtime should not navigate to the child nodes individually but process them together

3. **Compile-Time vs. Runtime Behavior**
   - The determination of "leafness" happens at compile time in the visitor
   - The runtime respects this property when navigating the workout

## Testing Scenarios

1. **Classic Round Structure**
   - Verify that workouts with rounds and no lap indicators still work as before
   - Example: `(3) 400m Run, 21 KB Swings 53lb, 12 Pullups`

2. **Lap Fragment Structure**
   - Verify that workouts with lap indicators treat the child elements as a single unit
   - Example: `(30) :60 EMOM, + 5 Pullups, + 10 Pushups, + 15 Air Squats`

3. **Mixed Structure**
   - Verify that workouts can contain both lap-based and classic sections
   - Example: 
     ```
     (3)
       400m Run
       (30) :60 EMOM
         + 5 Pullups
         + 10 Pushups
         + 15 Air Squats
     ```

## Implementation Order

1. Add the `isLeaf` property to the `StatementNode` interface
2. Update the `MdTimerInterpreter` to set `isLeaf` based on lap fragments
3. Modify `TimerRuntime.gotoBlock` to check for the `isLeaf` property
4. Update `RuntimeJit.compile` to handle lap fragments correctly
5. Add tests for the new functionality
6. Update documentation to explain lap fragments

## Code References

- StatementNode interface: `src/core/timer.types.ts`
- Parser visitor: `src/core/parser/timer.visitor.ts`
- Runtime execution: `src/core/runtime/timer.runtime.ts`
- JIT compilation: `src/core/runtime/RuntimeJit.ts`