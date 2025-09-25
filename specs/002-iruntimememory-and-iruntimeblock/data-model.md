# Data Model: Memory-Behavior Contract

## Entities
- **BehaviorMemoryDescriptor**
  - id, behaviorName, type, visibility, initialValueFactory?, shared:boolean
- **BehaviorDependencyGraph**
  - blockKey, behaviorName, memoryRefs[]
- **RuntimeAllocationRecord**
  - referenceId, ownerBlockId, behaviorName, type, visibility, createdAt
- **BehaviorImplementation**
  - name, requiresMemory:boolean, constructorParams[], memoryDescriptors[]

## Relationships
- RuntimeBlock composes many BehaviorImplementation entries.
- Each BehaviorMemoryDescriptor belongs to exactly one behavior, may map to shared RuntimeAllocationRecord.
- BehaviorDependencyGraph aggregates allocations per block instance.

## Validation Rules
- If `requiresMemory` is true, `memoryDescriptors` MUST contain at least one descriptor.
- AllocationRecord ownerBlockId MUST match block key that created it.
- Shared allocations flagged by descriptors MUST be allocated once and reused.
- Constructor parameter list must include references for each descriptor.
