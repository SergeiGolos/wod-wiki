# Quickstart: Memory-Behavior Contract

1. **Review interfaces**
   - Open `src/runtime/IRuntimeMemory.ts`, `IRuntimeBlock.ts`, `IBehavior.ts`.

2. **Create descriptor**
   - Define a `BehaviorMemoryDescriptor` for a behavior needing state.

3. **Block wiring**
   - In a sample `RuntimeBlock` implementation, allocate memory via `runtime.memory.allocate` using the descriptor before constructing the behavior.

4. **Behavior usage**
   - Update behavior constructor to accept the memory reference and store it.

5. **Validate**
   - Run new Vitest specs ensuring construction fails when dependencies missing and passes when provided.
   - Confirm logs show allocation mapping.
