# Research: Runtime Memory-Behavior Responsibilities

## Clarifications Resolved
- **FR-017 Memory ownership**: Runtime blocks own allocations. Behaviors receive references but MUST NOT release them; blocks release in `pop`. Documented requirement.
- **FR-018 Concurrency**: Runtime operates single-threaded per execution; allocations scoped to runtime instance. No shared cross-run memory.
- **FR-019 Backwards compatibility**: Provide one minor release with deprecation warnings. Legacy behaviors must migrate before next major.

## Decisions
- Constructor requirements enforced via TypeScript interfaces/abstract base helpers.
- Introduce `BehaviorMemoryDescriptor` metadata to declare allocation needs.
- Blocks perform allocation during construction/setup and inject references.
- Diagnostics: extend runtime log to note allocation with behavior name and reference id.
- Provide helper for behaviors without memory requirements to express empty descriptor.

## Questions Deferred / Assumptions
- Memory pooling optimisations not in scope; follow-up if performance regressions observed.

## References
- Existing `RuntimeBlock` cleanup flow releases memory in `pop`—align new contract.
- Constitution v1.0.0: focus on determinism, observability, doc updates.
